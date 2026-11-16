import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class MessagesQuery {
  /** 이 id 이전 메시지 (무한 스크롤) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit = 50;
}
