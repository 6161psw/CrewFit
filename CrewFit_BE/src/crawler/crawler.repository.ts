import { Injectable } from '@nestjs/common';
import { ContestSource, ContestStatus, CrawlTrigger, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrawledContest } from './crawler.types';

@Injectable()
export class CrawlerRepository {
  constructor(private readonly prisma: PrismaService) {}

  startRun(source: ContestSource, trigger: CrawlTrigger, triggeredById?: string) {
    return this.prisma.crawlRun.create({ data: { source, trigger, triggeredById } });
  }

  finishRun(id: number, data: Pick<Prisma.CrawlRunUpdateInput, 'fetched' | 'created' | 'updated' | 'skipped' | 'error'>) {
    return this.prisma.crawlRun.update({ where: { id }, data: { ...data, finishedAt: new Date() } });
  }

  runs(source?: ContestSource, take = 30) {
    return this.prisma.crawlRun.findMany({ where: source ? { source } : {}, orderBy: { id: 'desc' }, take });
  }

  lastRun(source: ContestSource) {
    return this.prisma.crawlRun.findFirst({ where: { source }, orderBy: { id: 'desc' } });
  }

  countBySource() {
    return this.prisma.contest.groupBy({
      by: ['source'],
      where: { status: ContestStatus.PUBLISHED, deadline: { gte: new Date() } },
      _count: { _all: true },
    });
  }

  find(source: ContestSource, externalId: string) {
    return this.prisma.contest.findUnique({
      where: { source_externalId: { source, externalId } },
      select: { id: true, status: true },
    });
  }

  create(source: ContestSource, c: CrawledContest) {
    return this.prisma.contest.create({
      data: {
        source,
        externalId: c.externalId,
        title: c.title,
        organizer: c.organizer,
        description: c.description ?? '',
        category: c.category,
        tags: c.tags,
        scope: c.scope,
        schoolId: c.schoolId ?? null,
        region: c.region ?? null,
        applyStartAt: c.applyStartAt ?? null,
        deadline: c.deadline,
        linkUrl: c.linkUrl,
        submitTo: c.submitTo,
        status: ContestStatus.PUBLISHED,
      },
    });
  }

  /** 관리자가 고친 분류·태그·팀 인원은 유지, 원문 정보만 갱신 */
  update(id: number, c: CrawledContest) {
    return this.prisma.contest.update({
      where: { id },
      data: {
        title: c.title,
        organizer: c.organizer,
        ...(c.description ? { description: c.description } : {}),
        applyStartAt: c.applyStartAt ?? undefined,
        deadline: c.deadline,
        linkUrl: c.linkUrl,
      },
    });
  }
}
