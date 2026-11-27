import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContestScope, ContestSource } from '@prisma/client';
import { csv, Env } from '../../config/env.validation';
import { ContestSourceAdapter, CrawledContest, SourceResult } from '../crawler.types';
import { fetchJson, sleep } from '../util/http.util';
import { clean, clip, guessCategory, keywordFilter, parseYmd } from '../util/parse.util';

/** 공공데이터포털 15125364 창업진흥원_K-Startup 사업공고 */
const ENDPOINT = 'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01';
const PER_PAGE = 100;
const MAX_PAGES = 10;

interface KsItem {
  pbanc_sn?: number | string;
  biz_pbanc_nm?: string;
  intg_pbanc_biz_nm?: string;
  pbanc_ntrp_nm?: string;
  sprv_inst?: string;
  pbanc_ctnt?: string;
  aply_trgt_ctnt?: string;
  aply_trgt?: string;
  supt_biz_clsfc?: string;
  supt_regin?: string;
  pbanc_rcpt_bgng_dt?: string;
  pbanc_rcpt_end_dt?: string;
  detl_pg_url?: string;
  biz_aply_url?: string;
  biz_gdnc_url?: string;
  rcrt_prgs_yn?: string;
}

interface KsResponse {
  data?: KsItem[];
  totalCount?: number;
  matchCount?: number;
}

/** supt_regin → 크루핏 region. 전국/빈값 → 전국, 여기 없는 지역 → 버림 */
const REGION_MAP: Record<string, string> = { 광주: '광주·전남', 전남: '광주·전남' };

@Injectable()
export class KStartupSource implements ContestSourceAdapter {
  readonly key = ContestSource.KSTARTUP;
  readonly name = 'K-Startup 사업공고 (창업진흥원 API)';
  private readonly logger = new Logger(KStartupSource.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  private get apiKey() {
    return this.config.get('KSTARTUP_API_KEY', { infer: true });
  }

  enabled() {
    return !!this.apiKey;
  }

  disabledReason() {
    return this.enabled() ? null : 'KSTARTUP_API_KEY 없음';
  }

  async fetch(): Promise<SourceResult> {
    const ua = this.config.get('CRAWL_USER_AGENT', { infer: true });
    const pass = keywordFilter(csv(this.config.get('KSTARTUP_KEYWORDS', { infer: true })));
    const items: CrawledContest[] = [];
    let skipped = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const qs = new URLSearchParams({
        serviceKey: this.apiKey,
        page: String(page),
        perPage: String(PER_PAGE),
        returnType: 'json',
        'cond[rcrt_prgs_yn::EQ]': 'Y',
      });
      const res = await fetchJson<KsResponse>(`${ENDPOINT}?${qs}`, { userAgent: ua, timeoutMs: 20_000 });
      const rows = res.data ?? [];
      for (const r of rows) {
        const c = this.map(r);
        if (!c || !pass(c.title)) skipped++;
        else items.push(c);
      }
      const total = res.matchCount ?? res.totalCount ?? 0;
      if (rows.length < PER_PAGE || page * PER_PAGE >= total) break;
      await sleep(300);
    }
    this.logger.log(`K-Startup ${items.length}건 (skip ${skipped})`);
    return { items, skipped };
  }

  private map(r: KsItem): CrawledContest | null {
    const id = r.pbanc_sn;
    const title = clean(r.biz_pbanc_nm || r.intg_pbanc_biz_nm);
    const deadline = parseYmd(r.pbanc_rcpt_end_dt);
    if (!id || !title || !deadline) return null;
    if (r.rcrt_prgs_yn && r.rcrt_prgs_yn !== 'Y') return null;

    const regin = clean(r.supt_regin);
    let scope: ContestScope = ContestScope.NATIONAL;
    let region: string | null = null;
    if (regin && !regin.includes('전국')) {
      const hit = Object.keys(REGION_MAP).find((k) => regin.includes(k));
      if (!hit) return null;
      scope = ContestScope.REGION;
      region = REGION_MAP[hit];
    }

    const organizer = clean(r.pbanc_ntrp_nm || r.sprv_inst) || '창업진흥원';
    const target = clean(r.aply_trgt_ctnt || r.aply_trgt);
    const body = clean(r.pbanc_ctnt);
    const description = clip([body, target && `신청 대상: ${target}`].filter(Boolean).join('\n\n'), 3000);
    const link = r.detl_pg_url || r.biz_aply_url || r.biz_gdnc_url || 'https://www.k-startup.go.kr';

    return {
      externalId: String(id),
      title: clip(title, 200),
      organizer: clip(organizer, 100),
      description,
      category: guessCategory(title, r.supt_biz_clsfc),
      tags: ['K-Startup', ...(r.supt_biz_clsfc ? [clean(r.supt_biz_clsfc)] : []), ...(region ? [region] : [])],
      scope,
      region,
      applyStartAt: parseYmd(r.pbanc_rcpt_bgng_dt, false),
      deadline,
      linkUrl: link,
      submitTo: 'K-Startup 온라인 접수 (원문 링크)',
    };
  }
}
