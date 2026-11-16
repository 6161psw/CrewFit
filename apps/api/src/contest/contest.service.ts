import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestStatus, Prisma } from '@prisma/client';
import { AuthUser, isAdmin } from '../common/auth-user';
import { CATEGORY_LABEL } from '../common/labels';
import { Page, paginate, toSkip } from '../common/pagination';
import { canViewContest, contestScopeWhere, contestVisibleWhere, keywordScore, userKeywords } from '../common/scope';
import { toUserSummary } from '../common/user-summary';
import { ContestListQuery, InterestedUsersQuery } from './contest.dto';
import { ContestCardRow, ContestRepository } from './contest.repository';

const DAY = 86_400_000;
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function toContestCard(c: ContestCardRow) {
  return {
    id: c.id,
    title: c.title,
    organizer: c.organizer,
    category: c.category,
    categoryLabel: CATEGORY_LABEL[c.category],
    tags: c.tags,
    scope: c.scope,
    school: c.school,
    region: c.region,
    deadline: c.deadline,
    dDay: Math.ceil((c.deadline.getTime() - startOfToday().getTime()) / DAY),
    minTeamSize: c.minTeamSize,
    maxTeamSize: c.maxTeamSize,
    interestCount: c._count.interests,
    recruitingTeamCount: c._count.teams,
    isInterested: c.interests.length > 0,
  };
}

@Injectable()
export class ContestService {
  constructor(private readonly contestRepository: ContestRepository) {}

  async list(user: AuthUser, q: ContestListQuery): Promise<Page<ReturnType<typeof toContestCard>>> {
    const and: Prisma.ContestWhereInput[] = [
      contestVisibleWhere(user),
      contestScopeWhere(user, q.scope),
      { status: ContestStatus.PUBLISHED },
    ];
    if (!q.includeClosed) and.push({ deadline: { gte: startOfToday() } });
    if (q.category) and.push({ category: q.category });
    if (q.tag) and.push({ tags: { has: q.tag } });
    if (q.q) {
      and.push({
        OR: [
          { title: { contains: q.q, mode: 'insensitive' } },
          { organizer: { contains: q.q, mode: 'insensitive' } },
          { tags: { has: q.q } },
        ],
      });
    }
    const where: Prisma.ContestWhereInput = { AND: and };

    if (q.sort === 'recommended') {
      // TODO: 임베딩 기반 추천으로 교체. 현재: 프로필 키워드 매칭 + 관심 수
      const rows = await this.contestRepository.findMany(user.id, where, [{ deadline: 'asc' }], 0, 300);
      const words = userKeywords(user);
      const scored = rows
        .map((c) => ({
          c,
          s: keywordScore(words, [...c.tags, c.title, CATEGORY_LABEL[c.category]]) * 10 + Math.log1p(c._count.interests),
        }))
        .sort((a, b) => b.s - a.s);
      return paginate(scored.map(({ c }) => toContestCard(c)), q);
    }

    const orderBy: Prisma.ContestOrderByWithRelationInput[] =
      q.sort === 'popular' ? [{ interests: { _count: 'desc' } }, { deadline: 'asc' }] : [{ deadline: 'asc' }, { id: 'asc' }];
    const [rows, total] = await Promise.all([
      this.contestRepository.findMany(user.id, where, orderBy, toSkip(q), q.limit),
      this.contestRepository.count(where),
    ]);
    return { items: rows.map(toContestCard), total, page: q.page, limit: q.limit };
  }

  async detail(user: AuthUser, id: number) {
    const c = await this.contestRepository.findDetail(id, user.id);
    if (!c || !canViewContest(user, c) || (c.status === ContestStatus.DRAFT && !isAdmin(user))) throw new NotFoundException();
    return {
      ...toContestCard(c),
      description: c.description,
      applyStartAt: c.applyStartAt,
      submitTo: c.submitTo,
      linkUrl: c.linkUrl,
      status: c.status,
      requiredDocuments: c.requiredDocuments.map((d) => ({ id: d.id, type: d.type, title: d.title, description: d.description })),
      myTeam: c.teams[0] ?? null,
    };
  }

  async setInterest(user: AuthUser, id: number, on: boolean) {
    await this.assertVisible(user, id);
    if (on) await this.contestRepository.addInterest(user.id, id);
    else await this.contestRepository.removeInterest(user.id, id);
    return { isInterested: on, interestCount: await this.contestRepository.countInterest(id) };
  }

  /** H-04 관심 있는 사람 — 같은 공고에 관심 표시한 사람끼리만 */
  async interestedUsers(user: AuthUser, id: number, q: InterestedUsersQuery) {
    await this.assertVisible(user, id);
    if (!isAdmin(user) && !(await this.contestRepository.isInterestedOrMember(user.id, id))) {
      throw new ForbiddenException('관심 표시한 공모전만 볼 수 있어요');
    }
    const base: Prisma.UserWhereInput = { interests: { some: { contestId: id } }, id: { not: user.id } };
    const schoolW: Prisma.UserWhereInput = { schoolId: user.schoolId ?? -1 };
    const regionW: Prisma.UserWhereInput = {
      school: { region: user.school?.region ?? '__none__' },
      schoolId: { not: user.schoolId ?? -1 },
    };
    const filterW = q.filter === 'school' ? schoolW : q.filter === 'region' ? regionW : {};
    const where: Prisma.UserWhereInput = { AND: [base, filterW, q.skill ? { skills: { has: q.skill } } : {}] };

    const [rows, total, all, school, region] = await Promise.all([
      this.contestRepository.interestedUsers(where, toSkip(q), q.limit),
      this.contestRepository.countUsers(where),
      this.contestRepository.countUsers(base),
      this.contestRepository.countUsers({ AND: [base, schoolW] }),
      this.contestRepository.countUsers({ AND: [base, regionW] }),
    ]);
    return { counts: { all, school, region }, items: rows.map((u) => toUserSummary(u)), total, page: q.page, limit: q.limit };
  }

  private async assertVisible(user: AuthUser, id: number) {
    const c = await this.contestRepository.findBasic(id);
    if (!c || !canViewContest(user, c)) throw new NotFoundException();
    return c;
  }
}
