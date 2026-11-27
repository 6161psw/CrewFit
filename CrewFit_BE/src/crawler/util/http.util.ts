const DEFAULT_UA = 'Mozilla/5.0 (compatible; CrewFitBot/0.1; +https://crewfit.kr)';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** charset(content-type / meta) 맞춰 디코딩 (euc-kr 게시판 대응) */
export async function fetchText(url: string, opts: { userAgent?: string; timeoutMs?: number } = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': opts.userAgent || DEFAULT_UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1];
  if (!charset) {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 2048));
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder((charset ?? 'utf-8').toLowerCase()).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

export async function fetchJson<T>(url: string, opts: { userAgent?: string; timeoutMs?: number } = {}): Promise<T> {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`JSON 아님: ${text.slice(0, 200)}`);
  }
}

export const absUrl = (href: string, base: string) => {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};
