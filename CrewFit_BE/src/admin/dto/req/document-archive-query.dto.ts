import { DocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

/** 서류 보관함 */
export class DocumentArchiveQuery extends PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contestId?: number;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  /** 팀 이름 / 파일 이름 */
  @IsOptional()
  @IsString()
  q?: string;
}
