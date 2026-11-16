import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  /** 앱: body 로 전달. 웹: 생략 (쿠키) */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
