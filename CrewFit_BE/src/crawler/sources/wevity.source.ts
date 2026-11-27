import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContestScope, ContestSource } from '@prisma/client';
import { load } from 'cheerio';
import { Env } from '../../config/env.validation';
import { ContestSourceAdapter, CrawledContest, SourceResult } from '../crawler.types';
import { absUrl, fetchText, sleep } from '../util/http.util';
import { clean, clip, deadlineFromDday, guessCategory, parseYmd } from '../util/parse.util';

const BASE = 'https://www.wevity.com/';
/** 공모전 전체 목록 (gub=1). gp=페이지 */
const LIST_URL = (page: number) => `${BASE}?c=find&s=1&gub=1&gp=${page}`;

interface Row {
  ix: string;
  url: string;
  title: string;
  field: string;
  organizer: string;
  dday: string;
}

/** 위비티 공모전 목록 크롤링 (robots.txt Allow:/) */
@Injectable()
export class WevitySource implements ContestSourceAdapter {
  readonly key = ContestSource.WEVITY;
  readonly name = '위비티 공모전';
  private readonly logger = new Logger(WevitySource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  enabled() {
    return this.config.get('WEVITY_PAGES', { infer: true }) > 0;
  }

  disabledReason() {
    return this.enabled() ? null : 'WEVITY_PAGES=0';
  }

  async fetch(): Promise<SourceResult> {
    const ua = this.config.get('CRAWL_USER_AGENT', { infer: true });
    const pages = this.config.get('WEVITY_PAGES', { infer: true });
    const delay = this.config.get('CRAWL_DELAY_MS', { infer: true });
    const rows = new Map<string, Row>();

    for (let p = 1; p <= pages; p++) {
      const html = await fetchText(LIST_URL(p), { userAgent: ua });
      const found = this.parseList(html);
      if (!found.length) break;
      found.forEach((r) => rows.set(r.ix, r));
      await sleep(delay);
    }

    const items: CrawledContest[] = [];
    let skipped = 0;
    for (const r of rows.values()) {
      if (/마감(?!임박)/.test(r.dday)) {
        skipped++;
        continue;
      }
      let detail: { deadline: Date | null; start: Date | null; homepage: string | null; desc: string } = {
        deadline: null,
        start: null,
        homepage: null,
        desc: '',
      };
      try {
        detail = this.parseDetail(await fetchText(r.url, { userAgent: ua }));
      } catch (e) {
        this.logger.warn(`상세 실패 ix=${r.ix}: ${(e as Error).message}`);
      }
      await sleep(delay);

      const deadline = detail.deadline ?? deadlineFromDday(r.dday);
      if (!deadline) {
        skipped++;
        continue;
      }
      const tags = r.field
        .split(/[,/]/)
        .map(clean)
        .filter(Boolean)
        .slice(0, 6);
      items.push({
        externalId: r.ix,
        title: clip(r.title, 200),
        organizer: clip(r.organizer || '위비티 공모전', 100),
        description: detail.desc,
        category: guessCategory(r.title, r.field),
        tags: ['공모전', ...tags],
        scope: ContestScope.NATIONAL,
        applyStartAt: detail.start,
        deadline,
        linkUrl: r.url,
        submitTo: detail.homepage ? `주최 측 접수 (${detail.homepage})` : '주최 측 접수 (원문 링크)',
      });
    }
    this.logger.log(`위비티 ${items.length}건 (skip ${skipped})`);
    return { items, skipped };
  }

  private parseList(html: string): Row[] {
    const $ = load(html);
    const out: Row[] = [];
    // 기본 구조: ul.list > li ( .tit a / .sub-tit / .organ / .day )
    let lis = $('ul.list > li').not('.top');
    if (!lis.length) lis = $('a[href*="gbn=view"][href*="ix="]').closest('li');
    lis.each((_, el) => {
      const li = $(el);
      const a = li.find('.tit a[href*="ix="]').first().length ? li.find('.tit a[href*="ix="]').first() : li.find('a[href*="ix="]').first();
      const href = a.attr('href');
      const ix = href && /[?&]ix=(\d+)/.exec(href)?.[1];
      if (!href || !ix) return;
      const url = absUrl(href, BASE);
      if (!url) return;
      const aClone = a.clone();
      aClone.find('span, img, em, i').remove();
      const title = clean(aClone.text()) || clean(a.text());
      const field = clean(li.find('.sub-tit').text()).replace(/^분야\s*:?\s*/, '');
      const organizer = clean(li.find('.organ').text());
      const dday = clean(li.find('.day').text()) || clean(li.text());
      if (title) out.push({ ix, url, title, field, organizer, dday });
    });
    return out;
  }

  /** 상세: '접수기간 2026-11-01 ~ 2026-12-05', '홈페이지 http://..' */
  private parseDetail(html: string) {
    const $ = load(html);
    const text = clean($('body').text());
    const period = /접수기간\s*:?\s*(20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~∼〜-]\s*(20\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})/.exec(text);
    const homepage = /홈페이지\s*:?\s*(https?:\/\/[^\s"'<>]+)/.exec(text)?.[1] ?? null;
    const descEl = $('#viewContents, .comm-desc, .article').first();
    const desc = clip(clean(descEl.text()), 3000);
    return {
      start: period ? parseYmd(period[1], false) : null,
      deadline: period ? parseYmd(period[2]) : null,
      homepage,
      desc,
    };
  }
}
