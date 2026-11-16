import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleIdTokenDto {
  /** 앱 네이티브 구글 로그인 idToken */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
