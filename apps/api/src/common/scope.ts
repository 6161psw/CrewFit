import { ContestScope, Prisma, TeamStatus, UserRole } from '@prisma/client';
import { AuthUser } from './auth-user';

/** 홈 탭: 내 학교 / 내 지역 / 전국 */
export type ScopeTab = 'school' | 'region' | 'national';
export const SCOPE_TABS: ScopeTab[] = ['school', 'region', 'national'];

/** 학생이 볼 수 있는 공고 (SCHOOL 공고는 같은 학교만) */
export function contestVisibleWhere(user: AuthUser): Prisma.ContestWhereInput {
  if (user.role === UserRole.SUPER_ADMIN) return {};
  const or: Prisma.ContestWhereInput[] = [{ scope: ContestScope.NATIONAL }, { scope: ContestScope.REGION }];
  if (user.schoolId) or.push({ scope: ContestScope.SCHOOL, schoolId: user.schoolId });
  if (user.adminSchoolId) or.push({ scope: ContestScope.SCHOOL, schoolId: user.adminSchoolId });
  return { OR: or };
}

export function contestScopeWhere(user: AuthUser, tab?: ScopeTab): Prisma.ContestWhereInput {
  switch (tab) {
    case 'school':
      return { scope: ContestScope.SCHOOL, schoolId: user.schoolId ?? -1 };
    case 'region':
      return { scope: ContestScope.REGION, region: user.school?.region ?? '__none__' };
    case 'national':
      return { scope: ContestScope.NATIONAL };
    default:
      return contestVisibleWhere(user);
  }
}

export function canViewContest(user: AuthUser, c: { scope: ContestScope; schoolId: number | null }): boolean {
  if (c.scope !== ContestScope.SCHOOL) return true;
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return c.schoolId === user.schoolId || c.schoolId === user.adminSchoolId;
}

/** 운영자 관리 범위 */
export function adminContestWhere(user: AuthUser): Prisma.ContestWhereInput {
  if (user.role === UserRole.SUPER_ADMIN) return {};
  if (user.role !== UserRole.SCHOOL_ADMIN) return { id: -1 };
  return { OR: [{ schoolId: user.adminSchoolId ?? -1 }, { createdById: user.id }] };
}

export function canManageContest(user: AuthUser, c: { schoolId: number | null; createdById: string | null }): boolean {
  if (user.role === UserRole.SUPER_ADMIN) return true;
  if (user.role !== UserRole.SCHOOL_ADMIN) return false;
  return (c.schoolId !== null && c.schoolId === user.adminSchoolId) || c.createdById === user.id;
}

/** 한 대회에 한 팀만: 해산 안 된 팀 */
export const ACTIVE_TEAM_STATUSES: TeamStatus[] = [
  TeamStatus.RECRUITING,
  TeamStatus.CONFIRMED,
  TeamStatus.SUBMITTED,
  TeamStatus.COMPLETED,
];

/** 간단 매칭 점수 (임베딩 추천 전 규칙 기반) */
export function keywordScore(userWords: string[], targetWords: string[]): number {
  const t = targetWords.join(' ').toLowerCase();
  return userWords.filter((w) => w && t.includes(w.toLowerCase())).length;
}

export function userKeywords(u: AuthUser): string[] {
  return [...u.skills, u.major ?? '', ...(u.introRole ?? '').split(/\s+/)].filter((w) => w.length >= 2);
}
