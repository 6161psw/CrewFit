import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';
import { SCOPE_TABS, ScopeTab } from '../../../common/utils/scope.util';

export const TEAM_SORTS = ['latest', 'deadline', 'popular', 'recommended'] as const;
export type TeamSort = (typeof TEAM_SORTS)[number];

export class TeamListQuery extends PaginationQuery {
  /** 특정 대회 모집 채팅만 (H-03 / A-07) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contestId?: number;

  @IsOptional()
  @IsIn(SCOPE_TABS)
  scope?: ScopeTab;

  /** 최신 / 마감임박 / 인기순 / AI추천순 */
  @IsOptional()
  @IsIn(TEAM_SORTS)
  sort: TeamSort = 'latest';

  /** 내 좋아요만 */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  liked?: boolean;

  /** 모집 인원(남은 자리): 1~4, 5 = 5명 이상 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  openSlots?: number;

  /** 채팅방 검색 */
  @IsOptional()
  @IsString()
  q?: string;
}

