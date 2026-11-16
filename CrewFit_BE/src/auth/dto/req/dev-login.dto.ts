import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

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
