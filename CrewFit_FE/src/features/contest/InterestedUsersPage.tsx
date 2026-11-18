import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { api, qs } from '../../api/client';
import type { ContestDetail, UserSummary } from '../../api/types';
import { Chip, Empty, errMsg, Loading, Screen, TopBar } from '../../components/ui';
import { majorYear } from '../../lib/format';
import { PersonRow } from '../home/cards';

type Filter = 'all' | 'school' | 'region';
interface Res {
  counts: Record<Filter, number>;
  items: UserSummary[];
  total: number;
}

/** H-04 관심 있는 사람 (같은 공고에 관심 표시한 사람끼리만) */
export function InterestedUsersPage() {
  const id = Number(useParams().id);
  /** 채팅방 '팀원 찾기'에서 온 경우 제안할 팀 */
  const teamId = useSearchParams()[0].get('teamId');
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [skill, setSkill] = useState('');

  const contest = useQuery({ queryKey: ['contest', id], queryFn: () => api.get<ContestDetail>(`/contests/${id}`) });
  const { data, isLoading, error } = useQuery({
    queryKey: ['interested', id, filter, skill],
    queryFn: () => api.get<Res>(`/contests/${id}/interested-users${qs({ filter, skill: skill.trim(), limit: 100 })}`),
  });

  return (
    <Screen>
      <TopBar title={`관심 있는 사람 ${data?.counts.all ?? ''}명`} sub={contest.data?.title} />
      <div className="px-5 pb-3">
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
          <Search size={18} className="text-muted" />
          <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="기술 스택 검색 (예: Flutter)" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <div className="mt-3 flex gap-1.5">
          {(
            [
              ['all', '전체'],
              ['school', '우리 학교'],
              ['region', '내 지역'],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={filter === v} onClick={() => setFilter(v)} className="px-2.5 py-1">
              {l} {data?.counts[v] ?? ''}
            </Chip>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <Empty>{errMsg(error)}</Empty>
      ) : data?.items.length ? (
        <div className="border-t border-line">
          {data.items.map((u) => (
            <PersonRow
              key={u.id}
              name={u.name}
              picture={u.picture}
              line={[u.school?.shortName, majorYear(u.major, u.admissionYear)].filter(Boolean).join(' · ')}
              skills={u.skills}
              stat={u.completionRate !== null ? `완주율 ${u.completionRate}%` : null}
              onClick={() => nav(`/users/${u.id}?contestId=${id}${teamId ? `&teamId=${teamId}` : ''}`)}
            />
          ))}
        </div>
      ) : (
        <Empty>아직 관심 표시한 사람이 없어요</Empty>
      )}
    </Screen>
  );
}
