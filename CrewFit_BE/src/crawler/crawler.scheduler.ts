import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CrawlTrigger } from '@prisma/client';
import { Env } from '../config/env.validation';
import { CrawlerService } from './crawler.service';

/** 매일 06:00 KST 자동 수집 (CRAWL_ENABLED=false 면 끔) */
@Injectable()
export class CrawlerScheduler {
  private readonly logger = new Logger(CrawlerScheduler.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly crawlerService: CrawlerService,
  ) {}

  @Cron('0 6 * * *', { name: 'contest-crawl', timeZone: 'Asia/Seoul' })
  async daily() {
    if (!this.config.get('CRAWL_ENABLED', { infer: true }) || this.crawlerService.isRunning) return;
    try {
      const r = await this.crawlerService.run(CrawlTrigger.SCHEDULE);
      this.logger.log(`자동 수집 완료: ${r.map((x) => `${x.source} +${x.created}/~${x.updated}${x.error ? ' ERR' : ''}`).join(', ')}`);
    } catch (e) {
      this.logger.error(`자동 수집 실패: ${(e as Error).message}`);
    }
  }
}
