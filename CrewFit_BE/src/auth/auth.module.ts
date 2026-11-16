import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Env } from '../config/env.validation';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { GoogleGuard } from './guard/google.guard';
import { GoogleStrategy } from './guard/google.strategy';
import { JwtGuard } from './guard/jwt.guard';
import { JwtStrategy } from './guard/jwt.strategy';
import { RolesGuard } from './guard/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }) as any, issuer: 'crewfit' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, GoogleStrategy, JwtGuard, RolesGuard, GoogleGuard],
  exports: [AuthService, AuthRepository, JwtModule, JwtGuard, RolesGuard],
})
export class AuthModule {}
