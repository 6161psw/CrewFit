import { Injectable } from '@nestjs/common';
import { InvitationStatus, InvitationType, Prisma } from '@prisma/client';
import { ACTIVE_TEAM_STATUSES } from '../common/utils/scope.util';
import { userSummarySelect } from '../common/utils/user-summary.util';
import { PrismaService } from '../prisma/prisma.service';

export const invitationInclude = {
  role: { select: { id: true, name: true } },
  user: { select: userSummarySelect },
  team: {
    select: {
      id: true,
      name: true,
      status: true,
      badgeHidden: true,
      contest: { select: { id: true, title: true } },
      leader: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.InvitationInclude;

export type InvitationRow = Prisma.InvitationGetPayload<{ include: typeof invitationInclude }>;

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTeam(id: number) {
    return this.prisma.team.findUnique({ where: { id }, include: { contest: true, roles: true, members: true } });
  }

  countPending(teamId: number, userId: string) {
    return this.prisma.invitation.count({ where: { teamId, userId, status: InvitationStatus.PENDING } });
  }

  countInterest(userId: string, contestId: number) {
    return this.prisma.contestInterest.count({ where: { userId, contestId } });
  }

  /** 지원 시 관심 표시도 같이 */
  createApply(data: { teamId: number; userId: string; roleId: number; message: string; contestId: number }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.contestInterest.createMany({ data: [{ userId: data.userId, contestId: data.contestId }], skipDuplicates: true });
      return tx.invitation.create({
        data: { teamId: data.teamId, userId: data.userId, senderId: data.userId, roleId: data.roleId, type: InvitationType.APPLY, message: data.message },
        include: invitationInclude,
      });
    });
  }

  createOffer(data: { teamId: number; userId: string; senderId: string; roleId: number; message: string }) {
    return this.prisma.invitation.create({ data: { ...data, type: InvitationType.OFFER }, include: invitationInclude });
  }

  findMany(where: Prisma.InvitationWhereInput): Promise<InvitationRow[]> {
    return this.prisma.invitation.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: invitationInclude });
  }

  findById(id: number) {
    return this.prisma.invitation.findUnique({
      where: { id },
      include: { team: { select: { leaderId: true } }, user: { select: { name: true } } },
    });
  }

  setStatus(id: number, status: InvitationStatus) {
    return this.prisma.invitation.update({ where: { id }, data: { status, respondedAt: new Date() } });
  }

  /** 수락 트랜잭션: validate(팀, 이미 속한 팀 수) 통과 시 팀원 추가 + 같은 대회 다른 대기 건 취소 */
  accept(
    inv: { id: number; teamId: number; userId: string; roleId: number | null },
    validate: (team: Prisma.TeamGetPayload<{ include: { roles: true; members: true } }>, activeTeams: number) => void,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.findUniqueOrThrow({ where: { id: inv.teamId }, include: { roles: true, members: true } });
      const active = await tx.teamMember.count({
        where: { userId: inv.userId, team: { contestId: team.contestId, status: { in: ACTIVE_TEAM_STATUSES } } },
      });
      validate(team, active);
      await tx.teamMember.create({ data: { teamId: inv.teamId, userId: inv.userId, roleId: inv.roleId } });
      const now = new Date();
      await tx.invitation.update({ where: { id: inv.id }, data: { status: InvitationStatus.ACCEPTED, respondedAt: now } });
      await tx.invitation.updateMany({
        where: { userId: inv.userId, status: InvitationStatus.PENDING, team: { contestId: team.contestId } },
        data: { status: InvitationStatus.CANCELED, respondedAt: now },
      });
      return team.roles.find((r) => r.id === inv.roleId)?.name ?? '팀원';
    });
  }
}
