import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyDto {
  /** 어떤 역할로 참여할까요? */
  @IsInt()
  roleId: number;

  /** 한 줄 소개 */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}

