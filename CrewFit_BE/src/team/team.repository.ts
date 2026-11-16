import { Injectable } from '@nestjs/common';
import { InvitationStatus, Prisma, TeamStatus } from '@prisma/client';
import { ACTIVE_TEAM_STATUSES } from '../common/utils/scope.util';
import { userSummarySelect } from '../common/utils/user-summary.util';
import { PrismaService } from '../prisma/prisma.service';

const lastMessage = {
  orderBy: { id: 'desc' as const },
  take: 1,
  select: { id: true, type: true, content: true, createdAt: true, sender: { select: { id: true, name: true } } },
};

export const teamCardInclude = (userId: string) =>
  ({
    contest: { select: { id: true, title: true, category: true, deadline: true, tags: true, scope: true, schoolId: true } },
    leader: { select: userSummarySelect },
    roles: { orderBy: { order: 'asc' } },
    members: { select: { roleId: true, userId: true } },
    likes: { where: { userId }, select: { userId: true } },
    messages: lastMessage,
    _count: { select: { likes: true } },
  }) satisfies Prisma.TeamInclude;

export type TeamCardRow = Prisma.TeamGetPayload<{ include: ReturnType<typeof teamCardInclude> }>;

export const teamDetailInclude = (userId: string) =>
  ({
    contest: true,
    roles: { orderBy: { order: 'asc' } },
    members: {
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: userSummarySelect }, role: { select: { id: true, name: true } } },
    },
    likes: { where: { userId }, select: { userId: true } },
    invitations: { where: { userId, status: InvitationStatus.PENDING }, select: { id: true, type: true, roleId: true } },
    messages: lastMessage,
    submission: { select: { id: true, status: true } },
    _count: { select: { likes: true } },
  }) satisfies Prisma.TeamInclude;

export type TeamDetailRow = Prisma.TeamGetPayload<{ include: ReturnType<typeof teamDetailInclude> }>;

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCards(userId: string, where: Prisma.TeamWhereInput, take = 300): Promise<TeamCardRow[]> {
    return this.prisma.team.findMany({ where, take, orderBy: { createdAt: 'desc' }, include: teamCardInclude(userId) });
  }

  findDetail(id: number, userId: string): Promise<TeamDetailRow | null> {
    return this.prisma.team.findUnique({ where: { id }, include: teamDetailInclude(userId) });
  }

  findWithMembers(id: number) {
    return this.prisma.team.findUnique({
      where: { id },
      include: { contest: true, roles: true, members: { include: { user: { select: { id: true, name: true } } } } },
    });
  }

  like(userId: string, teamId: number) {
    return this.prisma.teamLike.createMany({ data: [{ userId, teamId }], skipDuplicates: true });
  }

  unlike(userId: string, teamId: number) {
    return this.prisma.teamLike.deleteMany({ where: { userId, teamId } });
  }

  countLikes(teamId: number) {
    return this.prisma.teamLike.count({ where: { teamId } });
  }

  update(id: number, data: Prisma.TeamUpdateInput) {
    return this.prisma.team.update({ where: { id }, data });
  }

  removeMember(teamId: number, userId: string) {
    return this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  }

  countPendingInvitations(where: Prisma.InvitationWhereInput) {
    return this.prisma.invitation.count({ where: { ...where, status: InvitationStatus.PENDING } });
  }

  findContest(id: number) {
    return this.prisma.contest.findUnique({ where: { id } });
  }

  findWithContest(id: number) {
    return this.prisma.team.findUnique({ where: { id }, include: { contest: true } });
  }

  /** 팀 + 역할 + 팀장(멤버) + 팀장 관심 표시 */
  createWithLeader(d: {
    contestId: number;
    leaderId: string;
    name: string;
    description: string;
    badgeHidden: boolean;
    roles: { name: string; capacity: number }[];
    leaderRole: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.team.create({
        data: {
          contestId: d.contestId,
          leaderId: d.leaderId,
          name: d.name,
          description: d.description,
          badgeHidden: d.badgeHidden,
          roles: { create: d.roles.map((r, order) => ({ ...r, order })) },
        },
        include: { roles: true },
      });
      await tx.teamMember.create({
        data: { teamId: t.id, userId: d.leaderId, isLeader: true, roleId: t.roles.find((r) => r.name === d.leaderRole)!.id },
      });
      await tx.contestInterest.createMany({ data: [{ userId: d.leaderId, contestId: d.contestId }], skipDuplicates: true });
      return t;
    });
  }

  disband(id: number) {
    return this.prisma.$transaction([
      this.prisma.team.update({ where: { id }, data: { status: TeamStatus.DISBANDED } }),
      this.prisma.invitation.updateMany({
        where: { teamId: id, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.CANCELED, respondedAt: new Date() },
      }),
    ]);
  }

  countActiveMemberships(userId: string, contestId: number) {
    return this.prisma.teamMember.count({ where: { userId, team: { contestId, status: { in: ACTIVE_TEAM_STATUSES } } } });
  }
}
