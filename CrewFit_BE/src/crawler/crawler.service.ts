import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContestSource, ContestStatus, CrawlTrigger } from '@prisma/client';
import { startOfToday } from '../common/utils/date.util';
import { CrawlerRepository } from './crawler.repository';
import { CONTEST_SOURCE_ADAPTERS, ContestSourceAdapter } from './crawler.types';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private running = false;

  constructor(
    @Inject(CONTEST_SOURCE_ADAPTERS) private readonly adapters: ContestSourceAdapter[],
    private readonly crawlerRepository: CrawlerRepository,
  ) {}

  get isRunning() {
    return this.running;
  }

  async sources() {
    const counts = await this.crawlerRepository.countBySource();
    return Promise.all(
      this.adapters.map(async (a) => ({
        key: a.key,
        name: a.name,
        enabled: a.enabled(),
        disabledReason: a.disabledReason?.() ?? null,
        activeCount: counts.find((c) => c.source === a.key)?._count._all ?? 0,
        lastRun: await this.crawlerRepository.lastRun(a.key),
      })),
    );
  }

  runs(source?: ContestSource) {
    return this.crawlerRepository.runs(source);
  }

  /** 전체(활성 소스) 또는 한 소스 수집. 동시 실행 막음 */
  async run(trigger: CrawlTrigger, opts: { source?: ContestSource; userId?: string } = {}) {
    if (this.running) throw new ConflictException('수집 진행 중');
    const targets = opts.source ? this.adapters.filter((a) => a.key === opts.source) : this.adapters.filter((a) => a.enabled());
    if (opts.source && !targets.length) throw new NotFoundException('소스 없음');

    this.running = true;
    try {
      const results = [];
      for (const a of targets) results.push(await this.runOne(a, trigger, opts.userId));
      return results;
    } finally {
      this.running = false;
    }
  }

  private async runOne(a: ContestSourceAdapter, trigger: CrawlTrigger, userId?: string) {
    const run = await this.crawlerRepository.startRun(a.key, trigger, userId);
    const stat = { fetched: 0, created: 0, updated: 0, skipped: 0, error: null as string | null };
    try {
      if (!a.enabled()) throw new Error(a.disabledReason?.() ?? '비활성');
      const { items, skipped } = await a.fetch();
      stat.fetched = items.length;
      stat.skipped = skipped;
      const today = startOfToday();
      const seen = new Set<string>();
      for (const c of items) {
        if (seen.has(c.externalId)) continue;
        seen.add(c.externalId);
        try {
          const ex = await this.crawlerRepository.find(a.key, c.externalId);
          if (ex) {
            // 관리자가 내린 공고(CLOSED)는 다시 안 올림
            if (ex.status === ContestStatus.CLOSED) stat.skipped++;
            else {
              await this.crawlerRepository.update(ex.id, c);
              stat.updated++;
            }
          } else if (c.deadline < today) {
            stat.skipped++;
          } else {
            await this.crawlerRepository.create(a.key, c);
            stat.created++;
          }
        } catch (e) {
          stat.skipped++;
          this.logger.warn(`[${a.key}] ${c.externalId} 저장 실패: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      stat.error = (e as Error).message.slice(0, 1000);
      this.logger.error(`[${a.key}] 수집 실패: ${stat.error}`);
    }
    return this.crawlerRepository.finishRun(run.id, stat);
  }
}
