import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';
import { SCOPE_TABS, ScopeTab } from '../common/scope';

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

export class TeamRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  capacity = 1;
}

/** E-01 팀 만들기 */
export class CreateTeamDto {
  @IsInt()
  contestId: number;

  /** 모집 채팅방 이름 */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 구하는 역할 */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TeamRoleDto)
  roles: TeamRoleDto[];

  /** 내 역할 (roles 에 없으면 1자리로 추가) */
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  myRole: string;

  /** 배지 숨김 방 */
  @IsOptional()
  @IsBoolean()
  badgeHidden?: boolean;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  badgeHidden?: boolean;
}
