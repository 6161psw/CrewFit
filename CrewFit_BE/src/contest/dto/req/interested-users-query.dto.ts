import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

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
