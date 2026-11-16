import { MemberOutcome, Prisma } from '@prisma/client';

export const userSummarySelect = {
  id: true,
  name: true,
  picture: true,
  major: true,
  admissionYear: true,
  skills: true,
  schoolVerifiedAt: true,
  school: { select: { id: true, shortName: true, region: true } },
  memberships: { select: { outcome: true } },
  _count: { select: { badges: true } },
} satisfies Prisma.UserSelect;

export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export function completionRate(rows: { outcome: MemberOutcome }[]): number | null {
  const done = rows.filter((r) => r.outcome === MemberOutcome.COMPLETED).length;
  const dropped = rows.filter((r) => r.outcome === MemberOutcome.DROPPED).length;
  return done + dropped === 0 ? null : Math.round((done * 100) / (done + dropped));
}

/** 카드용 요약. hideBadges = 배지 숨김 방 */
export function toUserSummary(u: UserSummaryRow, hideBadges = false) {
  return {
    id: u.id,
    name: u.name,
    picture: u.picture,
    school: u.school ? { id: u.school.id, shortName: u.school.shortName, region: u.school.region } : null,
    schoolVerified: !!u.schoolVerifiedAt,
    major: u.major,
    admissionYear: u.admissionYear,
    skills: u.skills,
    completionRate: hideBadges ? null : completionRate(u.memberships),
    badgeCount: hideBadges ? null : u._count.badges,
  };
}
export type UserSummary = ReturnType<typeof toUserSummary>;
