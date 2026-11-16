import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

export const authUserInclude = { school: true } satisfies Prisma.UserInclude;
export type AuthUser = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

/** req.user (JwtGuard 통과 후) */
export const GetUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const isAdmin = (u: AuthUser) => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SCHOOL_ADMIN;
