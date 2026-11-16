import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestStatus, DocumentStatus, DocumentType, Prisma, SubmissionStatus } from '@prisma/client';
import { BadgeService } from '../badge/badge.service';
import { ChatService } from '../chat/chat.service';
import { toSkip } from '../common/dto/pagination.dto';
import { AuthUser } from '../common/types/auth-user.type';
import { toCsv } from '../common/utils/csv.util';
import { startOfToday } from '../common/utils/date.util';
import { REVISION_REASON_LABEL, SUBMISSION_STATUS_LABEL } from '../common/utils/labels';
import { adminContestWhere, canManageContest } from '../common/utils/scope.util';
import { SubmissionService } from '../submission/submission.service';
import { AdminAccessService } from './admin-access.service';
import { AdminRepository, AdminSubmissionRow } from './admin.repository';
import { AdminTeamQuery } from './dto/req/admin-team-query.dto';
import { DocumentArchiveQuery } from './dto/req/document-archive-query.dto';
import { RevisionRequestDto } from './dto/req/revision-request.dto';
import { TeamOutcomeDto } from './dto/req/team-outcome.dto';

const LISTED: SubmissionStatus[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED,
  SubmissionStatus.FORWARDED,
];
const COMPLETABLE: SubmissionStatus[] = [SubmissionStatus.APPROVED, SubmissionStatus.FORWARDED];
const REVISABLE_DOCS: DocumentType[] = [DocumentType.FILE, DocumentType.CONSENT];

/** 서류 상태 라벨: "5/5 완료" / "동의서 대기" / "요약서 없음" */
function docsLabel(docs: AdminSubmissionRow['documents']) {
  const ready = docs.filter((d) => d.status === DocumentStatus.READY).length;
  if (ready === docs.length) return `${ready}/${docs.length} 완료`;
  const first = docs.find((d) => d.status !== DocumentStatus.READY)!;
  if (first.type === DocumentType.CONSENT) return '동의서 대기';
  if (first.type === DocumentType.FILE) return `${first.title.split(' ')[0]} 없음`;
  return `${first.title} 대기`;
}

export function toTeamRow(s: AdminSubmissionRow) {
  const leader = s.team.members.find((m) => m.isLeader)?.user;
  const ready = s.documents.filter((d) => d.status === DocumentStatus.READY).length;
  return {
    submissionId: s.id,
    teamId: s.team.id,
    teamName: s.team.name,
    leader: leader ? { name: leader.name, major: leader.major, admissionYear: leader.admissionYear } : null,
    memberCount: s.team.members.length,
    majors: [...new Set(s.team.members.map((m) => m.user.major).filter((m): m is string => !!m))],
    docs: { ready, total: s.documents.length, complete: ready === s.documents.length, label: docsLabel(s.documents) },
    submittedAt: s.submittedAt,
    status: s.status,
    statusLabel: SUBMISSION_STATUS_LABEL[s.status],
    award: s.team.award,
  };
}

@Injectable()
export class AdminTeamService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly access: AdminAccessService,
    private readonly submissionService: SubmissionService,
    private readonly chatService: ChatService,
    private readonly badgeService: BadgeService,
  ) {}

  /** W-03 대회별 지원 팀 목록 */
  async listByContest(user: AuthUser, contestId: number, q: AdminTeamQuery) {
    const c = await this.access.contest(user, contestId);
    const all = await this.adminRepository.findSubmissionsByContest(contestId, LISTED);
    const counts = Object.fromEntries(LISTED.map((st) => [st, all.filter((s) => s.status === st).length]));
    const kw = q.q?.trim().toLowerCase();
    let rows = all.filter(
      (s) =>
        (!q.status || s.status === q.status) &&
        (!kw || s.team.name.toLowerCase().includes(kw) || s.team.members.some((m) => m.user.name.toLowerCase().includes(kw))) &&
        (!q.major || s.team.members.some((m) => m.user.major === q.major)) &&
        (!q.size || s.team.members.length === q.size),
    );
    if (q.docStatus) {
      const want = q.docStatus === 'complete';
      rows = rows.filter((s) => s.documents.every((d) => d.status === DocumentStatus.READY) === want);
    }
    const time = (s: AdminSubmissionRow) => s.submittedAt?.getTime() ?? 0;
    rows.sort((a, b) => (q.sort === 'name' ? a.team.name.localeCompare(b.team.name) : q.sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)));
    return {
      contest: {
        id: c.id,
        title: c.title,
        open: c.status === ContestStatus.PUBLISHED && c.deadline >= startOfToday(),
        deadline: c.deadline,
        documentTypeCount: all[0]?.documents.length ?? null,
      },
      counts: { all: all.length, ...counts },
      majors: [...new Set(all.flatMap((s) => s.team.members.map((m) => m.user.major)).filter((m): m is string => !!m))].sort(),
      items: rows.slice(toSkip(q), toSkip(q) + q.limit).map(toTeamRow),
      total: rows.length,
      page: q.page,
      limit: q.limit,
    };
  }

  /** W-04 팀 상세 (서류 확인) */
  async detail(user: AuthUser, id: number) {
    const s = await this.access.submission(user, id);
    return this.submissionService.view(s, undefined, true);
  }

  async file(user: AuthUser, id: number, docId: number) {
    const s = await this.access.submission(user, id);
    return this.submissionService.fileOf(s, docId);
  }

  /** 승인하기 */
  async approve(user: AuthUser, id: number) {
    const s = await this.access.submission(user, id);
    if (s.status !== SubmissionStatus.SUBMITTED) throw new BadRequestException('검토 대기 상태만 승인할 수 있어요');
    await this.adminRepository.approve(id, s.teamId, user.id);
    await this.chatService.system(s.teamId, `${s.contest.submitTo}: 학교 확인이 끝났어요`);
    this.chatService.notifyTeam(s.teamId, { submissionStatus: SubmissionStatus.APPROVED });
    return this.detail(user, id);
  }

  /** W-05 보완 요청 → 팀 채팅방 + 앱 알림 */
  async requestRevision(user: AuthUser, id: number, dto: RevisionRequestDto) {
    const s = await this.access.submission(user, id);
    if (s.status !== SubmissionStatus.SUBMITTED && s.status !== SubmissionStatus.APPROVED) {
      throw new BadRequestException('검토 대기/승인 상태만 보완 요청할 수 있어요');
    }
    const docs = s.documents.filter((d) => dto.documentIds.includes(d.id));
    if (docs.length !== dto.documentIds.length) throw new NotFoundException('서류 없음');
    if (docs.some((d) => !REVISABLE_DOCS.includes(d.type))) throw new BadRequestException('자동 작성 서류는 보완 요청 대상이 아니에요');
    const reasons = dto.reasons.map((r) => REVISION_REASON_LABEL[r]).join(', ');
    await this.adminRepository.requestRevision(s, {
      documentIds: docs.map((d) => d.id),
      consentDocIds: docs.filter((d) => d.type === DocumentType.CONSENT).map((d) => d.id),
      reasons: dto.reasons,
      message: dto.message,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      actorId: user.id,
      logMessage: `보완 요청 (${reasons}): ${docs.map((d) => d.title).join(', ')}`,
    });
    await this.chatService.system(s.teamId, `${s.contest.submitTo} 보완 요청 · ${docs.map((d) => d.title).join(', ')}\n${dto.message}`);
    this.chatService.notifyTeam(s.teamId, { submissionStatus: SubmissionStatus.REVISION_REQUESTED });
    return this.detail(user, id);
  }

  /** 대회 종료 후 완주·수상 처리 → 배지 자동 지급 */
  async setOutcome(user: AuthUser, teamId: number, dto: TeamOutcomeDto) {
    const t = await this.adminRepository.findTeamForOutcome(teamId);
    if (!t || !canManageContest(user, t.contest)) throw new NotFoundException();
    if (!t.submission || !COMPLETABLE.includes(t.submission.status)) throw new BadRequestException('승인된 팀만 완주 처리할 수 있어요');
    await this.adminRepository.setOutcome(
      teamId,
      t.members.map((m) => m.userId),
      new Set(dto.completedUserIds),
      dto.award ?? null,
      (tx, userId) => this.badgeService.evaluate(tx, userId, teamId),
    );
    await this.chatService.system(teamId, `대회 완주! ${dto.award ? `🏆 ${dto.award} · ` : ''}완주 배지가 프로필에 반영됐어요`);
    return { ok: true };
  }

  /** 엑셀로 내보내기 (학교 양식, 전체 항목) */
  async exportCsv(user: AuthUser, contestId: number) {
    const c = await this.access.contest(user, contestId);
    const subs = await this.adminRepository.findSubmissionsByContest(contestId, LISTED);
    const rows = subs.flatMap((s) =>
      s.team.members.map((m) => [
        s.team.name,
        SUBMISSION_STATUS_LABEL[s.status],
        m.role?.name,
        m.isLeader ? 'Y' : '',
        m.user.name,
        m.user.school?.name,
        m.user.major,
        m.user.admissionYear,
        m.user.schoolEmail ?? m.user.email,
        docsLabel(s.documents),
        s.submittedAt,
      ]),
    );
    return {
      fileName: `${c.title}_지원명단.csv`,
      content: toCsv(['팀명', '상태', '역할', '팀장', '이름', '학교', '학과', '학번', '연락처', '서류', '접수일시'], rows),
    };
  }

  /** 서류 보관함 (업로드 파일) */
  async documents(user: AuthUser, q: DocumentArchiveQuery) {
    const where: Prisma.SubmissionDocumentWhereInput = {
      filePath: { not: null },
      submission: { status: { not: SubmissionStatus.PREPARING }, contest: adminContestWhere(user), ...(q.contestId ? { contestId: q.contestId } : {}) },
      ...(q.type ? { type: q.type } : {}),
      ...(q.q
        ? { OR: [{ fileName: { contains: q.q, mode: 'insensitive' } }, { submission: { team: { name: { contains: q.q, mode: 'insensitive' } } } }] }
        : {}),
    };
    const [items, total] = await this.adminRepository.findDocuments(where, toSkip(q), q.limit);
    return {
      items: items.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        status: d.status,
        fileName: d.fileName,
        fileSize: d.fileSize,
        updatedAt: d.updatedAt,
        submissionId: d.submission.id,
        submissionStatus: d.submission.status,
        team: d.submission.team,
        contest: d.submission.contest,
        downloadUrl: `/admin/submissions/${d.submission.id}/documents/${d.id}/file`,
      })),
      total,
      page: q.page,
      limit: q.limit,
    };
  }
}
