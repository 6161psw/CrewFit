import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Heart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, qs } from '../../api/client';
import type { ContestDetail, Page, TeamCard as Team } from '../../api/types';
import { Chip, Empty, Loading, Screen, TopBar } from '../../components/ui';
import { categoryColor, cx, dDayLabel, shortDate } from '../../lib/format';
import { TeamCard } from '../home/cards';

/** H-03 공모전 상세 */
export function ContestDetailPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'teams' | 'info'>('teams');

  const { data: c, isLoading } = useQuery({ queryKey: ['contest', id], queryFn: () => api.get<ContestDetail>(`/contests/${id}`) });
  const teams = useQuery({ queryKey: ['teams', 'contest', id], queryFn: () => api.get<Page<Team>>(`/teams${qs({ contestId: id, limit: 50 })}`) });

  const heart = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/contests/${id}/interest`) : api.delete(`/contests/${id}/interest`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contest', id] });
      qc.invalidateQueries({ queryKey: ['contests'] });
    },
  });

  if (isLoading || !c) return <Loading />;
  const scope = c.scope === 'SCHOOL' ? '교내' : c.scope === 'REGION' ? '연합' : '전국';

  return (
    <Screen>
      <TopBar title="대회 상세" />
      <div className="flex flex-col gap-3 px-5">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className={cx('mt-2 grid size-14 shrink-0 place-items-center rounded-xl text-sm font-bold text-white', categoryColor(c.categoryLabel))}>{c.categoryLabel}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                {c.organizer} · {scope}
              </p>
              <p className="mt-0.5 text-lg leading-snug font-bold">{c.title}</p>
            </div>
            <div className="flex flex-col items-center">
              <button onClick={() => heart.mutate(!c.isInterested)} className="grid size-11 place-items-center rounded-full bg-danger-soft" aria-label="관심">
                <Heart size={22} className={c.isInterested ? 'fill-danger text-danger' : 'text-danger'} />
              </button>
              <button onClick={() => nav(`/contests/${id}/interested`)} className="mt-1 text-xs font-semibold text-sub underline-offset-2 hover:underline">
                {c.interestCount}명 관심 ›
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="red">{dDayLabel(c.dDay)}</Chip>
            <Chip>
              팀 {c.minTeamSize}~{c.maxTeamSize}명
            </Chip>
            <Chip>접수 ~{shortDate(c.deadline)}</Chip>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-[13px] text-primary">
            <FileText size={16} className="mt-0.5 shrink-0" />
            제출 서류는 크루핏이 모아서 {c.submitTo}로 바로 보내요
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {c.myTeam ? (
            <button onClick={() => nav(`/chats/${c.myTeam!.id}`)} className="col-span-2 rounded-2xl bg-primary p-3.5 text-left text-white">
              <p className="font-semibold">내 팀: {c.myTeam.name}</p>
              <p className="text-xs text-white/80">채팅방으로 이동</p>
            </button>
          ) : (
            <>
              <button onClick={() => nav(`/teams/new?contestId=${id}`)} className="rounded-2xl bg-primary p-3.5 text-left text-white">
                <p className="font-semibold">＋ 새 팀 만들기</p>
                <p className="text-xs text-white/80">내가 방장으로 모집</p>
              </button>
              <div className="rounded-2xl border border-line bg-surface p-3.5">
                <p className="font-semibold">↓ 팀에 들어가기</p>
                <p className="text-xs text-sub">아래 모집 중인 팀 {teams.data?.total ?? 0}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-5 border-b border-line">
          {(['teams', 'info'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cx('pb-2 text-[15px]', tab === t ? 'border-b-2 border-primary font-bold' : 'text-sub')}>
              {t === 'teams' ? `모집 중인 팀 ${teams.data?.total ?? 0}` : '대회 정보'}
            </button>
          ))}
        </div>

        {tab === 'teams' ? (
          teams.data?.items.length ? (
            teams.data.items.map((t) => <TeamCard key={t.id} t={t} showContest={false} />)
          ) : (
            <Empty>첫 팀을 만들어 보세요</Empty>
          )
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="whitespace-pre-wrap text-sub">{c.description || '대회 안내가 아직 없어요'}</p>
            {c.linkUrl && (
              <a href={c.linkUrl} target="_blank" rel="noreferrer" className="mt-3 block font-semibold text-primary">
                공고 원문 보기 ›
              </a>
            )}
            <p className="mt-4 mb-2 font-semibold">팀 확정 후 낼 서류</p>
            <div className="flex flex-wrap gap-1.5">
              {c.requiredDocuments.map((d) => (
                <Chip key={d.id} tone={d.type === 'FILE' || d.type === 'CONSENT' ? 'amber' : 'green'}>
                  {d.title}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
