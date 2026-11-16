import { Injectable } from '@nestjs/common';
import { Prisma, TeamStatus } from '@prisma/client';
import { ACTIVE_TEAM_STATUSES } from '../common/scope';
import { userSummarySelect } from '../common/user-summary';
import { PrismaService } from '../prisma/prisma.service';

export const contestCardInclude = (userId: string) =>
  ({
    school: { select: { id: true, shortName: true } },
    interests: { where: { userId }, select: { userId: true } },
    _count: { select: { interests: true, teams: { where: { status: TeamStatus.RECRUITING } } } },
  }) satisfies Prisma.ContestInclude;

export type ContestCardRow = Prisma.ContestGetPayload<{ include: ReturnType<typeof contestCardInclude> }>;

@Injectable()
export class ContestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    userId: string,
    where: Prisma.ContestWhereInput,
    orderBy: Prisma.ContestOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<ContestCardRow[]> {
    return this.prisma.contest.findMany({ where, orderBy, skip, take, include: contestCardInclude(userId) });
  }

  count(where: Prisma.ContestWhereInput) {
    return this.prisma.contest.count({ where });
  }

  findDetail(id: number, userId: string) {
    return this.prisma.contest.findUnique({
      where: { id },
      include: {
        ...contestCardInclude(userId),
        requiredDocuments: { orderBy: { order: 'asc' } },
        teams: {
          where: { status: { in: ACTIVE_TEAM_STATUSES }, members: { some: { userId } } },
          select: { id: true, name: true, status: true },
        },
      },
    });
  }

  findBasic(id: number) {
    return this.prisma.contest.findUnique({ where: { id } });
  }

  addInterest(userId: string, contestId: number) {
    return this.prisma.contestInterest.createMany({ data: [{ userId, contestId }], skipDuplicates: true });
  }

  removeInterest(userId: string, contestId: number) {
    return this.prisma.contestInterest.deleteMany({ where: { userId, contestId } });
  }

  countInterest(contestId: number) {
    return this.prisma.contestInterest.count({ where: { contestId } });
  }

  async isInterestedOrMember(userId: string, contestId: number) {
    const [i, m] = await Promise.all([
      this.prisma.contestInterest.count({ where: { userId, contestId } }),
      this.prisma.teamMember.count({ where: { userId, team: { contestId, status: { in: ACTIVE_TEAM_STATUSES } } } }),
    ]);
    return i + m > 0;
  }

  interestedUsers(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: userSummarySelect });
  }

  countUsers(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }
}
