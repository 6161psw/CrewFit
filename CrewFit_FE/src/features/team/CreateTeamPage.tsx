import { useMutation, useQuery } from '@tanstack/react-query';
import { Minus, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api, qs } from '../../api/client';
import type { ContestCard, ContestDetail, Page, TeamDetail } from '../../api/types';
import { Button, Chip, CTABar, errMsg, Field, inputCls, Screen, TopBar, useToast } from '../../components/ui';
import { cx } from '../../lib/format';

/** E-01 팀 만들기 */
export function CreateTeamPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const fixed = Number(params.get('contestId')) || undefined;

  const [contestId, setContestId] = useState<number | undefined>(fixed);
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<{ name: string; capacity: number }[]>([{ name: '', capacity: 1 }]);
  const [myRole, setMyRole] = useState('기획');
  const [badgeHidden, setBadgeHidden] = useState(false);

  const contests = useQuery({ queryKey: ['contests', 'all-open'], queryFn: () => api.get<Page<ContestCard>>(`/contests${qs({ limit: 100 })}`) });
  const contest = useQuery({ queryKey: ['contest', contestId], queryFn: () => api.get<ContestDetail>(`/contests/${contestId}`), enabled: !!contestId });

  useEffect(() => {
    if (!contestId && contests.data?.items[0]) setContestId(contests.data.items[0].id);
  }, [contests.data, contestId]);

  const validRoles = roles.filter((r) => r.name.trim());
  const total = validRoles.reduce((n, r) => n + r.capacity, 0) + (validRoles.some((r) => r.name.trim() === myRole.trim()) ? 0 : 1);
  const max = contest.data?.maxTeamSize ?? 5;

  const create = useMutation({
    mutationFn: () => api.post<TeamDetail>('/teams', { contestId, name: name.trim(), roles: validRoles, myRole: myRole.trim(), badgeHidden }),
    onSuccess: (t) => {
      toast('모집 채팅방을 열었어요');
      nav(`/chats/${t.id}`, { replace: true });
    },
    onError: (e) => toast(errMsg(e)),
  });

  const setRole = (i: number, patch: Partial<{ name: string; capacity: number }>) => setRoles((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Screen
      bottom={
        <CTABar hint={total > max ? `이 대회는 최대 ${max}명이에요 (지금 ${total}명)` : undefined}>
          <Button size="lg" className="w-full" disabled={!contestId || !name.trim() || !validRoles.length || !myRole.trim() || total > max || create.isPending} onClick={() => create.mutate()}>
            모집 채팅방 열기
          </Button>
        </CTABar>
      }
    >
      <TopBar
        title="팀 만들기"
        sub="모집 채팅방을 열어 팀원을 모아요"
        back={false}
        right={
          <button onClick={() => nav(-1)} aria-label="닫기" className="p-1">
            <X size={24} />
          </button>
        }
      />
      <div className="flex flex-col gap-5 px-5">
        <Field label="어떤 대회에 나가나요?">
          <select className={inputCls} value={contestId ?? ''} disabled={!!fixed} onChange={(e) => setContestId(Number(e.target.value))}>
            {fixed && contest.data && <option value={fixed}>{contest.data.title}</option>}
            {contests.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="모집 채팅방 이름">
          <input className={inputCls} placeholder="AI 식단팀 모집방" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-sub">구하는 역할</p>
          <div className="flex flex-col gap-2">
            {roles.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5">
                <input className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" placeholder="예: 앱 개발" value={r.name} maxLength={20} onChange={(e) => setRole(i, { name: e.target.value })} />
                <div className="flex items-center gap-2 rounded-full bg-canvas px-2 py-1">
                  <button aria-label="줄이기" onClick={() => (r.capacity > 1 ? setRole(i, { capacity: r.capacity - 1 }) : setRoles((rs) => rs.filter((_, j) => j !== i)))}>
                    <Minus size={14} />
                  </button>
                  <span className="w-4 text-center text-sm font-semibold">{r.capacity}</span>
                  <button aria-label="늘리기" onClick={() => setRole(i, { capacity: r.capacity + 1 })}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setRoles((rs) => [...rs, { name: '', capacity: 1 }])} className="rounded-xl border border-dashed border-primary py-3 text-sm font-semibold text-primary">
              + 역할 추가
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-sub">내 역할</p>
          <div className="flex flex-wrap gap-1.5">
            {['기획', ...validRoles.map((r) => r.name.trim())]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((r) => (
                <Chip key={r} active={myRole === r} onClick={() => setMyRole(r)} className="px-2.5 py-1">
                  {r} {myRole === r && '✓'}
                </Chip>
              ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5">
          <input type="checkbox" className="mt-1 accent-[var(--color-primary)]" checked={badgeHidden} onChange={(e) => setBadgeHidden(e.target.checked)} />
          <span>
            <span className="block text-sm font-semibold">배지 숨김 방으로 열기</span>
            <span className="block text-xs text-sub">완주 배지 없이 경험 쌓으려는 사람도 편하게</span>
          </span>
        </label>

        {contest.data && (
          <div className="rounded-xl bg-primary-soft p-3.5">
            <p className="mb-2 text-[13px] font-semibold text-primary">팀 확정 후 낼 서류 (이 대회 기준)</p>
            <div className="flex flex-wrap gap-1.5">
              {contest.data.requiredDocuments.map((d) => (
                <span key={d.id} className={cx('rounded-full px-2.5 py-1 text-xs', d.type === 'FILE' || d.type === 'CONSENT' ? 'bg-accent-soft' : 'bg-surface')}>
                  {d.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
