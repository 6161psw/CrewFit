import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, download, qs } from '../../api/client';
import { Button, Chip, Empty, errMsg, Loading, Modal, useToast } from '../../components/ui';
import { cx, dateTime } from '../../lib/format';
import type { AdminContest, ForwardBatch, ForwardPreview } from './types';

/** W-06 운영사 전달 · W-07 전달 완료 */
export function AdminForwardPage() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const contests = useQuery({ queryKey: ['admin', 'contests'], queryFn: () => api.get<AdminContest[]>('/admin/contests') });
  const contestId = Number(params.get('contestId')) || contests.data?.[0]?.id;
  const [format, setFormat] = useState<'OPERATOR' | 'SCHOOL'>('OPERATOR');
  const [done, setDone] = useState<ForwardBatch | null>(null);

  const preview = useQuery({
    queryKey: ['admin', 'forward', contestId, format],
    queryFn: () => api.get<ForwardPreview>(`/admin/contests/${contestId}/forward/preview${qs({ format })}`),
    enabled: !!contestId,
  });
  const batches = useQuery({ queryKey: ['admin', 'batches'], queryFn: () => api.get<ForwardBatch[]>('/admin/forward-batches') });

  const forward = useMutation({
    mutationFn: () => api.post<ForwardBatch>(`/admin/contests/${contestId}/forward`, { format }),
    onSuccess: (b) => {
      setDone(b);
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast(errMsg(e)),
  });
  const revert = useMutation({
    mutationFn: (id: number) => api.post(`/admin/forward-batches/${id}/revert`),
    onSuccess: () => {
      setDone(null);
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast('전달을 되돌렸어요');
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (contests.isLoading) return <Loading />;
  if (!contestId) return <Empty>등록된 공고가 없어요</Empty>;
  const p = preview.data;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-2xl font-bold">운영사 전달</p>
        <select className="rounded-xl border border-line bg-surface px-3 py-2 text-sm" value={contestId} onChange={(e) => setParams({ contestId: e.target.value })}>
          {contests.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6">
        {!p ? (
          <Loading />
        ) : (
          <>
            <p className="text-lg font-bold">승인한 {p.teamCount}팀 명단을 운영사에 전달할까요?</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Box label="승인 팀" value={`${p.teamCount}팀`} />
              <Box label="학생" value={`${p.studentCount}명`} />
              <Box label="받는 곳" value={p.recipient.name} sub={p.recipient.email ?? '메일 미등록 · 파일로 전달'} />
            </div>
            <p className="mt-5 mb-2 text-sm font-semibold">파일 양식</p>
            <div className="flex gap-2">
              {(
                [
                  ['OPERATOR', '운영사 양식 (최소 항목)'],
                  ['SCHOOL', '학교 양식 (전체 항목)'],
                ] as const
              ).map(([v, l]) => (
                <Chip key={v} active={format === v} onClick={() => setFormat(v)} className="px-3 py-1.5 text-sm">
                  {format === v && '✓ '}
                  {l}
                </Chip>
              ))}
            </div>
            <table className="mt-5 w-full text-sm">
              <thead className="bg-canvas text-left text-xs text-sub">
                <tr>
                  <th className="rounded-l-lg px-3 py-2 font-medium">팀</th>
                  <th className="px-3 font-medium">팀장</th>
                  <th className="px-3 font-medium">연락처</th>
                  <th className="px-3 font-medium">인원</th>
                  <th className="rounded-r-lg px-3 font-medium">서류</th>
                </tr>
              </thead>
              <tbody>
                {p.teams.map((t) => (
                  <tr key={t.submissionId} className="border-b border-line">
                    <td className="px-3 py-2.5 font-semibold">{t.teamName}</td>
                    <td className="px-3">{t.leaderName}</td>
                    <td className="px-3 text-sub">{t.contact}</td>
                    <td className="px-3">{t.memberCount}명</td>
                    <td className="px-3">{t.documentCount}종</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.moreTeams > 0 && <p className="mt-2 text-xs text-sub">… 외 {p.moreTeams}팀</p>}
            {format === 'OPERATOR' && <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">개인정보 최소 항목만 전달 (학번·학과 제외, 연락처는 팀장만)</p>}
            <Button size="lg" className="mt-5 w-full" disabled={!p.teamCount || forward.isPending} onClick={() => forward.mutate()}>
              {p.teamCount}팀 전달하기
            </Button>
          </>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <p className="mb-3 font-bold">전달 기록</p>
        {batches.data?.length ? (
          <div className="flex flex-col divide-y divide-line">
            {batches.data.map((b) => (
              <div key={b.id} className={cx('flex items-center gap-3 py-3 text-sm', b.revertedAt && 'opacity-50')}>
                <div className="flex-1">
                  <p className="font-semibold">
                    {b.contest?.title} → {b.recipientName}
                  </p>
                  <p className="text-xs text-sub">
                    {dateTime(b.createdAt)} · {b.teamCount}팀 {b.studentCount}명 · {b.format === 'OPERATOR' ? '운영사 양식' : '학교 양식'}
                    {b.revertedAt && ' · 되돌림'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(`/admin/forward-batches/${b.id}/file`, `전달_${b.id}.csv`)}>
                  파일
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">아직 전달 기록이 없어요</p>
        )}
      </section>

      <Modal open={!!done} onClose={() => setDone(null)} title="" width={420}>
        {done && (
          <div className="text-center">
            <CheckCircle2 size={56} className="mx-auto fill-primary text-white" />
            <p className="mt-3 text-xl font-bold">{done.teamCount}팀 전달 완료</p>
            <p className="mt-1 text-sm text-sub">
              {done.teamCount}팀 명단을 운영사 {done.recipientName}에 전달했어요
            </p>
            <p className="text-xs text-muted">
              {dateTime(done.createdAt)} · {done.format === 'OPERATOR' ? '운영사 양식' : '학교 양식'}
            </p>
            <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-xs text-sub">학생 앱에도 ‘운영사 전달’ 상태로 표시돼요. 메일 자동 발송 전까지는 파일을 받아 운영사에 보내 주세요.</p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" disabled={revert.isPending} onClick={() => revert.mutate(done.id)}>
                되돌리기
              </Button>
              <Button className="flex-1" onClick={() => download(`/admin/forward-batches/${done.id}/file`, `전달_${done.id}.csv`)}>
                파일 받기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Box({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-canvas p-4">
      <p className="text-xs text-sub">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
