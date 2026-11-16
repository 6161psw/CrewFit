import { RevisionReason } from '@prisma/client';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** W-05 보완 요청 */
export class RevisionRequestDto {
  /** 다시 받을 서류 (파일 업로드 / 동의서만) */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  documentIds: number[];

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RevisionReason, { each: true })
  reasons: RevisionReason[];

  /** 팀에게 보낼 메시지 */
  @IsString()
  @MaxLength(1000)
  message: string;

  /** 보완 기한 */
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
