import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestScope, ContestStatus, MemberOutcome, Prisma, SubmissionStatus, TeamStatus, UserRole } from '@prisma/client';
import { BadgeService } from '../badge/badge.service';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/auth-user';
import { CATEGORY_LABEL } from '../common/labels';
import { toSkip } from '../common/pagination';
import { adminContestWhere, canManageContest } from '../common/scope';
import { PrismaService } from '../prisma/prisma.service';
import { submissionInclude, SubmissionService } from '../submission/submission.service';
import {
  AdminSubmissionQuery,
  AdminUserQuery,
  CreateContestDto,
  TeamOutcomeDto,
  UpdateContestDto,
  UpdateSubmissionStatusDto,
  UpdateUserRoleDto,
} from './admin.dto';

const SUBMITTED: SubmissionStatus[] = [SubmissionStatus.SUBMITTED, SubmissionStatus.APPROVED, SubmissionStatus.FORWARDED];
const TRANSITIONS: Partial<Record<SubmissionStatus, SubmissionStatus[]>> = {
  SUBMITTED: [SubmissionStatus.APPROVED, SubmissionStatus.REJECTED],
  APPROVED: [SubmissionStatus.FORWARDED, SubmissionStatus.REJECTED],
};
const STATUS_MSG: Partial<Record<SubmissionStatus, string>> = {
  APPROVED: '학교 확인이 끝났어요',
  REJECTED: '서류가 반려됐어요. 수정 후 다시 제출해 주세요',
  FORWARDED: '주최·운영사에 명단이 전달됐어요',
};

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionService: SubmissionService,
    private readonly chatService: ChatService,
    private readonly badgeService: BadgeService,
  ) {}

  /** 관심 → 팀 결성 → 신청 → 수상 집계 */
  async dashboard(user: AuthUser) {
    const contests = await this.prisma.contest.findMany({
      where: adminContestWhere(user),
      orderBy: { deadline: 'desc' },
      select: { id: true, title: true, category: true, deadline: true, status: true, scope: true, _count: { select: { interests: true } } },
    });
    const ids = contests.map((c) => c.id);
    const [teams, awards] = await Promise.all([
      this.prisma.team.groupBy({ by: ['contestId', 'status'], where: { contestId: { in: ids } }, _count: { _all: true } }),
      this.prisma.team.groupBy({ by: ['contestId'], where: { contestId: { in: ids }, award: { not: null } }, _count: { _all: true } }),
    ]);
    const n = (cid: number, statuses: TeamStatus[]) =>
      teams.filter((t) => t.contestId === cid && statuses.includes(t.status)).reduce((s, t) => s + t._count._all, 0);
    const rows = contests.map((c) => ({
      id: c.id,
      title: c.title,
      categoryLabel: CATEGORY_LABEL[c.category],
      deadline: c.deadline,
      status: c.status,
      scope: c.scope,
      interestCount: c._count.interests,
      teamCount: n(c.id, [TeamStatus.RECRUITING, TeamStatus.CONFIRMED, TeamStatus.SUBMITTED, TeamStatus.COMPLETED]),
      recruitingCount: n(c.id, [TeamStatus.RECRUITING]),
      confirmedCount: n(c.id, [TeamStatus.CONFIRMED, TeamStatus.SUBMITTED, TeamStatus.COMPLETED]),
      submittedCount: n(c.id, [TeamStatus.SUBMITTED, TeamStatus.COMPLETED]),
      disbandedCount: n(c.id, [TeamStatus.DISBANDED]),
      awardCount: awards.find((a) => a.contestId === c.id)?._count._all ?? 0,
    }));
    const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
    return {
      totals: {
        contests: rows.length,
        interests: sum('interestCount'),
        teams: sum('teamCount'),
        confirmed: sum('confirmedCount'),
        submitted: sum('submittedCount'),
        disbanded: sum('disbandedCount'),
        awards: sum('awardCount'),
      },
      contests: rows,
    };
  }

  // ---------- 공모전 ----------

  listContests(user: AuthUser) {
    return this.prisma.contest.findMany({
      where: adminContestWhere(user),
      orderBy: { createdAt: 'desc' },
      include: { school: { select: { shortName: true } }, requiredDocuments: { orderBy: { order: 'asc' } }, _count: { select: { teams: true, interests: true } } },
    });
  }

  async createContest(user: AuthUser, dto: CreateContestDto) {
    const scope = await this.resolveScope(user, dto.scope, dto.schoolId, dto.region);
    this.assertTeamSize(dto.minTeamSize, dto.maxTeamSize);
    const { requiredDocuments, schoolId: _s, region: _r, ...rest } = dto;
    return this.prisma.contest.create({
      data: {
        ...rest,
        ...scope,
        tags: dto.tags ?? [],
        description: dto.description ?? '',
        deadline: new Date(dto.deadline),
        applyStartAt: dto.applyStartAt ? new Date(dto.applyStartAt) : undefined,
        createdById: user.id,
        requiredDocuments: requiredDocuments?.length
          ? { create: requiredDocuments.map((d, order) => ({ ...d, order })) }
          : undefined,
      },
      include: { requiredDocuments: true },
    });
  }

  async updateContest(user: AuthUser, id: number, dto: UpdateContestDto) {
    const c = await this.findManagedContest(user, id);
    const scope = dto.scope ? await this.resolveScope(user, dto.scope, dto.schoolId, dto.region) : {};
    this.assertTeamSize(dto.minTeamSize ?? c.minTeamSize, dto.maxTeamSize ?? c.maxTeamSize);
    const { requiredDocuments, schoolId: _s, region: _r, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (requiredDocuments) {
        await tx.contestRequiredDocument.deleteMany({ where: { contestId: id } });
        await tx.contestRequiredDocument.createMany({ data: requiredDocuments.map((d, order) => ({ ...d, order, contestId: id })) });
      }
      return tx.contest.update({
        where: { id },
        data: {
          ...rest,
          ...scope,
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
          applyStartAt: dto.applyStartAt ? new Date(dto.applyStartAt) : undefined,
        },
        include: { requiredDocuments: { orderBy: { order: 'asc' } } },
      });
    });
  }

  /** 팀이 있으면 마감(CLOSED) 처리, 없으면 삭제 */
  async removeContest(user: AuthUser, id: number) {
    await this.findManagedContest(user, id);
    const teams = await this.prisma.team.count({ where: { contestId: id } });
    if (teams) {
      await this.prisma.contest.update({ where: { id }, data: { status: ContestStatus.CLOSED } });
      return { closed: true };
    }
    await this.prisma.contest.delete({ where: { id } });
    return { deleted: true };
  }

  // ---------- 제출 명단 ----------

  async listSubmissions(user: AuthUser, q: AdminSubmissionQuery) {
    const where: Prisma.SubmissionWhereInput = {
      contest: adminContestWhere(user),
      status: q.status ?? { not: SubmissionStatus.PREPARING },
      ...(q.contestId ? { contestId: q.contestId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        skip: toSkip(q),
        take: q.limit,
        include: {
          contest: { select: { id: true, title: true } },
          team: { select: { id: true, name: true, award: true, leader: { select: { name: true } }, _count: { select: { members: true } } } },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);
    return {
      items: rows.map((s) => ({
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
        forwardedAt: s.forwardedAt,
        contest: s.contest,
        team: { id: s.team.id, name: s.team.name, award: s.team.award, leaderName: s.team.leader.name, memberCount: s.team._count.members },
      })),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async submissionDetail(user: AuthUser, id: number) {
    const s = await this.findManagedSubmission(user, id);
    return this.submissionService.view(s, undefined, true);
  }

  async updateSubmissionStatus(user: AuthUser, id: number, dto: UpdateSubmissionStatusDto) {
    const s = await this.findManagedSubmission(user, id);
    if (!TRANSITIONS[s.status]?.includes(dto.status)) throw new BadRequestException(`${s.status} → ${dto.status} 불가`);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNote: dto.note ?? null,
          reviewerId: user.id,
          ...(dto.status === SubmissionStatus.FORWARDED ? { forwardedAt: now } : { reviewedAt: now }),
        },
      }),
      // 반려 → 팀이 수정 후 재제출 가능하도록 CONFIRMED 로
      ...(dto.status === SubmissionStatus.REJECTED
        ? [this.prisma.team.update({ where: { id: s.teamId }, data: { status: TeamStatus.CONFIRMED } })]
        : []),
    ]);
    const msg = STATUS_MSG[dto.status];
    if (msg) await this.chatService.system(s.teamId, `${s.contest.submitTo}: ${msg}${dto.note ? ` (${dto.note})` : ''}`);
    this.chatService.notifyTeam(s.teamId, { submissionStatus: dto.status });
    return this.submissionDetail(user, id);
  }

  /** 대회별 제출 명단 CSV (엑셀 호환 BOM) */
  async rosterCsv(user: AuthUser, contestId: number) {
    const c = await this.findManagedContest(user, contestId);
    const subs = await this.prisma.submission.findMany({
      where: { contestId, status: { in: SUBMITTED } },
      orderBy: { submittedAt: 'asc' },
      include: submissionInclude,
    });
    const header = ['팀명', '역할', '팀장', '이름', '학교', '학과', '학번', '학교메일', '제출상태', '제출일시'];
    const lines = [header.join(',')];
    for (const s of subs) {
      for (const m of s.team.members) {
        lines.push(
          [s.team.name, m.role?.name, m.isLeader ? 'Y' : '', m.user.name, m.user.school?.name, m.user.major, m.user.admissionYear, m.user.schoolEmail, s.status, s.submittedAt?.toISOString()]
            .map(csvCell)
            .join(','),
        );
      }
    }
    return { fileName: `${c.title}_명단.csv`, content: '﻿' + lines.join('\r\n') };
  }

  /** 대회 종료 후 완주·수상 처리 → 배지 자동 부여 */
  async setTeamOutcome(user: AuthUser, teamId: number, dto: TeamOutcomeDto) {
    const t = await this.prisma.team.findUnique({ where: { id: teamId }, include: { contest: true, members: true, submission: true } });
    if (!t || !canManageContest(user, t.contest)) throw new NotFoundException();
    if (!t.submission || !SUBMITTED.includes(t.submission.status)) throw new BadRequestException('제출된 팀만 완주 처리할 수 있어요');
    const done = new Set(dto.completedUserIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: teamId }, data: { status: TeamStatus.COMPLETED, completedAt: new Date(), award: dto.award ?? null } });
      for (const m of t.members) {
        await tx.teamMember.update({
          where: { teamId_userId: { teamId, userId: m.userId } },
          data: { outcome: done.has(m.userId) ? MemberOutcome.COMPLETED : MemberOutcome.DROPPED },
        });
      }
      for (const m of t.members) if (done.has(m.userId)) await this.badgeService.evaluate(tx, m.userId, teamId);
    });
    await this.chatService.system(teamId, `대회 완주! ${dto.award ? `🏆 ${dto.award} · ` : ''}완주 배지가 프로필에 반영됐어요`);
    return { ok: true };
  }

  // ---------- 사용자 (SUPER_ADMIN) ----------

  async listUsers(q: AdminUserQuery) {
    const where: Prisma.UserWhereInput = q.q
      ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: toSkip(q),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, adminSchoolId: true, school: { select: { shortName: true } }, schoolVerifiedAt: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto) {
    if (dto.role === UserRole.SCHOOL_ADMIN && !dto.adminSchoolId) throw new BadRequestException('adminSchoolId 필요');
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, adminSchoolId: dto.role === UserRole.SCHOOL_ADMIN ? dto.adminSchoolId : null },
      select: { id: true, name: true, email: true, role: true, adminSchoolId: true },
    });
  }

  // ---------- helpers ----------

  private async findManagedContest(user: AuthUser, id: number) {
    const c = await this.prisma.contest.findUnique({ where: { id } });
    if (!c || !canManageContest(user, c)) throw new NotFoundException();
    return c;
  }

  private async findManagedSubmission(user: AuthUser, id: number) {
    const s = await this.prisma.submission.findUnique({ where: { id }, include: submissionInclude });
    if (!s || !canManageContest(user, s.contest)) throw new NotFoundException();
    return s;
  }

  private assertTeamSize(min: number, max: number) {
    if (min > max) throw new BadRequestException('minTeamSize ≤ maxTeamSize');
  }

  /** SCHOOL_ADMIN: SCHOOL=자기 학교, REGION=자기 학교 지역, NATIONAL 불가 */
  private async resolveScope(user: AuthUser, scope: ContestScope, schoolId?: number, region?: string) {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (scope === ContestScope.SCHOOL && !schoolId) throw new BadRequestException('schoolId 필요');
      if (scope === ContestScope.REGION && !region) throw new BadRequestException('region 필요');
      return {
        scope,
        schoolId: scope === ContestScope.SCHOOL ? schoolId! : null,
        region: scope === ContestScope.REGION ? region! : null,
      };
    }
    if (!user.adminSchoolId) throw new ForbiddenException();
    const school = await this.prisma.school.findUniqueOrThrow({ where: { id: user.adminSchoolId } });
    if (scope === ContestScope.NATIONAL) throw new ForbiddenException('전국 공고는 관리자만');
    return {
      scope,
      schoolId: school.id,
      region: scope === ContestScope.REGION ? school.region : null,
    };
  }
}
