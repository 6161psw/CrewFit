const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const dDayLabel = (d: number) => (d === 0 ? 'D-DAY' : d > 0 ? `D-${d}` : '마감');

/** 11.12(목) */
export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${pad(d.getDate())}(${DAYS[d.getDay()]})`;
};

/** 11.01 21:40 */
export const dateTime = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 오후 2:14 / 어제 / 10.28 */
export const chatTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return `${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
  if (days === 1) return '어제';
  return `${d.getMonth() + 1}.${pad(d.getDate())}`;
};

/** 2분 전 / 3시간 전 */
export const ago = (iso: string | null | undefined) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
};

export const yearLabel = (y: number | null | undefined) => (y || y === 0 ? `${pad(y)}학번` : '');

export const majorYear = (major?: string | null, year?: number | null) => [major, yearLabel(year)].filter(Boolean).join(' · ');

export const fileSize = (b: number | null | undefined) => (!b ? '' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(b / 1024)}KB`);

/** 카테고리 썸네일 색 */
export const categoryColor = (label: string) =>
  ({ 해커톤: 'bg-ink', 창업: 'bg-primary', 연구: 'bg-accent', 데모: 'bg-sub', 아이디어: 'bg-primary' })[label] ?? 'bg-sub';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
