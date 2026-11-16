import { Prisma, UserRole } from '@prisma/client';

export const authUserInclude = { school: true } satisfies Prisma.UserInclude;
export type AuthUser = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

export const isAdmin = (u: AuthUser) => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SCHOOL_ADMIN;
