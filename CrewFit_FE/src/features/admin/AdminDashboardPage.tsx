import { useQuery } from '@tanstack/react-query';
import { FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, download } from '../../api/client';
import { Button, Chip, Loading, Thumb } from '../../components/ui';
import { ago, cx, dDayLabel } from '../../lib/format';
import type { Dashboard } from './types';

/** W-02 대시보드 */
export function AdminDashboardPage() {
  const nav = useNavigate();
  const { data: d, isLoading } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api.get<Dashboard>('/admin/dashboard'), refetchInterval: 30_000 });
  if (isLoading || !d) return <Loading />;
  const maxDay = Math.max(1, ...d.last7Days.map((x) => x.count));
  const first = d.contests[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold">안녕하세요, {d.admin.name} 선생님</p>
          <p className="mt-1 text-sm text-sub">
            오늘 새로 접수된 팀 {d.today.newSubmissions}팀 · 검토가 필요한 팀 {d.today.needReview}팀이 있어요
          </p>
        </div>
        <div className="flex gap-2">
          {first && (
            <Button variant="outline" onClick={() => download(`/admin/contests/${first.id}/export.csv`, '지원명단.csv')}>
              엑셀로 내보내기
            </Button>
          )}
          <Button onClick={() => nav('/admin/contests/new')}>+ 공고 등록</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="진행 중인 대회" value={`${d.activeContests.total}개`} sub={`교내 ${d.activeContests.school} · 연합 ${d.activeContests.region}`} />
        <Stat label="이번 학기 접수 팀" value={`${d.semester.teams}팀`} sub={`지원 학생 ${d.semester.students}명`} />
        <Stat label="검토 대기" value={`${d.review.count}팀`} sub={d.review.oldestSubmittedAt ? `가장 오래된 접수 ${ago(d.review.oldestSubmittedAt)}` : '모두 처리했어요'} dot />
        <Stat label="운영사 전달 완료" value={`${d.forwarded.teams}팀`} sub={d.forwarded.latest ? `${d.forwarded.latest.contestTitle} 전달` : '-'} accent />
      </div>

      <div className="mt-6 grid grid-cols-[1fr_340px] gap-6">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex justify-between">
            <p className="text-lg font-bold">대회별 접수 현황</p>
            <button onClick={() => nav('/admin/contests')} className="text-sm text-sub">
              전체 보기
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas text-left text-xs text-sub">
                <th className="rounded-l-lg px-3 py-2 font-medium">대회</th>
                <th className="px-3 font-medium">마감</th>
                <th className="px-3 font-medium">접수 팀</th>
                <th className="px-3 font-medium">서류 완료</th>
                <th className="px-3 font-medium">모집 중</th>
                <th className="rounded-r-lg px-3" />
              </tr>
            </thead>
            <tbody>
              {d.contests.map((c, i) => {
                const pct = c.submittedTeams ? Math.round((c.docsCompleteTeams / c.submittedTeams) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-4">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-xs text-sub">
                        {c.organizer} · {c.scope === 'SCHOOL' ? '교내' : c.scope === 'REGION' ? '연합' : '전국'}
                      </p>
                    </td>
                    <td className="px-3">
                      <Chip tone="red">{dDayLabel(c.dDay)}</Chip>
                    </td>
                    <td className="w-32 px-3">
                      <p className="font-semibold">{c.submittedTeams}팀</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.submittedTeams * 4)}%` }} />
                      </div>
                    </td>
                    <td className="px-3 font-semibold text-primary">{pct}%</td>
                    <td className="px-3">
                      <Chip tone="amber">{c.recruitingTeams}팀</Chip>
                    </td>
                    <td className="px-3 text-right">
                      <Button size="sm" variant={i === 0 ? 'primary' : 'outline'} onClick={() => nav(`/admin/contests/${c.id}/teams`)}>
                        지원 팀 보기
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!d.contests.length && <p className="py-8 text-center text-sm text-muted">진행 중인 대회가 없어요</p>}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
            <FileCheck size={18} />
            이번 학기 서류 {d.autoProcessed.documents}건이 학교 양식으로 자동 정리됐어요 · 재학 확인 {d.autoProcessed.enrollmentReplaced}명은 학교 인증으로 대체
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex justify-between">
            <p className="text-lg font-bold">최근 접수</p>
            <span className="text-xs font-semibold text-primary">● 실시간</span>
          </div>
          <div className="flex flex-col gap-3">
            {d.recent.slice(0, 5).map((r) => (
              <div key={r.submissionId} className="flex items-center gap-3">
                <Thumb label={r.teamName.slice(0, 2)} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.teamName}</p>
                  <p className="truncate text-xs text-sub">
                    {r.contestTitle} · {r.memberCount}명 · {ago(r.submittedAt)}
                  </p>
                </div>
              </div>
            ))}
            {!d.recent.length && <p className="text-sm text-muted">아직 접수가 없어요</p>}
          </div>
          <p className="mt-6 mb-3 text-sm text-sub">최근 7일 접수</p>
          <div className="flex h-32 items-end gap-3">
            {d.last7Days.map((x, i) => (
              <div key={x.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] text-sub">{x.count}</span>
                <div className={cx('w-full rounded', i === 6 ? 'bg-primary' : 'bg-primary-soft')} style={{ height: `${(x.count / maxDay) * 80 + 4}px` }} />
                <span className="text-[10px] text-muted">{new Date(x.date).getMonth() + 1}/{new Date(x.date).getDate()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, dot, accent }: { label: string; value: string; sub: string; dot?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-sm text-sub">{label}</p>
      <p className={cx('mt-2 text-3xl font-bold', accent && 'text-primary')}>{value}</p>
      <p className="mt-2 text-xs text-muted">
        {dot && <span className="mr-1 text-accent">●</span>}
        {sub}
      </p>
    </div>
  );
}
