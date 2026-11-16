import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { csv, Env } from '../config/env.validation';
import { AuthRepository } from './auth.repository';
import { DevLoginDto } from './dto/req/dev-login.dto';
import { TokensDto } from './dto/res/tokens.dto';
import { GoogleProfile } from './types/google-profile.type';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();
  private readonly superAdmins: string[];
  private readonly refreshDays: number;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    private readonly authRepository: AuthRepository,
  ) {
    this.superAdmins = csv(config.get('SUPER_ADMIN_EMAILS', { infer: true })).map((e) => e.toLowerCase());
    this.refreshDays = config.get('REFRESH_TOKEN_EXPIRE_DAYS', { infer: true });
  }

  get refreshMaxAgeMs() {
    return this.refreshDays * 86_400_000;
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<TokensDto> {
    const school = await this.authRepository.findSchoolByEmail(profile.email);
    const user = await this.authRepository.upsertUser(profile, {
      school,
      superAdmin: this.superAdmins.includes(profile.email),
    });
    return this.issueTokens(user.id);
  }

  /** 앱: 네이티브 구글 로그인 idToken 검증 */
  async loginWithIdToken(idToken: string): Promise<TokensDto> {
    if (!this.config.get('GOOGLE_CLIENT_ID', { infer: true })) throw new ServiceUnavailableException('구글 로그인 미설정');
    const audience = [
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      ...csv(this.config.get('GOOGLE_MOBILE_CLIENT_IDS', { infer: true })),
    ];
    const ticket = await this.google.verifyIdToken({ idToken, audience }).catch(() => {
      throw new UnauthorizedException('유효하지 않은 구글 토큰');
    });
    const p = ticket.getPayload();
    if (!p?.email || !p.email_verified) throw new UnauthorizedException('구글 이메일 미인증');
    return this.loginWithGoogle({
      googleId: p.sub,
      email: p.email.toLowerCase(),
      name: p.name ?? p.email.split('@')[0],
      picture: p.picture ?? null,
    });
  }

  async devLogin(dto: DevLoginDto): Promise<TokensDto> {
    const enabled =
      this.config.get('DEV_LOGIN_ENABLED', { infer: true }) && this.config.get('NODE_ENV', { infer: true }) !== 'production';
    if (!enabled) throw new ForbiddenException();
    const email = dto.email.toLowerCase();
    const school = dto.schoolId
      ? await this.authRepository.findSchoolById(dto.schoolId)
      : await this.authRepository.findSchoolByEmail(email);
    const user = await this.authRepository.upsertUser(
      { email, name: dto.name ?? email.split('@')[0], picture: null },
      { school, superAdmin: this.superAdmins.includes(email) },
    );
    return this.issueTokens(user.id);
  }

  /** refresh token 회전: 기존 토큰 폐기 후 새로 발급 */
  async refresh(refreshToken: string): Promise<TokensDto> {
    const hash = sha256(refreshToken);
    const row = await this.authRepository.findRefreshToken(hash);
    if (!row || row.expiresAt < new Date()) throw new UnauthorizedException();
    await this.authRepository.deleteRefreshToken(hash);
    return this.issueTokens(row.userId);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) await this.authRepository.deleteRefreshToken(sha256(refreshToken));
  }

  private async issueTokens(userId: string): Promise<TokensDto> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.authRepository.deleteExpiredTokens(userId);
    await this.authRepository.createRefreshToken(userId, sha256(refreshToken), new Date(Date.now() + this.refreshMaxAgeMs));
    return { accessToken: this.jwt.sign({}, { subject: userId }), refreshToken };
  }
}
