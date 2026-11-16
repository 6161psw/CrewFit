import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface JwtPayload {
  sub?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class GoogleIdTokenDto {
  /** 앱 네이티브 구글 로그인 idToken */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class RefreshDto {
  /** 앱: body 로 전달. 웹: 생략 (쿠키) */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class DevLoginDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  /** 학교 인증된 상태로 생성 */
  @IsOptional()
  @IsInt()
  schoolId?: number;
}

export class AccessTokenRes {
  accessToken: string;
  /** body 로 refreshToken 을 보낸 경우(앱)만 */
  refreshToken?: string;
}
