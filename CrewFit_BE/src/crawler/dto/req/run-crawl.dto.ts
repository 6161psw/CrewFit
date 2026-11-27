import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContestSource } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

const CRAWL_SOURCES = Object.values(ContestSource).filter((s) => s !== ContestSource.MANUAL);

export class RunCrawlDto {
  /** 비우면 활성 소스 전체 */
  @ApiPropertyOptional({ enum: CRAWL_SOURCES })
  @IsOptional()
  @IsIn(CRAWL_SOURCES)
  source?: ContestSource;
}

export class CrawlRunsQuery {
  @ApiPropertyOptional({ enum: CRAWL_SOURCES })
  @IsOptional()
  @IsIn(CRAWL_SOURCES)
  source?: ContestSource;
}
