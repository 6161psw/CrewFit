import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, SubmissionStatus, TeamStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/types/auth-user.type';
import { REVISION_REASON_LABEL } from '../common/utils/labels';
import { canManageContest } from '../common/utils/scope.util';
import { StorageService } from '../storage/storage.service';
import { SubmissionRepository, SubmissionRow } from './submission.repository';

export const DEFAULT_DOCS: { type: DocumentType; title: string; description: string }[] = [
  { type: DocumentType.ROSTER, title: '팀 명단', description: '팀 정보로 자동 작성' },
  { type: DocumentType.ENROLLMENT, title: '재학 확인', description: '학교 인증으로 대체' },
  { type: DocumentType.CONSENT, title: '개인정보 수집·이용 동의서', description: '팀원 전원 서명' },
];
export const AUTO_DOCS: DocumentType[] = [DocumentType.ROSTER, DocumentType.ENROLLMENT, DocumentType.APPLICATION_FORM];
/** 팀이 서류를 고칠 수 있는 상태 */
export const EDITABLE: SubmissionStatus[] = [SubmissionStatus.PREPARING, SubmissionStatus.REVISION_REQUESTED];

/** multer(busboy) latin1 파일명 → utf8 보정 */
function decodeFileName(name: string) {
  if ([...name].some((c) => c.charCodeAt(0) > 255)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly storage: StorageService,
    private readonly chatService: ChatService,
  ) {}

  /** 팀 확정 → 제출 서류 준비 (T-04) */
  async confirm(user: AuthUser, teamId: number) {
    const t = await this.submissionRepository.findTeamForConfirm(teamId);
    if (!t) throw new NotFoundException();
    if (t.leaderId !== user.id) throw new ForbiddenException('팀장만 확정할 수 있어요');
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('이미 확정된 팀');
    if (t.members.length < t.contest.minTeamSize) throw new BadRequestException(`최소 ${t.contest.minTeamSize}명이 필요해요`);
    if (t.members.length > t.contest.maxTeamSize) throw new BadRequestException(`최대 ${t.contest.maxTeamSize}명까지`);

    const docs = t.contest.requiredDocuments.length
      ? t.contest.requiredDocuments.map((d) => ({ requiredDocumentId: d.id, type: d.type, title: d.title, description: d.description, order: d.order }))
      : DEFAULT_DOCS.map((d, order) => ({ ...d, order }));
    await this.submissionRepository.confirm(teamId, t.contestId, user.id, docs);
    await this.chatService.system(teamId, '팀이 확정됐어요! 제출 서류를 함께 준비해요');
    this.chatService.notifyTeam(teamId, { status: TeamStatus.CONFIRMED });
    return this.get(user, teamId);
  }

  async get(user: AuthUser, teamId: number) {
    const s = await this.load(teamId);
    this.assertCanRead(user, s);
    return this.view(s, user.id);
  }

  async uploadFile(user: AuthUser, teamId: number, docId: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일 없음');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new BadRequestException('PDF 만 올릴 수 있어요');
    if (file.size > this.storage.maxBytes) throw new BadRequestException(`${this.storage.maxBytes / 1024 / 1024}MB 이하`);
    const s = await this.loadEditable(user, teamId, true);
    const doc = s.documents.find((d) => d.id === docId);
    if (!doc || doc.type !== DocumentType.FILE) throw new NotFoundException('업로드 서류 아님');

    const filePath = await this.storage.save(file.buffer, file.originalname);
    await this.submissionRepository.setFile(s.id, docId, { filePath, fileName: decodeFileName(file.originalname), fileSize: file.size }, user.id, doc.title);
    await this.storage.remove(doc.filePath);
    this.chatService.notifyTeam(teamId, { documentId: docId });
    return this.get(user, teamId);
  }

  async download(user: AuthUser, teamId: number, docId: number) {
    const s = await this.load(teamId);
    this.assertCanRead(user, s);
    return this.fileOf(s, docId);
  }

  fileOf(s: SubmissionRow, docId: number) {
    const doc = s.documents.find((d) => d.id === docId);
    if (!doc?.filePath) throw new NotFoundException();
    return { path: this.storage.absolute(doc.filePath), fileName: doc.fileName ?? 'file.pdf' };
  }

  /** 개인정보 동의서 서명 */
  async sign(user: AuthUser, teamId: number) {
    const s = await this.loadEditable(user, teamId, false);
    await this.submissionRepository.sign(s.id, user.id);
    this.chatService.notifyTeam(teamId, { signed: user.id });
    return this.get(user, teamId);
  }

  /** T-05 → T-06 제출 (보완 요청 후 재제출 포함) */
  async submit(user: AuthUser, teamId: number) {
    const s = await this.loadEditable(user, teamId, true);
    const pending = s.documents.filter((d) => d.status !== DocumentStatus.READY).length;
    if (pending) throw new BadRequestException(`서류 ${pending}개를 채우면 제출할 수 있어요`);
    await this.submissionRepository.submit(s.id, teamId, user.id, s.documents.length);
    await this.chatService.system(teamId, `${s.contest.submitTo}로 서류를 제출했어요`);
    this.chatService.notifyTeam(teamId, { status: TeamStatus.SUBMITTED });
    return this.get(user, teamId);
  }

  async load(teamId: number): Promise<SubmissionRow> {
    const s = await this.submissionRepository.findByTeam(teamId);
    if (!s) throw new NotFoundException('아직 확정되지 않은 팀');
    return s;
  }

  private async loadEditable(user: AuthUser, teamId: number, leaderOnly: boolean) {
    const s = await this.load(teamId);
    if (!s.team.members.some((m) => m.userId === user.id)) throw new ForbiddenException();
    if (leaderOnly && s.team.leaderId !== user.id) throw new ForbiddenException('팀장만 할 수 있어요');
    if (!EDITABLE.includes(s.status)) throw new BadRequestException('이미 제출된 서류');
    return s;
  }

  private assertCanRead(user: AuthUser, s: SubmissionRow) {
    if (s.team.members.some((m) => m.userId === user.id)) return;
    if (canManageContest(user, s.contest)) return;
    throw new ForbiddenException();
  }

  /** 팀(T-04~06) / 운영자(W-04) 공용 뷰 */
  view(s: SubmissionRow, viewerId?: string, admin = false) {
    const signed = new Set(s.signatures.map((x) => x.userId));
    const members = s.team.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role?.name ?? null,
      isLeader: m.isLeader,
      school: m.user.school?.shortName ?? null,
      major: m.user.major,
      admissionYear: m.user.admissionYear,
      schoolVerified: !!m.user.schoolVerifiedAt,
      signed: signed.has(m.user.id),
      firstTime: m.user._count.memberships === 0,
      ...(admin ? { schoolName: m.user.school?.name ?? null, contact: m.user.schoolEmail ?? m.user.email } : {}),
    }));
    const ready = s.documents.filter((d) => d.status === DocumentStatus.READY).length;
    return {
      id: s.id,
      teamId: s.teamId,
      teamName: s.team.name,
      leader: s.team.leader,
      status: s.status,
      contest: { id: s.contest.id, title: s.contest.title, submitTo: s.contest.submitTo },
      members,
      allSchoolVerified: members.every((m) => m.schoolVerified),
      documents: s.documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        description: d.description,
        status: d.status,
        auto: AUTO_DOCS.includes(d.type),
        fileName: d.fileName,
        fileSize: d.fileSize,
        revisionRequested: d.revisionRequested,
        signedCount: d.type === DocumentType.CONSENT ? members.filter((m) => m.signed).length : undefined,
      })),
      readyCount: ready,
      totalCount: s.documents.length,
      canSubmit: ready === s.documents.length && EDITABLE.includes(s.status),
      mySigned: viewerId ? signed.has(viewerId) : undefined,
      submittedAt: s.submittedAt,
      revision:
        s.status === SubmissionStatus.REVISION_REQUESTED
          ? {
              reasons: s.revisionReasons.map((r) => ({ code: r, label: REVISION_REASON_LABEL[r] })),
              message: s.revisionMessage,
              deadline: s.revisionDeadline,
            }
          : null,
      reviewer: admin ? s.reviewer : undefined,
      timeline: [
        { step: 'RECEIVED', label: '크루핏 접수', at: s.submittedAt, done: !!s.submittedAt },
        {
          step: 'SCHOOL_REVIEW',
          label: `${s.contest.submitTo} 확인`,
          at: s.reviewedAt,
          done: s.status === SubmissionStatus.APPROVED || s.status === SubmissionStatus.FORWARDED,
          revision: s.status === SubmissionStatus.REVISION_REQUESTED,
        },
        { step: 'FORWARDED', label: '주최·운영사 전달', at: s.forwardedAt, done: !!s.forwardedAt },
      ],
      logs: admin
        ? [
            { type: 'TEAM_CREATED', message: `모집 채팅방 개설 (팀장 ${s.team.leader.name})`, at: s.team.createdAt },
            ...s.logs.map((l) => ({ type: l.type, message: l.message, at: l.createdAt })),
          ]
        : undefined,
    };
  }
}
