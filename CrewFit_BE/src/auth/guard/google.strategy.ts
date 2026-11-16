import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Env } from '../../config/env.validation';
import { GoogleProfile } from '../types/google-profile.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Env, true>) {
    const api = config.get('API_URL', { infer: true }).replace(/\/$/, '');
    super({
      // 미설정이어도 서버는 뜨도록 placeholder. 실제 사용은 GoogleGuard 가 막음
      clientID: config.get('GOOGLE_CLIENT_ID', { infer: true }) || 'disabled',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }) || 'disabled',
      callbackURL: config.get('GOOGLE_CALLBACK_URL', { infer: true }) || `${api}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const email = profile.emails?.[0]?.value;
    const verified = (profile._json as unknown as { email_verified?: boolean } | undefined)?.email_verified !== false;
    if (!email || !verified) throw new UnauthorizedException('구글 이메일 확인 불가');
    return {
      googleId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName || email.split('@')[0],
      picture: profile.photos?.[0]?.value ?? null,
    };
  }
}
