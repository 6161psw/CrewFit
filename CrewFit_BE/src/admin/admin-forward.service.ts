import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ForwardFormat, SubmissionStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/types/auth-user.type';
import { toCsv } from '../common/utils/csv.util';
import { adminContestWhere, canManageContest } from '../common/utils/scope.util';
import { AdminAccessService } from './admin-access.service';
import { AdminRepository, AdminSubmissionRow } from './admin.repository';
import { ForwardDto } from './dto/req/forward.dto';

/**
 * 운영사 양식: 개인정보 최소 항목 (학번·학과 제외, 연락처는 팀장만)
 * 학교 양식: 전체 항목
 */
function forwardCsv(subs: AdminSubmissionRow[], format: ForwardFormat) {
  if (format === ForwardFormat.OPERATOR) {
    const rows = subs.flatMap((s) =>
      s.team.members.map((m) => [
        s.team.name,
        m.role?.name,
        m.isLeader ? 'Y' : '',
        m.user.name,
        m.user.school?.name,
        m.isLeader ? (m.user.schoolEmail ?? m.user.email) : '',
        s.documents.map((d) => d.title).join(' / '),
      ]),
    );
    return toCsv(['팀명', '역할', '팀장', '이름', '학교', '연락처(팀장)', '서류'], rows);
  }
  const rows = subs.flatMap((s) =>
    s.team.members.map((m) => [
      s.team.name,
      m.role?.name,
      m.isLeader ? 'Y' : '',
      m.user.name,
      m.user.school?.name,
      m.user.major,
      m.user.admissionYear,
      m.user.schoolEmail ?? m.user.email,
      s.submittedAt,
    ]),
  );
  return toCsv(['팀명', '역할', '팀장', '이름', '학교', '학과', '학번', '연락처', '접수일시'], rows);
}

@Injectable()
export class AdminForwardService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly access: AdminAccessService,
    private readonly chatService: ChatService,
  ) {}

  /** W-06 명단 미리보기 */
  async preview(user: AuthUser, contestId: number, format: ForwardFormat) {
    const c = await this.access.contest(user, contestId);
    const subs = await this.adminRepository.findSubmissionsByContest(contestId, [SubmissionStatus.APPROVED]);
    return {
      contest: { id: c.id, title: c.title },
      recipient: { name: c.operatorName ?? c.organizer, email: c.operatorEmail },
      format,
      teamCount: subs.length,
      studentCount: subs.reduce((n, s) => n + s.team.members.length, 0),
      teams: subs.slice(0, 5).map((s) => {
        const leader = s.team.members.find((m) => m.isLeader)?.user;
        return {
          submissionId: s.id,
          teamName: s.team.name,
          leaderName: leader?.name ?? null,
          contact: leader ? (leader.schoolEmail ?? leader.email) : null,
          memberCount: s.team.members.length,
          documentCount: s.documents.length,
        };
      }),
      moreTeams: Math.max(0, subs.length - 5),
    };
  }

  /** W-06 → W-07 승인 팀 전달 */
  async forward(user: AuthUser, contestId: number, dto: ForwardDto) {
    const c = await this.access.contest(user, contestId);
    const subs = await this.adminRepository.findSubmissionsByContest(contestId, [SubmissionStatus.APPROVED]);
    if (!subs.length) throw new BadRequestException('전달할 승인 팀이 없어요');
    const recipientName = dto.recipientName ?? c.operatorName ?? c.organizer;
    const batch = await this.adminRepository.createForwardBatch(
      contestId,
      subs.map((s) => s.id),
      {
        actorId: user.id,
        recipientName,
        recipientEmail: dto.recipientEmail ?? c.operatorEmail ?? null,
        format: dto.format,
        teamCount: subs.length,
        studentCount: subs.reduce((n, s) => n + s.team.members.length, 0),
      },
    );
    for (const s of subs) {
      await this.chatService.system(s.team.id, `주최·운영사(${recipientName})에 명단이 전달됐어요`);
      this.chatService.notifyTeam(s.team.id, { submissionStatus: SubmissionStatus.FORWARDED });
    }
    // TODO: 운영사 메일 발송 (메일 서비스 연동 후). 지금은 파일 다운로드로 전달
    return { ...batch, emailed: false, fileUrl: `/admin/forward-batches/${batch.id}/file` };
  }

  async list(user: AuthUser) {
    const contests = await this.adminRepository.findContests(adminContestWhere(user));
    return this.adminRepository.listBatches(contests.map((c) => c.id));
  }

  async file(user: AuthUser, id: number) {
    const b = await this.findBatch(user, id);
    return { fileName: `${b.contest.title}_운영사전달_${b.id}.csv`, content: forwardCsv(b.submissions, b.format) };
  }

  /** W-07 되돌리기 */
  async revert(user: AuthUser, id: number) {
    const b = await this.findBatch(user, id);
    if (b.revertedAt) throw new BadRequestException('이미 되돌린 전달');
    await this.adminRepository.revertBatch(id, b.submissions.map((s) => s.id), user.id);
    for (const s of b.submissions) this.chatService.notifyTeam(s.team.id, { submissionStatus: SubmissionStatus.APPROVED });
    return { ok: true };
  }

  private async findBatch(user: AuthUser, id: number) {
    const b = await this.adminRepository.findBatch(id);
    if (!b || !canManageContest(user, b.contest)) throw new NotFoundException();
    return b;
  }
}
