import { ContestCategory } from '@prisma/client';
import { createHash } from 'crypto';
import { startOfToday } from '../../common/utils/date.util';

const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** KST y-m-d hh:mm:ss, 존재하지 않는 날짜(2/30 등)는 null */
function kst(y: number, m: number, d: number, time: string): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(`${y}-${pad(m)}-${pad(d)}T${time}+09:00`);
  if (Number.isNaN(dt.getTime())) return null;
  const back = new Date(dt.getTime() + 9 * 3_600_000);
  return back.getUTCDate() === d ? dt : null;
}

export const kstEndOfDay = (y: number, m: number, d: number) => kst(y, m, d, '23:59:59');
export const kstStartOfDay = (y: number, m: number, d: number) => kst(y, m, d, '00:00:00');

/** '20261205' · '2026-12-05' · '2026.12.05' · '2026. 12. 5.' */
export function parseYmd(v: unknown, end = true): Date | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  const m = /^(\d{4})[.\-/\s]*(\d{1,2})[.\-/\s]*(\d{1,2})/.exec(s.replace(/\s+/g, ' '));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return end ? kstEndOfDay(y, mo, d) : kstStartOfDay(y, mo, d);
}

/** 'D-12' → 오늘+12일 23:59 KST, 'D-day'/'오늘마감' → 오늘 */
export function deadlineFromDday(text: string): Date | null {
  const t = text.replace(/\s+/g, '');
  let n: number | null = null;
  if (/D-?day|오늘마감|D-0(?!\d)/i.test(t)) n = 0;
  const m = /D-(\d{1,3})/i.exec(t);
  if (m) n = Number(m[1]);
  if (n === null) return null;
  const d = new Date(startOfToday().getTime() + n * DAY);
  d.setHours(23, 59, 59, 0);
  return d;
}

const YMD = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;

/**
 * 본문에서 마감일 추정.
 * 1) '마감·접수·신청·기간·까지' 근처 날짜 중 가장 늦은 미래 날짜
 * 2) 없으면 본문 전체 미래 날짜 중 가장 늦은 것 (400일 이내)
 */
export function extractDeadline(text: string, now = new Date()): Date | null {
  const t = text.replace(/\s+/g, ' ');
  const limit = now.getTime() + 400 * DAY;
  const near: Date[] = [];
  const all: Date[] = [];
  for (const m of t.matchAll(YMD)) {
    const d = parseYmd(`${m[1]}-${m[2]}-${m[3]}`);
    if (!d || d.getTime() < startOfToday().getTime() || d.getTime() > limit) continue;
    all.push(d);
    const ctx = t.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + m[0].length + 15);
    if (/마감|접수|신청|모집|기간|까지|~|∼|〜/.test(ctx)) near.push(d);
  }
  const pick = near.length ? near : all;
  if (!pick.length) return null;
  return pick.reduce((a, b) => (b > a ? b : a));
}

const CATEGORY_RULES: [RegExp, ContestCategory][] = [
  [/해커톤|hackathon|코딩대회|프로그래밍/i, ContestCategory.HACKATHON],
  [/데모데이|demo ?day|IR|피칭|오디션/i, ContestCategory.DEMO],
  [/창업|스타트업|사업화|예비창업|startup|액셀러|보육/i, ContestCategory.STARTUP],
  [/논문|학술|연구|research/i, ContestCategory.RESEARCH],
  [/아이디어|기획|제안|idea/i, ContestCategory.IDEA],
];

export function guessCategory(...texts: (string | null | undefined)[]): ContestCategory {
  const s = texts.filter(Boolean).join(' ');
  for (const [re, c] of CATEGORY_RULES) if (re.test(s)) return c;
  return ContestCategory.ETC;
}

export const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export const hashId = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 20);

export const keywordFilter = (keywords: string[]) => (title: string) =>
  !keywords.length || keywords.some((k) => title.toLowerCase().includes(k.toLowerCase()));
