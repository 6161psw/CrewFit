import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const toSkip = (q: PaginationQuery) => (q.page - 1) * q.limit;

export function paginate<T>(all: T[], q: PaginationQuery): Page<T> {
  return { items: all.slice(toSkip(q), toSkip(q) + q.limit), total: all.length, page: q.page, limit: q.limit };
}
