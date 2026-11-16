import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { Env, googleEnabled } from '../../config/env.validation';

export const OAUTH_STATE_COOKIE = 'oauth_state';

/** /auth/google?client=web|admin → state = "<client>.<nonce>", nonce 는 쿠키로 검증 */
@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const enabled = googleEnabled({
      GOOGLE_CLIENT_ID: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      GOOGLE_CLIENT_SECRET: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
    });
    if (!enabled) throw new ServiceUnavailableException('구글 로그인 미설정 (GOOGLE_CLIENT_ID/SECRET)');
    return super.canActivate(ctx);
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
