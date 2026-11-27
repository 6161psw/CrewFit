import { Module } from '@nestjs/common';
import { CrawlerController } from './crawler.controller';
import { CrawlerRepository } from './crawler.repository';
import { CrawlerScheduler } from './crawler.scheduler';
import { CrawlerService } from './crawler.service';
import { CONTEST_SOURCE_ADAPTERS } from './crawler.types';
import { GistSource } from './sources/gist.source';
import { KStartupSource } from './sources/kstartup.source';
import { WevitySource } from './sources/wevity.source';

/** 외부 공모전 자동 수집. 새 소스 = ContestSourceAdapter 구현 + 아래 등록 + ContestSource enum 추가 */
@Module({
  controllers: [CrawlerController],
  providers: [
    CrawlerRepository,
    CrawlerService,
    CrawlerScheduler,
    KStartupSource,
    WevitySource,
    GistSource,
    {
      provide: CONTEST_SOURCE_ADAPTERS,
      useFactory: (...a: [GistSource, KStartupSource, WevitySource]) => a,
      inject: [GistSource, KStartupSource, WevitySource],
    },
  ],
})
export class CrawlerModule {}
