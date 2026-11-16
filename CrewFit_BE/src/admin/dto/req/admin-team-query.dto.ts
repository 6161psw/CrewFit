import { SubmissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

/** W-03 지원 팀 목록 필터 */
export class AdminTeamQuery extends PaginationQuery {
  /** 상태 탭 (생략 = 전체) */
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  /** 팀 이름 / 팀원 이름 검색 */
  @IsOptional()
  @IsString()
  q?: string;

  /** 학과 필터 */
  @IsOptional()
  @IsString()
  major?: string;

  /** 서류 상태 */
  @IsOptional()
  @IsIn(['complete', 'incomplete'])
  docStatus?: 'complete' | 'incomplete';

  /** 팀 인원 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  size?: number;

  @IsOptional()
  @IsIn(['recent', 'oldest', 'name'])
  sort: 'recent' | 'oldest' | 'name' = 'recent';
}
