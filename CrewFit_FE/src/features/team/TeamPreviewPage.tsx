import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Heart, Lock, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import type { Me, TeamDetail } from '../../api/types';
import { useMe } from '../../auth/auth';
import { Avatar, Button, Card, Chip, CTABar, errMsg, inputCls, Loading, Radio, Screen, SectionTitle, Sheet, Thumb, TopBar, useToast } from '../../components/ui';
import { categoryColor, cx, dDayLabel, majorYear, shortDate } from '../../lib/format';

/** T-01 팀 미리보기 · T-02 참여 요청 */
export function TeamPreviewPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const { data: t, isLoading } = useQuery({ queryKey: ['team', id], queryFn: () => api.get<TeamDetail>(`/teams/${id}`) });

  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState<number>();
  const [message, setMessage] = useState('');

  const apply = useMutation({
    mutationFn: () => api.post(`/teams/${id}/applications`, { roleId, message }),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['team', id] });
      toast('참여 요청을 보냈어요', '방장이 수락하면 채팅방에 들어가요');
    },
    onError: (e) => toast(errMsg(e)),
  });
  const like = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/teams/${id}/like`) : api.delete(`/teams/${id}/like`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading || !t) return <Loading />;
  const d = Math.ceil((new Date(t.contest.deadline).getTime() - Date.now()) / 86_400_000);
  const leader = t.members.find((m) => m.isLeader);
  const openRoles = t.roles.filter((r) => r.open > 0);
  const pending = t.me.pendingInvitation;

  const cta = t.me.isMember ? (
    <Button size="lg" className="w-full" onClick={() => nav(`/chats/${id}`)}>
      채팅방으로
    </Button>
  ) : pending ? (
    <Button size="lg" className="w-full" disabled>
      {pending.type === 'APPLY' ? '참여 요청 보냄 · 방장 확인 중' : '이 팀에서 제안이 왔어요 · 채팅 탭에서 확인'}
    </Button>
  ) : t.status !== 'RECRUITING' || !openRoles.length ? (
    <Button size="lg" className="w-full" disabled>
      모집이 끝난 팀이에요
    </Button>
  ) : (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        setRoleId(openRoles[0]?.id);
        setOpen(true);
      }}
    >
      참여 요청하기
    </Button>
  );

  return (
    <Screen bottom={<CTABar>{cta}</CTABar>}>
      <TopBar
        title="팀 미리보기"
        sub={t.name}
        right={
          <button onClick={() => like.mutate(!t.isLiked)} className="flex items-center gap-1 px-2 text-sm text-sub" aria-label="좋아요">
            <Heart size={20} className={t.isLiked ? 'fill-danger text-danger' : 'text-sub'} />
            {t.likeCount}
          </button>
        }
      />
      <div className="flex flex-col gap-3 px-5">
        <Card>
          <div className="flex items-center gap-3">
            <span className={cx('grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white', categoryColor(t.contest.categoryLabel))}>{t.contest.categoryLabel}</span>
            <div className="min-w-0">
              <p className="text-xs text-muted">{t.contest.submitTo}</p>
              <p className="truncate text-lg font-bold">{t.contest.title}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="red">{dDayLabel(d)}</Chip>
            <Chip>
              팀 {t.contest.minTeamSize}~{t.contest.maxTeamSize}명
            </Chip>
            <Chip>접수 ~{shortDate(t.contest.deadline)}</Chip>
          </div>
          <div className="my-3 h-px bg-line" />
          <div className="flex items-center gap-2.5">
            <Thumb label={t.name.slice(0, 2)} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                {t.name} {t.badgeHidden && <Chip>배지 숨김 방</Chip>}
              </p>
              <p className="truncate text-xs text-sub">방장 {leader ? `${leader.name} · ${majorYear(leader.major, leader.admissionYear)}` : ''}</p>
            </div>
            <Chip tone="green">
              참여 {t.memberCount}/{t.capacity}명
            </Chip>
          </div>
          {t.description && <p className="mt-3 text-sm whitespace-pre-wrap text-sub">{t.description}</p>}
          <Button variant="outline" className="mt-3 w-full" onClick={() => nav(`/contests/${t.contest.id}`)}>
            대회 상세 보기 <ChevronRight size={16} />
          </Button>
        </Card>

        <Card>
          <SectionTitle>역할 자리</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {t.roles.flatMap((r) =>
              Array.from({ length: r.capacity }).map((_, i) => {
                const m = r.members[i];
                return (
                  <div key={`${r.id}-${i}`} className={cx('rounded-xl p-3', m ? 'bg-canvas' : 'border border-dashed border-primary')}>
                    <p className={cx('text-sm font-semibold', !m && 'text-primary')}>{r.name}</p>
                    <p className="text-xs text-sub">{m ? `${m.name}${m.isLeader ? ' (방장)' : ''}` : '비어 있음'}</p>
                  </div>
                );
              }),
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle>참여 중인 사람</SectionTitle>
          <div className="flex flex-col gap-3">
            {t.members.map((m) => (
              <button key={m.id} onClick={() => nav(`/users/${m.id}`)} className="flex items-center gap-2.5 text-left">
                <Avatar name={m.name} src={m.picture} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-sub">
                    {[majorYear(m.major, m.admissionYear), m.role?.name, m.isLeader && '방장'].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {!t.badgeHidden && (
                  <Chip tone="amber">
                    {m.completionRate !== null ? `완주율 ${m.completionRate}%` : '첫 참여'} · 배지 {m.badgeCount ?? 0}
                  </Chip>
                )}
                <ChevronRight size={16} className="text-muted" />
              </button>
            ))}
          </div>
        </Card>

        {!t.me.isMember && (
          <Card>
            <SectionTitle>최근 대화</SectionTitle>
            {t.recentMessage && (
              <p className="inline-block rounded-xl bg-canvas px-3 py-2 text-sm">
                {t.recentMessage.senderName ?? '알림'}: {t.recentMessage.content}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Lock size={14} /> 참여하면 전체 대화를 볼 수 있어요
            </p>
          </Card>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="참여 요청 보내기" sub="방장이 수락하면 채팅방에 들어가요">
        <p className="mb-2 text-sm font-semibold">어떤 역할로 참여할까요?</p>
        <div className="flex flex-col gap-2">
          {openRoles.map((r) => (
            <button key={r.id} onClick={() => setRoleId(r.id)} className={cx('flex items-center gap-3 rounded-xl border p-3.5', roleId === r.id ? 'border-primary bg-primary-soft' : 'border-line')}>
              <Radio checked={roleId === r.id} />
              <span className="flex-1 text-left text-[15px] font-medium">{r.name}</span>
              <span className="text-xs text-sub">{r.open}자리 남음</span>
            </button>
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm font-semibold">한 줄 소개</p>
        <input className={inputCls} maxLength={300} placeholder="끝까지 같이 해요!" value={message} onChange={(e) => setMessage(e.target.value)} />
        <MyProfileHint me={me} />
        <Button size="lg" className="mt-4 w-full" disabled={!roleId || apply.isPending} onClick={() => apply.mutate()}>
          요청 보내기
        </Button>
      </Sheet>
    </Screen>
  );
}

function MyProfileHint({ me }: { me?: Me }) {
  if (!me) return null;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-sub">
      <Star size={14} className="text-accent" />
      내 프로필(완주율 {me.stats.completionRate ?? '—'}% · 배지 {me.stats.badgeCount}개)이 방장에게 함께 보내져요
    </p>
  );
}
