import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy as GoogleStrategyBase } from 'passport-google-oauth20';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { Env } from '../config/env';
import { AuthRepository } from './auth.repository';
import { GoogleProfile, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, 'jwt') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      ignoreExpiration: false,
    });
  }

  async validate({ sub }: JwtPayload) {
    const user = sub ? await this.authRepository.findUserById(sub) : null;
    if (!user) throw new UnauthorizedException();
    return user;
  }
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(GoogleStrategyBase, 'google') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', { infer: true }),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      callbackURL: config.get('GOOGLE_CALLBACK_URL', { infer: true }),
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
