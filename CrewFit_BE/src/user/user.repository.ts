import { Injectable } from '@nestjs/common';
import { Prisma, TeamStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const profileInclude = {
  school: true,
  badges: { orderBy: { awardedAt: 'asc' } },
  memberships: {
    where: { team: { status: { not: TeamStatus.DISBANDED } } },
    orderBy: { joinedAt: 'desc' },
    include: {
      role: { select: { name: true } },
      team: {
        select: {
          id: true,
          name: true,
          status: true,
          award: true,
          contest: { select: { id: true, title: true, category: true, deadline: true } },
        },
      },
    },
  },
  _count: { select: { interests: true } },
} satisfies Prisma.UserInclude;

export type ProfileRow = Prisma.UserGetPayload<{ include: typeof profileInclude }>;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(id: string): Promise<ProfileRow | null> {
    return this.prisma.user.findUnique({ where: { id }, include: profileInclude });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  /** 프로필 공개 범위: 같은 공고 관심 / 같은 팀 / 제안·지원 관계 / 모집 중 팀 멤버 */
  async canView(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const checks = await Promise.all([
      this.prisma.contestInterest.count({
        where: { userId: targetId, contest: { interests: { some: { userId: viewerId } } } },
      }),
      this.prisma.teamMember.count({
        where: { userId: targetId, team: { OR: [{ status: TeamStatus.RECRUITING }, { members: { some: { userId: viewerId } } }] } },
      }),
      this.prisma.invitation.count({
        where: {
          OR: [
            { userId: targetId, team: { leaderId: viewerId } },
            { userId: viewerId, team: { members: { some: { userId: targetId } } } },
          ],
        },
      }),
    ]);
    return checks.some((c) => c > 0);
  }

  interestedContests(userId: string) {
    return this.prisma.contest.findMany({
      where: { interests: { some: { userId } } },
      orderBy: { deadline: 'asc' },
      select: { id: true, title: true, category: true, deadline: true, organizer: true },
    });
  }
}
