import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AuthUser, ROLES_KEY } from '../common/auth-user';
import { Env } from '../config/env';

export const OAUTH_STATE_COOKIE = 'oauth_state';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}

/** @Roles() 와 함께 JwtGuard 뒤에 사용 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('권한이 없어요');
    return true;
  }
}

/** /auth/google?client=web|admin → state = "<client>.<nonce>", nonce 는 쿠키로 검증 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  getAuthenticateOptions(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.path.endsWith('/callback')) return { session: false };
    const res = ctx.switchToHttp().getResponse<Response>();
    const client = req.query.client === 'admin' ? 'admin' : 'web';
    const nonce = randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      maxAge: 10 * 60 * 1000,
      path: '/auth',
    });
    return { session: false, state: `${client}.${nonce}`, prompt: 'select_account' };
  }
}
