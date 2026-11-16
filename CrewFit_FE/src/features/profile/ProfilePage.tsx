import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import type { Profile, TeamCard } from '../../api/types';
import { Button, Chip, CTABar, Empty, errMsg, inputCls, Loading, Radio, Screen, Sheet, TopBar, useToast } from '../../components/ui';
import { cx } from '../../lib/format';
import { ProfileBadges, ProfileEssay, ProfileHead, ProfileHistory } from './ProfileView';

/** H-05 프로필 상세 · T-07 팀원 프로필 · H-06 팀 제안 · H-07 제안 보냄 */
export function ProfilePage() {
  const id = useParams().id!;
  const [params] = useSearchParams();
  const contestId = Number(params.get('contestId')) || undefined;
  const toast = useToast();
  const { data: p, isLoading, error } = useQuery({ queryKey: ['profile', id], queryFn: () => api.get<Profile>(`/users/${id}`) });
  const myTeams = useQuery({ queryKey: ['teams', 'me'], queryFn: () => api.get<{ teams: TeamCard[] }>('/teams/me') });

  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [teamId, setTeamId] = useState<number>();
  const [roleId, setRoleId] = useState<number>();
  const [message, setMessage] = useState('');

  const leading = (myTeams.data?.teams ?? []).filter((t) => t.isLeader && t.status === 'RECRUITING' && t.openCount > 0 && (!contestId || t.contest.id === contestId));
  const team = leading.find((t) => t.id === teamId);

  const offer = useMutation({
    mutationFn: () => api.post(`/teams/${teamId}/offers`, { userId: id, roleId, message }),
    onSuccess: () => {
      setOpen(false);
      setSent(true);
      toast(`${p?.name}님에게 제안을 보냈어요`, `수락하면 ${team?.name} 채팅방에 들어와요`);
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (isLoading) return <Loading />;
  if (error || !p) return <Empty>{errMsg(error)}</Empty>;

  return (
    <Screen
      bottom={
        leading.length > 0 ? (
          <CTABar>
            <Button size="lg" className="w-full" disabled={sent} onClick={() => setOpen(true)}>
              {sent ? '제안 보냄 · 답을 기다리는 중' : '내 팀에 제안하기'}
            </Button>
          </CTABar>
        ) : undefined
      }
    >
      <TopBar title="프로필" />
      <div className="flex flex-col gap-3 px-5">
        <ProfileHead p={p} />
        <ProfileHistory p={p} />
        <ProfileBadges p={p} />
        <ProfileEssay p={p} />
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={`${p.name}님에게 팀 제안하기`} sub="수락하면 바로 그 팀 채팅방에 들어와요">
        <p className="mb-2 text-[13px] font-semibold text-sub">어느 팀으로 제안할까요? (내가 모집 중인 팀)</p>
        <div className="flex flex-col gap-2">
          {leading.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTeamId(t.id);
                setRoleId(t.openRoles[0]?.id);
              }}
              className={cx('flex items-center gap-3 rounded-xl border p-3.5 text-left', teamId === t.id ? 'border-primary bg-primary-soft' : 'border-line')}
            >
              <Radio checked={teamId === t.id} />
              <span>
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-sub">
                  {t.contest.title} · {t.openCount}명 구해요
                </span>
              </span>
            </button>
          ))}
        </div>
        {team && (
          <>
            <p className="mt-4 mb-2 text-[13px] font-semibold text-sub">맡아 줬으면 하는 역할</p>
            <div className="flex flex-wrap gap-1.5">
              {team.openRoles.map((r) => (
                <Chip key={r.id} active={roleId === r.id} onClick={() => setRoleId(r.id)} className="px-2.5 py-1">
                  {r.name} {roleId === r.id && '✓'}
                </Chip>
              ))}
            </div>
          </>
        )}
        <textarea className={cx(inputCls, 'mt-4 h-20 resize-none text-sm')} placeholder="자소서 잘 읽었어요! ..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button size="lg" className="mt-4 w-full" disabled={!teamId || !roleId || offer.isPending} onClick={() => offer.mutate()}>
          제안 보내기
        </Button>
      </Sheet>
    </Screen>
  );
}
