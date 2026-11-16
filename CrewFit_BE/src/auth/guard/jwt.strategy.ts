import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from '../../config/env.validation';
import { AuthRepository } from '../auth.repository';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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
