import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';
import { Env } from '../config/env.validation';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/req/dev-login.dto';
import { GoogleIdTokenDto } from './dto/req/google-id-token.dto';
import { RefreshDto } from './dto/req/refresh.dto';
import { AccessTokenDto, TokensDto } from './dto/res/tokens.dto';
import { GoogleGuard, OAUTH_STATE_COOKIE } from './guard/google.guard';
import { GoogleProfile } from './types/google-profile.type';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: this.config.get('COOKIE_SAMESITE', { infer: true }),
      path: '/auth',
    };
  }

  private setRefreshCookie(res: Response, tokens: TokensDto) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...this.cookieOptions(), maxAge: this.authService.refreshMaxAgeMs });
  }

  @ApiOperation({ summary: '구글 로그인 시작 (브라우저 이동). ?client=web|admin' })
  @Get('google')
  @UseGuards(GoogleGuard)
  google() {
    // GoogleGuard 가 구글로 리디렉션
  }

  @ApiOperation({ summary: '구글 콜백 → refresh 쿠키 설정 → {WEB|ADMIN}_URL/auth/callback 으로 이동' })
  @Get('google/callback')
  @UseGuards(GoogleGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const [client, nonce] = String(req.query.state ?? '').split('.');
    const cookieNonce = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/auth' });
    const base = this.config.get(client === 'admin' ? 'ADMIN_URL' : 'WEB_URL', { infer: true });
    if (!nonce || nonce !== cookieNonce) return res.redirect(`${base}/auth/callback?error=state`);
    const tokens = await this.authService.loginWithGoogle(req.user as GoogleProfile);
    this.setRefreshCookie(res, tokens);
    return res.redirect(`${base}/auth/callback`);
  }

  @ApiOperation({ summary: '앱: 구글 idToken 으로 로그인 (토큰 body 반환)' })
  @Post('google/token')
  @HttpCode(200)
  async googleToken(@Body() dto: GoogleIdTokenDto, @Res({ passthrough: true }) res: Response): Promise<TokensDto> {
    const tokens = await this.authService.loginWithIdToken(dto.idToken);
    this.setRefreshCookie(res, tokens);
    return tokens;
  }

  @ApiOperation({ summary: 'access token 재발급 (쿠키 또는 body.refreshToken)' })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    const fromBody = !!dto.refreshToken;
    const token = dto.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException();
    const tokens = await this.authService.refresh(token);
    this.setRefreshCookie(res, tokens);
    return fromBody ? tokens : { accessToken: tokens.accessToken };
  }

  @ApiOperation({ summary: '로그아웃' })
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(dto.refreshToken ?? req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @ApiOperation({ summary: '개발용 로그인 (DEV_LOGIN_ENABLED, non-production)' })
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto, @Res({ passthrough: true }) res: Response): Promise<TokensDto> {
    const tokens = await this.authService.devLogin(dto);
    this.setRefreshCookie(res, tokens);
    return tokens;
  }
}
