import { ForwardFormat } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ForwardPreviewQuery {
  @IsOptional()
  @IsEnum(ForwardFormat)
  format: ForwardFormat = ForwardFormat.OPERATOR;
}

/** W-06 승인 팀 운영사 전달 */
export class ForwardDto {
  /** 운영사 양식(최소 항목) / 학교 양식 */
  @IsOptional()
  @IsEnum(ForwardFormat)
  format: ForwardFormat = ForwardFormat.OPERATOR;

  /** 생략 시 공고의 운영사 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientName?: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;
}
