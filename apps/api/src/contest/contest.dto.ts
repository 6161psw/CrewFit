import { ContestCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../common/pagination';
import { SCOPE_TABS, ScopeTab } from '../common/scope';

export const CONTEST_SORTS = ['deadline', 'popular', 'recommended'] as const;
export type ContestSort = (typeof CONTEST_SORTS)[number];

export class ContestListQuery extends PaginationQuery {
  /** 내 학교 / 내 지역 / 전국 (생략 시 전체) */
  @IsOptional()
  @IsIn(SCOPE_TABS)
  scope?: ScopeTab;

  /** 마감임박 / 인기순 / AI추천순 */
  @IsOptional()
  @IsIn(CONTEST_SORTS)
  sort: ContestSort = 'deadline';

  @IsOptional()
  @IsEnum(ContestCategory)
  category?: ContestCategory;

  @IsOptional()
  @IsString()
  tag?: string;

  /** 제목·주최 검색 */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeClosed?: boolean;
}

export class InterestedUsersQuery extends PaginationQuery {
  /** 전체 / 우리 학교 / 내 지역(다른 학교) */
  @IsOptional()
  @IsIn(['all', 'school', 'region'])
  filter: 'all' | 'school' | 'region' = 'all';

  /** 기술 스택 검색 */
  @IsOptional()
  @IsString()
  skill?: string;
}
