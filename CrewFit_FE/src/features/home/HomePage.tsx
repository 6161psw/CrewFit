import { useQuery } from '@tanstack/react-query';
import { Bell, Clock, MessageCircle, Plus, Search, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api, qs } from '../../api/client';
import type { ContestCard as Contest, Page, Scope, TeamCard as Team } from '../../api/types';
import { useMe } from '../../auth/auth';
import { BottomNav } from '../../components/BottomNav';
import { Chip, Empty, Loading, ScopeTabs, Screen, SortMenu } from '../../components/ui';
import { cx } from '../../lib/format';
import { ContestCard, TeamCard } from './cards';

type Mode = 'contests' | 'teams';
type ContestSort = 'deadline' | 'popular' | 'recommended';
type TeamSort = 'deadline' | 'recommended' | 'liked' | 'slots';

/** H-01 홈(공모전) · H-02 홈(모집 채팅) */
export function HomePage() {
  const nav = useNavigate();
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) ?? 'contests';
  const scope = (params.get('scope') as Scope) ?? 'school';
  const [q, setQ] = useState('');
  const [cSort, setCSort] = useState<ContestSort>('deadline');
  const [tSort, setTSort] = useState<TeamSort>('deadline');
  const [slots, setSlots] = useState<number | undefined>();

  const set = (k: string, v: string) => setParams((p) => (p.set(k, v), p), { replace: true });

  const contests = useQuery({
    queryKey: ['contests', scope, cSort, q],
    queryFn: () => api.get<Page<Contest>>(`/contests${qs({ scope, sort: cSort, q, limit: 50 })}`),
    enabled: mode === 'contests',
  });
  const teams = useQuery({
    queryKey: ['teams', scope, tSort, slots, q],
    queryFn: () =>
      api.get<Page<Team>>(
        `/teams${qs({
          scope,
          q,
          limit: 50,
          sort: tSort === 'liked' || tSort === 'slots' ? 'latest' : tSort,
          liked: tSort === 'liked' || undefined,
          openSlots: tSort === 'slots' ? slots : undefined,
        })}`,
      ),
    enabled: mode === 'teams',
  });

  const school = me?.school?.shortName ?? '우리 학교';
  const region = me?.school?.region ?? '내 지역';
  const where = scope === 'school' ? school : scope === 'region' ? region : '전국';
  const list = mode === 'contests' ? contests : teams;
  const thisWeek = contests.data?.items.filter((c) => c.dDay >= 0 && c.dDay <= 7).length ?? 0;

  return (
    <Screen bottom={<BottomNav />}>
      <div className="flex h-[60px] items-center gap-2.5 px-5">
        <p className="text-[19px] font-bold text-primary">크루핏</p>
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
          <Search size={18} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="대회·팀·채팅방 검색" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
        </label>
        <Bell size={24} />
      </div>
      <ScopeTabs
        value={scope}
        onChange={(v) => set('scope', v)}
        items={[
          { value: 'school', label: '내 학교', sub: me?.school?.shortName },
          { value: 'region', label: '내 지역', sub: me?.school?.region },
          { value: 'national', label: '전국' },
        ]}
      />

      <div className="flex flex-col gap-3 px-5 pt-1 pb-40">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold">
            {mode === 'contests' ? `${where}에서 열리는 대회` : `${where} 팀원 모집 채팅`} · {list.data?.total ?? 0}
          </p>
          {mode === 'contests' ? (
            <SortMenu
              value={cSort}
              onChange={setCSort}
              options={[
                { value: 'deadline', label: '마감 임박' },
                { value: 'popular', label: '♥ 인기순' },
                { value: 'recommended', label: '✦ AI 추천순' },
              ]}
            />
          ) : (
            <SortMenu
              value={tSort}
              onChange={(v) => {
                setTSort(v);
                if (v === 'slots' && !slots) setSlots(1);
              }}
              options={[
                { value: 'deadline', label: '마감 임박' },
                { value: 'recommended', label: '✦ AI 추천순' },
                { value: 'liked', label: '내 좋아요 ♥' },
                { value: 'slots', label: '모집 인원' },
              ]}
            />
          )}
        </div>

        {mode === 'teams' && tSort === 'slots' && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip key={n} active={slots === n} onClick={() => setSlots(n)} className="px-3 py-1.5">
                {n === 5 ? '5명 이상' : `${n}명`}
              </Chip>
            ))}
          </div>
        )}

        {mode === 'contests' && thisWeek > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[13px] font-medium">
            <Clock size={18} className="text-accent" />
            이번 주 마감 {thisWeek}개
          </div>
        )}

        {list.isLoading ? (
          <Loading />
        ) : mode === 'contests' ? (
          contests.data?.items.length ? (
            contests.data.items.map((c) => <ContestCard key={c.id} c={c} />)
          ) : (
            <Empty>{scope === 'school' && !me?.school ? '학교 인증 후 우리 학교 대회가 보여요' : '아직 대회가 없어요'}</Empty>
          )
        ) : teams.data?.items.length ? (
          teams.data.items.map((t) => <TeamCard key={t.id} t={t} />)
        ) : (
          <Empty>모집 중인 팀이 없어요</Empty>
        )}
      </div>

      {/* FAB: 위 = 공모전/모집 채팅 전환, 아래 = 팀 만들기 */}
      <div className="fixed bottom-28 z-20 flex w-full max-w-[430px] justify-start px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <button onClick={() => set('mode', mode === 'contests' ? 'teams' : 'contests')} className="flex flex-col items-center gap-1">
            <span className="grid size-14 place-items-center rounded-full border border-primary bg-primary-soft text-primary shadow-[0_6px_14px_rgba(13,38,26,0.22)]">
              {mode === 'contests' ? <MessageCircle size={24} /> : <Trophy size={24} />}
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold">{mode === 'contests' ? '모집 채팅' : '공모전'}</span>
          </button>
          <button onClick={() => nav('/teams/new')} className="flex flex-col items-center gap-1">
            <span className={cx('grid size-14 place-items-center rounded-full bg-primary text-white shadow-[0_6px_14px_rgba(13,38,26,0.22)]')}>
              <Plus size={26} />
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary">팀 만들기</span>
          </button>
        </div>
      </div>
    </Screen>
  );
}
