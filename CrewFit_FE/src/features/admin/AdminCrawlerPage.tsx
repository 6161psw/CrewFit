import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { SOURCE_LABEL, type ContestSource } from '../../api/types';
import { Button, Chip, Empty, errMsg, Loading, useToast } from '../../components/ui';
import { dateTime } from '../../lib/format';
import type { AdminMe } from './types';

interface CrawlRun {
  id: number;
  source: ContestSource;
  trigger: 'SCHEDULE' | 'MANUAL';
  startedAt: string;
  finishedAt: string | null;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  error: string | null;
}

interface SourceRow {
  key: ContestSource;
  name: string;
  enabled: boolean;
  disabledReason: string | null;
  activeCount: number;
  lastRun: CrawlRun | null;
}

const runLabel = (r: CrawlRun) => (r.error ? `실패 · ${r.error}` : `신규 ${r.created} · 갱신 ${r.updated} · 제외 ${r.skipped}`);

/** 외부 공고 수집 (K-Startup · 위비티 · GIST 공지). 매일 06:00 자동 */
export function AdminCrawlerPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: () => api.get<AdminMe>('/admin/me') });
  const src = useQuery({
    queryKey: ['admin', 'crawler', 'sources'],
    queryFn: () => api.get<{ running: boolean; sources: SourceRow[] }>('/admin/crawler/sources'),
    refetchInterval: (q) => (q.state.data?.running ? 3000 : false),
  });
  const runs = useQuery({ queryKey: ['admin', 'crawler', 'runs'], queryFn: () => api.get<CrawlRun[]>('/admin/crawler/runs') });

  const run = useMutation({
    mutationFn: (source?: ContestSource) => api.post<CrawlRun[]>('/admin/crawler/run', source ? { source } : {}),
    onMutate: () => toast('수집 시작', '사이트마다 수십 초 걸려요'),
    onSuccess: (r) => {
      toast('수집 완료', r.map((x) => `${SOURCE_LABEL[x.source]} ${runLabel(x)}`).join(' / '));
    },
    onError: (e) => toast(errMsg(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  if (!src.data || !me.data) return <Loading />;
  const isSuper = me.data.role === 'SUPER_ADMIN';
  const busy = run.isPending || src.data.running;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">외부 공고 수집</p>
          <p className="text-sm text-sub">매일 오전 6시 자동 수집 · 수집 공고는 바로 게시 · 삭제하면 마감 처리(다시 안 올라옴)</p>
        </div>
        {isSuper && (
          <Button disabled={busy} onClick={() => run.mutate(undefined)}>
            {busy ? '수집 중…' : '전체 지금 수집'}
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs text-sub">
            <tr>
              <th className="px-4 py-3">소스</th>
              <th className="px-3">상태</th>
              <th className="px-3">게시 중</th>
              <th className="px-3">최근 수집</th>
              <th className="px-3" />
            </tr>
          </thead>
          <tbody>
            {src.data.sources.map((s) => (
              <tr key={s.key} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{s.name}</td>
                <td className="px-3">{s.enabled ? <Chip tone="green">사용</Chip> : <Chip>{s.disabledReason ?? '꺼짐'}</Chip>}</td>
                <td className="px-3">{s.activeCount}</td>
                <td className="px-3 text-xs">
                  {s.lastRun ? (
                    <>
                      <p>{dateTime(s.lastRun.startedAt)}</p>
                      <p className={s.lastRun.error ? 'text-danger' : 'text-sub'}>{runLabel(s.lastRun)}</p>
                    </>
                  ) : (
                    <span className="text-sub">없음</span>
                  )}
                </td>
                <td className="px-3 text-right">
                  {isSuper && (
                    <Button size="sm" variant="outline" disabled={busy || !s.enabled} onClick={() => run.mutate(s.key)}>
                      수집
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-bold">수집 기록</p>
        {!runs.data?.length ? (
          <Empty>기록 없음</Empty>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <table className="w-full text-sm">
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id} className="border-t border-line first:border-t-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">{dateTime(r.startedAt)}</td>
                    <td className="px-3">{SOURCE_LABEL[r.source]}</td>
                    <td className="px-3">
                      <Chip tone={r.trigger === 'SCHEDULE' ? 'gray' : 'dark'}>{r.trigger === 'SCHEDULE' ? '자동' : '수동'}</Chip>
                    </td>
                    <td className={`px-3 text-xs ${r.error ? 'text-danger' : 'text-sub'}`}>{r.finishedAt ? runLabel(r) : '진행 중'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
