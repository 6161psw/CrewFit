import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContestStatus, InvitationStatus, InvitationType, Prisma, TeamStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';
import { AuthUser } from '../common/auth-user';
import { CATEGORY_LABEL } from '../common/labels';
import { paginate } from '../common/pagination';
import { ACTIVE_TEAM_STATUSES, canViewContest, contestScopeWhere, contestVisibleWhere, keywordScore, userKeywords } from '../common/scope';
import { toUserSummary } from '../common/user-summary';
import { startOfToday } from '../contest/contest.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, TeamListQuery, UpdateTeamDto } from './team.dto';
import { TeamCardRow, TeamRepository } from './team.repository';
import { computeSlots } from './team.util';

const lastMsg = (m?: { content: string; createdAt: Date; sender: { name: string } | null }) =>
  m ? { content: m.content, createdAt: m.createdAt, senderName: m.sender?.name ?? null } : null;

function toTeamCard(t: TeamCardRow) {
  const s = computeSlots(t.roles, t.members);
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    badgeHidden: t.badgeHidden,
    status: t.status,
    contest: { id: t.contest.id, title: t.contest.title, category: t.contest.category, categoryLabel: CATEGORY_LABEL[t.contest.category], deadline: t.contest.deadline },
    leader: toUserSummary(t.leader, t.badgeHidden),
    memberCount: s.memberCount,
    capacity: s.capacity,
    openCount: s.openCount,
    openRoles: s.slots.filter((r) => r.open > 0).map(({ id, name, open }) => ({ id, name, open })),
    likeCount: t._count.likes,
    isLiked: t.likes.length > 0,
    lastMessage: lastMsg(t.messages[0]),
    createdAt: t.createdAt,
  };
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamRepository: TeamRepository,
    private readonly chatService: ChatService,
  ) {}

  /** H-02 홈(모집 채팅) */
  async list(user: AuthUser, q: TeamListQuery) {
    const contestWhere: Prisma.ContestWhereInput = {
      AND: [contestVisibleWhere(user), contestScopeWhere(user, q.scope), { status: ContestStatus.PUBLISHED, deadline: { gte: startOfToday() } }],
    };
    const where: Prisma.TeamWhereInput = {
      status: TeamStatus.RECRUITING,
      contest: contestWhere,
      ...(q.contestId ? { contestId: q.contestId } : {}),
      ...(q.liked ? { likes: { some: { userId: user.id } } } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { contest: { title: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const rows = await this.teamRepository.findCards(user.id, where);
    const words = userKeywords(user);
    let cards = rows.map((t) => ({ t, card: toTeamCard(t) }));
    if (q.openSlots) cards = cards.filter(({ card }) => (q.openSlots! >= 5 ? card.openCount >= 5 : card.openCount === q.openSlots));

    const score = ({ t, card }: (typeof cards)[number]) => {
      switch (q.sort) {
        case 'deadline':
          return -t.contest.deadline.getTime();
        case 'popular':
          return card.likeCount;
        case 'recommended':
          return keywordScore(words, [...card.openRoles.map((r) => r.name), ...t.contest.tags, t.name]) * 10 + card.likeCount;
        default:
          return t.createdAt.getTime();
      }
    };
    const pref = (c: (typeof cards)[number]) => (user.preferBadgeHidden && c.t.badgeHidden ? 1 : 0);
    cards.sort((a, b) => pref(b) - pref(a) || score(b) - score(a));
    return paginate(cards.map((c) => c.card), q);
  }

  /** E-01 팀 만들기 */
  async create(user: AuthUser, dto: CreateTeamDto) {
    const contest = await this.prisma.contest.findUnique({ where: { id: dto.contestId } });
    if (!contest || !canViewContest(user, contest) || contest.status !== ContestStatus.PUBLISHED) throw new NotFoundException('대회 없음');
    if (contest.deadline < startOfToday()) throw new BadRequestException('접수 마감된 대회');
    await this.assertNoActiveTeam(user.id, contest.id);

    const roles = new Map<string, number>();
    for (const r of dto.roles) roles.set(r.name.trim(), (roles.get(r.name.trim()) ?? 0) + r.capacity);
    const myRole = dto.myRole.trim();
    if (!roles.has(myRole)) roles.set(myRole, 1);
    const total = [...roles.values()].reduce((a, b) => a + b, 0);
    if (total > contest.maxTeamSize) throw new BadRequestException(`최대 ${contest.maxTeamSize}명까지`);

    const team = await this.prisma.$transaction(async (tx) => {
      const t = await tx.team.create({
        data: {
          contestId: contest.id,
          leaderId: user.id,
          name: dto.name.trim(),
          description: dto.description ?? '',
          badgeHidden: dto.badgeHidden ?? false,
          roles: { create: [...roles].map(([name, capacity], order) => ({ name, capacity, order })) },
        },
        include: { roles: true },
      });
      await tx.teamMember.create({
        data: { teamId: t.id, userId: user.id, isLeader: true, roleId: t.roles.find((r) => r.name === myRole)!.id },
      });
      await tx.contestInterest.createMany({ data: [{ userId: user.id, contestId: contest.id }], skipDuplicates: true });
      return t;
    });
    await this.chatService.system(team.id, `${user.name}님이 모집 채팅방을 열었어요`);
    return this.detail(user, team.id);
  }

  /** T-01 팀 미리보기 */
  async detail(user: AuthUser, id: number) {
    const t = await this.teamRepository.findDetail(id, user.id);
    if (!t || !canViewContest(user, t.contest)) throw new NotFoundException();
    const me = t.members.find((m) => m.userId === user.id);
    if (t.status === TeamStatus.DISBANDED && !me) throw new NotFoundException();
    const s = computeSlots(t.roles, t.members);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      badgeHidden: t.badgeHidden,
      status: t.status,
      award: t.award,
      createdAt: t.createdAt,
      confirmedAt: t.confirmedAt,
      leaderId: t.leaderId,
      contest: {
        id: t.contest.id,
        title: t.contest.title,
        category: t.contest.category,
        categoryLabel: CATEGORY_LABEL[t.contest.category],
        deadline: t.contest.deadline,
        submitTo: t.contest.submitTo,
        minTeamSize: t.contest.minTeamSize,
        maxTeamSize: t.contest.maxTeamSize,
      },
      roles: s.slots.map((r) => ({
        ...r,
        members: t.members.filter((m) => m.roleId === r.id).map((m) => ({ id: m.user.id, name: m.user.name, isLeader: m.isLeader })),
      })),
      members: t.members.map((m) => ({
        ...toUserSummary(m.user, t.badgeHidden),
        role: m.role,
        isLeader: m.isLeader,
        outcome: m.outcome,
      })),
      memberCount: s.memberCount,
      capacity: s.capacity,
      openCount: s.openCount,
      likeCount: t._count.likes,
      isLiked: t.likes.length > 0,
      /** 비멤버: 최근 대화 1개만 미리보기 */
      recentMessage: me ? null : lastMsg(t.messages[0]),
      submission: t.submission,
      me: {
        isMember: !!me,
        isLeader: t.leaderId === user.id,
        pendingInvitation: t.invitations[0] ?? null,
      },
    };
  }

  /** E-02 채팅 탭 */
  async mine(user: AuthUser) {
    const rows = await this.teamRepository.findCards(user.id, {
      members: { some: { userId: user.id } },
      status: { not: TeamStatus.DISBANDED },
    });
    const [sentApplications, receivedOffers, receivedApplications] = await Promise.all([
      this.teamRepository.countPendingInvitations({ userId: user.id, type: InvitationType.APPLY }),
      this.teamRepository.countPendingInvitations({ userId: user.id, type: InvitationType.OFFER }),
      this.teamRepository.countPendingInvitations({ type: InvitationType.APPLY, team: { leaderId: user.id } }),
    ]);
    const teams = rows
      .map((t) => ({ ...toTeamCard(t), isLeader: t.leaderId === user.id }))
      .sort((a, b) => (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0));
    return { teams, counts: { joined: teams.length, sentApplications, receivedOffers, receivedApplications } };
  }

  async setLike(user: AuthUser, id: number, on: boolean) {
    const t = await this.prisma.team.findUnique({ where: { id }, include: { contest: true } });
    if (!t || !canViewContest(user, t.contest)) throw new NotFoundException();
    if (on) await this.teamRepository.like(user.id, id);
    else await this.teamRepository.unlike(user.id, id);
    return { isLiked: on, likeCount: await this.teamRepository.countLikes(id) };
  }

  async update(user: AuthUser, id: number, dto: UpdateTeamDto) {
    await this.assertLeader(user, id);
    await this.teamRepository.update(id, dto);
    return this.detail(user, id);
  }

  async leave(user: AuthUser, id: number) {
    const t = await this.teamRepository.findWithMembers(id);
    if (!t || !t.members.some((m) => m.userId === user.id)) throw new NotFoundException();
    if (t.leaderId === user.id) throw new BadRequestException('팀장은 나갈 수 없어요. 팀을 해산하세요');
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('확정된 팀은 나갈 수 없어요');
    await this.teamRepository.removeMember(id, user.id);
    await this.chatService.system(id, `${user.name}님이 나갔어요`);
    return { ok: true };
  }

  async kick(user: AuthUser, id: number, userId: string) {
    const t = await this.assertLeader(user, id);
    if (userId === user.id) throw new BadRequestException();
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('확정된 팀');
    const target = t.members.find((m) => m.userId === userId);
    if (!target) throw new NotFoundException();
    await this.teamRepository.removeMember(id, userId);
    await this.chatService.system(id, `${target.user.name}님이 팀에서 내보내졌어요`);
    return { ok: true };
  }

  async disband(user: AuthUser, id: number) {
    const t = await this.assertLeader(user, id);
    if (t.status !== TeamStatus.RECRUITING) throw new BadRequestException('확정된 팀은 해산할 수 없어요');
    await this.prisma.$transaction([
      this.prisma.team.update({ where: { id }, data: { status: TeamStatus.DISBANDED } }),
      this.prisma.invitation.updateMany({
        where: { teamId: id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.CANCELED, respondedAt: new Date() },
      }),
    ]);
    await this.chatService.system(id, '팀이 해산됐어요');
    return { ok: true };
  }

  async assertLeader(user: AuthUser, id: number) {
    const t = await this.teamRepository.findWithMembers(id);
    if (!t) throw new NotFoundException();
    if (t.leaderId !== user.id) throw new ForbiddenException('팀장만 할 수 있어요');
    return t;
  }

  async assertNoActiveTeam(userId: string, contestId: number) {
    const n = await this.prisma.teamMember.count({
      where: { userId, team: { contestId, status: { in: ACTIVE_TEAM_STATUSES } } },
    });
    if (n > 0) throw new ConflictException('이미 이 대회의 팀에 속해 있어요');
  }
}
