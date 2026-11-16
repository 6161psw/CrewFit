export class TokensDto {
  accessToken: string;
  refreshToken: string;
}

export class AccessTokenDto {
  accessToken: string;
  /** body 로 refreshToken 을 보낸 경우(앱)만 */
  refreshToken?: string;
}
