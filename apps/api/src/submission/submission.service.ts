import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, InvitationStatus, Prisma, SubmissionStatus, TeamStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/auth-user';
import { canManageContest } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export const DEFAULT_DOCS: { type: DocumentType; title: string; description: string }[] = [
  { type: DocumentType.ROSTER, title: '팀 명단', description: '팀 정보로 자동 작성' },
  { type: DocumentType.ENROLLMENT, title: '재학 확인', description: '학교 인증으로 대체' },
  { type: DocumentType.CONSENT, title: '개인정보 수집·이용 동의서', description: '팀원 전원 서명' },
];
const AUTO_DOCS: DocumentType[] = [DocumentType.ROSTER, DocumentType.ENROLLMENT, DocumentType.APPLICATION_FORM];
const EDITABLE: SubmissionStatus[] = [SubmissionStatus.PREPARING, SubmissionStatus.REJECTED];

/** multer(busboy) latin1 파일명 → utf8 보정 */
function decodeFileName(name: string) {
  if ([...name].some((c) => c.charCodeAt(0) > 255)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

export const submissionInclude = {
  contest: { select: { id: true, title: true, submitTo: true, schoolId: true, createdById: true } },
  team: {
    include: {
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          role: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              major: true,
              admissionYear: true,
              schoolEmail: true,
              schoolVerifiedAt: true,
              school: { select: { name: true, shortName: true } },
            },
          },
        },
      },
    },
  },
  documents: { orderBy: { order: 'asc' } },
  signatures: true,
  reviewer: { select: { id: true, name: true } },
} satisfies Prisma.SubmissionInclude;

export type SubmissionRow = Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>;

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly chatService: ChatService,
  ) {}

  /** 팀 확정 → 제출 서류 준비 (T-04) */
  async confirm(user: AuthUser, teamId: number) {
    const t = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { contest: { include: { requiredDocuments: { orderBy: { order: 'asc' } } } }, members: true },
    });
    if (!t) throw new NotFoundException();
    if (t.leaderId !== user.id) throw new ForbiddenException('팀장만 확정할 수 있어요');
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('이미 확정된 팀');
    if (t.members.length < t.contest.minTeamSize) throw new BadRequestException(`최소 ${t.contest.minTeamSize}명이 필요해요`);
    if (t.members.length > t.contest.maxTeamSize) throw new BadRequestException(`최대 ${t.contest.maxTeamSize}명까지`);

    const docs = t.contest.requiredDocuments.length
      ? t.contest.requiredDocuments.map((d) => ({ requiredDocumentId: d.id, type: d.type, title: d.title, description: d.description, order: d.order }))
      : DEFAULT_DOCS.map((d, order) => ({ ...d, order }));

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: teamId }, data: { status: TeamStatus.CONFIRMED, confirmedAt: new Date() } });
      await tx.invitation.updateMany({
        where: { teamId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.CANCELED, respondedAt: new Date() },
      });
      const s = await tx.submission.create({ data: { teamId, contestId: t.contestId, documents: { create: docs } } });
      await this.refreshDocs(tx, s.id);
    });
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

    const path = await this.storage.save(file.buffer, file.originalname);
    const fileName = decodeFileName(file.originalname);
    await this.prisma.$transaction(async (tx) => {
      await tx.submissionDocument.update({ where: { id: docId }, data: { filePath: path, fileName, fileSize: file.size } });
      await this.refreshDocs(tx, s.id);
    });
    await this.storage.remove(doc.filePath);
    this.chatService.notifyTeam(teamId, { documentId: docId });
    return this.get(user, teamId);
  }

  async download(user: AuthUser, teamId: number, docId: number) {
    const s = await this.load(teamId);
    this.assertCanRead(user, s);
    const doc = s.documents.find((d) => d.id === docId);
    if (!doc?.filePath) throw new NotFoundException();
    return { path: this.storage.absolute(doc.filePath), fileName: doc.fileName ?? 'file.pdf' };
  }

  /** 개인정보 동의서 서명 */
  async sign(user: AuthUser, teamId: number) {
    const s = await this.loadEditable(user, teamId, false);
    await this.prisma.$transaction(async (tx) => {
      await tx.submissionSignature.createMany({ data: [{ submissionId: s.id, userId: user.id }], skipDuplicates: true });
      await this.refreshDocs(tx, s.id);
    });
    this.chatService.notifyTeam(teamId, { signed: user.id });
    return this.get(user, teamId);
  }

  /** T-05 → T-06 제출 */
  async submit(user: AuthUser, teamId: number) {
    const s = await this.loadEditable(user, teamId, true);
    const pending = s.documents.filter((d) => d.status !== DocumentStatus.READY).length;
    if (pending) throw new BadRequestException(`서류 ${pending}개를 채우면 제출할 수 있어요`);
    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: s.id },
        data: { status: SubmissionStatus.SUBMITTED, submittedAt: new Date(), reviewedAt: null, reviewNote: null, reviewerId: null },
      }),
      this.prisma.team.update({ where: { id: teamId }, data: { status: TeamStatus.SUBMITTED } }),
    ]);
    await this.chatService.system(teamId, `${s.contest.submitTo}로 서류를 제출했어요`);
    this.chatService.notifyTeam(teamId, { status: TeamStatus.SUBMITTED });
    return this.get(user, teamId);
  }

  /** 자동 서류 상태 재계산 */
  async refreshDocs(tx: Prisma.TransactionClient, submissionId: number) {
    const s = await tx.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        documents: true,
        signatures: true,
        team: { include: { members: { include: { user: { select: { schoolVerifiedAt: true } } } } } },
      },
    });
    const members = s.team.members;
    const signed = new Set(s.signatures.map((x) => x.userId));
    for (const d of s.documents) {
      let ready = false;
      if (d.type === DocumentType.ROSTER || d.type === DocumentType.APPLICATION_FORM) ready = true;
      else if (d.type === DocumentType.ENROLLMENT) ready = members.every((m) => !!m.user.schoolVerifiedAt);
      else if (d.type === DocumentType.CONSENT) ready = members.every((m) => signed.has(m.userId));
      else if (d.type === DocumentType.FILE) ready = !!d.filePath;
      const status = ready ? DocumentStatus.READY : DocumentStatus.PENDING;
      if (status !== d.status) await tx.submissionDocument.update({ where: { id: d.id }, data: { status } });
    }
  }

  async load(teamId: number): Promise<SubmissionRow> {
    const s = await this.prisma.submission.findUnique({ where: { teamId }, include: submissionInclude });
    if (!s) throw new NotFoundException('아직 확정되지 않은 팀');
    return s;
  }

  private async loadEditable(user: AuthUser, teamId: number, leaderOnly: boolean) {
    const s = await this.load(teamId);
    const me = s.team.members.find((m) => m.userId === user.id);
    if (!me) throw new ForbiddenException();
    if (leaderOnly && s.team.leaderId !== user.id) throw new ForbiddenException('팀장만 할 수 있어요');
    if (!EDITABLE.includes(s.status)) throw new BadRequestException('이미 제출된 서류');
    return s;
  }

  private assertCanRead(user: AuthUser, s: SubmissionRow) {
    if (s.team.members.some((m) => m.userId === user.id)) return;
    if (canManageContest(user, s.contest)) return;
    throw new ForbiddenException();
  }

  /** 팀/운영자 공용 뷰 */
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
      ...(admin ? { schoolName: m.user.school?.name ?? null, schoolEmail: m.user.schoolEmail } : {}),
    }));
    const ready = s.documents.filter((d) => d.status === DocumentStatus.READY).length;
    return {
      id: s.id,
      teamId: s.teamId,
      teamName: s.team.name,
      status: s.status,
      contest: { id: s.contest.id, title: s.contest.title, submitTo: s.contest.submitTo },
      members,
      documents: s.documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        description: d.description,
        status: d.status,
        auto: AUTO_DOCS.includes(d.type),
        fileName: d.fileName,
        fileSize: d.fileSize,
        signedCount: d.type === DocumentType.CONSENT ? members.filter((m) => m.signed).length : undefined,
      })),
      readyCount: ready,
      totalCount: s.documents.length,
      canSubmit: ready === s.documents.length && EDITABLE.includes(s.status),
      mySigned: viewerId ? signed.has(viewerId) : undefined,
      reviewNote: s.reviewNote,
      reviewer: admin ? s.reviewer : undefined,
      timeline: [
        { step: 'RECEIVED', label: '크루핏 접수', at: s.submittedAt, done: !!s.submittedAt },
        {
          step: 'SCHOOL_REVIEW',
          label: `${s.contest.submitTo} 확인`,
          at: s.reviewedAt,
          done: s.status === SubmissionStatus.APPROVED || s.status === SubmissionStatus.FORWARDED,
          rejected: s.status === SubmissionStatus.REJECTED,
        },
        { step: 'FORWARDED', label: '주최·운영사 전달', at: s.forwardedAt, done: !!s.forwardedAt },
      ],
    };
  }
}
