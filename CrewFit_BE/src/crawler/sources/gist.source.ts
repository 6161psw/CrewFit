import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContestScope, ContestSource } from '@prisma/client';
import { load } from 'cheerio';
import { csv, Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { ContestSourceAdapter, CrawledContest, SourceResult } from '../crawler.types';
import { absUrl, fetchText, sleep } from '../util/http.util';
import { clean, clip, extractDeadline, guessCategory, hashId, keywordFilter } from '../util/parse.util';

const ID_PARAM = /[?&](?:no|idx|seq|bbsIdx|articleNo|nttId|bbs_seq|num|uid)=(\d+)/i;

/**
 * GIST 공지 게시판 (교내 공고 → SCHOOL 범위)
 * 게시판 구조 모름 → 일반 파싱: 목록 링크 중 키워드 맞는 글 → 상세 본문에서 마감일 추정
 * GIST_NOTICE_URLS 비우면 비활성. robots.txt 정책 확인 후 사용.
 */
@Injectable()
export class GistSource implements ContestSourceAdapter {
  readonly key = ContestSource.GIST;
  readonly name = 'GIST 공지 게시판';
  private readonly logger = new Logger(GistSource.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private get urls() {
    return csv(this.config.get('GIST_NOTICE_URLS', { infer: true }));
  }

  enabled() {
    return this.urls.length > 0;
  }

  disabledReason() {
    return this.enabled() ? null : 'GIST_NOTICE_URLS 없음';
  }

  async fetch(): Promise<SourceResult> {
    const ua = this.config.get('CRAWL_USER_AGENT', { infer: true });
    const delay = this.config.get('CRAWL_DELAY_MS', { infer: true });
    const pass = keywordFilter(csv(this.config.get('GIST_KEYWORDS', { infer: true })));
    const school = await this.prisma.school.findFirst({
      where: { OR: [{ shortName: 'GIST' }, { name: { contains: '광주과학기술원' } }] },
      select: { id: true, region: true },
    });
    if (!school) throw new Error('GIST 학교 레코드 없음 (seed 확인)');

    const links = new Map<string, { id: string; url: string; title: string }>();
    for (const listUrl of this.urls) {
      const $ = load(await fetchText(listUrl, { userAgent: ua }));
      const scope = $('table tbody tr, .board_list li, .bbs_list li, ul.list li').length
        ? $('table tbody tr, .board_list li, .bbs_list li, ul.list li')
        : $('body');
      scope.find('a[href]').each((_, el) => {
        const a = $(el);
        const href = a.attr('href') ?? '';
        if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
        const title = clean(a.attr('title') || a.text());
        if (title.length < 6 || !pass(title)) return;
        const url = absUrl(href, listUrl);
        if (!url || url === listUrl) return;
        const id = ID_PARAM.exec(url)?.[1] ?? hashId(url);
        links.set(id, { id, url, title });
      });
      await sleep(delay);
    }

    const items: CrawledContest[] = [];
    let skipped = 0;
    for (const l of links.values()) {
      try {
        const $ = load(await fetchText(l.url, { userAgent: ua }));
        $('script, style, nav, header, footer').remove();
        const body = clean($('.view_cont, .board_view, .bbs_view, .view-content, article, #content, .content').first().text()) || clean($('body').text());
        const deadline = extractDeadline(`${l.title} ${body}`);
        if (!deadline) {
          skipped++;
        } else {
          items.push({
            externalId: l.id,
            title: clip(l.title, 200),
            organizer: 'GIST',
            description: clip(body, 3000),
            category: guessCategory(l.title),
            tags: ['GIST', '교내'],
            scope: ContestScope.SCHOOL,
            schoolId: school.id,
            region: school.region,
            deadline,
            linkUrl: l.url,
            submitTo: 'GIST (공지 원문 참고)',
          });
        }
      } catch (e) {
        skipped++;
        this.logger.warn(`상세 실패 ${l.url}: ${(e as Error).message}`);
      }
      await sleep(delay);
    }
    this.logger.log(`GIST ${items.length}건 (skip ${skipped})`);
    return { items, skipped };
  }
}
