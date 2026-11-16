import { Injectable } from '@nestjs/common';
import { BadgeCode, ContestCategory, MemberOutcome, Prisma } from '@prisma/client';

/** 완주 배지: 플랫폼 기록 기반 자동 부여 */
@Injectable()
export class BadgeService {
  async evaluate(tx: Prisma.TransactionClient, userId: string, teamId: number) {
    const done = await tx.teamMember.findMany({
      where: { userId, outcome: MemberOutcome.COMPLETED },
      select: { team: { select: { award: true, contest: { select: { category: true } } } } },
    });
    const codes: BadgeCode[] = [];
    if (done.length >= 1) codes.push(BadgeCode.FIRST_COMPLETION);
    if (done.length >= 3) codes.push(BadgeCode.THREE_COMPLETIONS);
    if (done.some((d) => d.team.contest.category === ContestCategory.STARTUP)) codes.push(BadgeCode.STARTUP_COMPLETION);
    if (done.some((d) => d.team.contest.category === ContestCategory.HACKATHON)) codes.push(BadgeCode.HACKATHON_COMPLETION);
    if (done.some((d) => d.team.award)) codes.push(BadgeCode.AWARD);
    if (codes.length) {
      await tx.userBadge.createMany({ data: codes.map((code) => ({ userId, code, teamId })), skipDuplicates: true });
    }
  }
}

