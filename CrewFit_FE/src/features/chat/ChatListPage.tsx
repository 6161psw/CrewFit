import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import type { Invitation, TeamCard, TeamStatus } from '../../api/types';
import { BottomNav } from '../../components/BottomNav';
import { Avatar, Button, Chip, Empty, errMsg, Loading, Screen, Thumb, useToast } from '../../components/ui';
import { chatTime, cx, majorYear } from '../../lib/format';

type Tab = 'joined' | 'received' | 'sent';
const STATUS: Partial<Record<TeamStatus, [string, 'green' | 'amber' | 'gray']>> = {
  RECRUITING: ['모집 중', 'green'],
  CONFIRMED: ['팀 확정', 'amber'],
  SUBMITTED: ['제출 완료', 'gray'],
  COMPLETED: ['완주', 'green'],
};

/** E-02 채팅 탭 · 받은 제안 */
export function ChatListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('joined');

  const mine = useQuery({ queryKey: ['teams', 'me'], queryFn: () => api.get<{ teams: TeamCard[]; counts: Record<string, number> }>('/teams/me') });
  const received = useQuery({ queryKey: ['invitations', 'received'], queryFn: () => api.get<Invitation[]>('/invitations?box=received&status=PENDING') });
  const sent = useQuery({ queryKey: ['invitations', 'sent'], queryFn: () => api.get<Invitation[]>('/invitations?box=sent&status=PENDING') });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'accept' | 'reject' | 'cancel' }) => api.post<{ teamId?: number }>(`/invitations/${id}/${action}`),
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      if (v.action === 'accept') toast('수락했어요', '팀 채팅방에서 인사해 보세요');
    },
    onError: (e) => toast(errMsg(e)),
  });

  const counts = { joined: mine.data?.teams.length ?? 0, received: received.data?.length ?? 0, sent: sent.data?.length ?? 0 };

  return (
    <Screen bottom={<BottomNav chatDot={counts.received > 0} />}>
      <div className="px-5 pt-4 pb-3">
        <p className="text-[22px] font-bold">채팅</p>
        <div className="mt-3 flex gap-1.5">
          {(
            [
              ['joined', '참여 중'],
              ['received', '받은 제안·요청'],
              ['sent', '요청 보냄'],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} active={tab === v} tone={v === 'received' && counts.received ? 'amber' : 'gray'} onClick={() => setTab(v)} className="px-2.5 py-1">
              {l} {counts[v]}
            </Chip>
          ))}
        </div>
      </div>

      {tab === 'joined' &&
        (mine.isLoading ? (
          <Loading />
        ) : mine.data?.teams.length ? (
          <div className="border-t border-line">
            {mine.data.teams.map((t) => {
              const [label, tone] = STATUS[t.status] ?? ['', 'gray'];
              return (
                <button key={t.id} onClick={() => nav(`/chats/${t.id}`)} className="flex w-full items-center gap-3 border-b border-line bg-surface px-5 py-3.5 text-left">
                  <Thumb label={t.name.slice(0, 2)} size={48} className="bg-primary text-white" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-bold">{t.name}</span>
                      <Chip tone={tone}>{label}</Chip>
                    </span>
                    <span className="block truncate text-[13px] text-sub">{t.lastMessage ? `${t.lastMessage.senderName ?? '알림'}: ${t.lastMessage.content}` : t.contest.title}</span>
                  </span>
                  <span className="text-[11px] text-muted">{chatTime(t.lastMessage?.createdAt)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <Empty>아직 참여 중인 팀이 없어요</Empty>
        ))}

      {tab !== 'joined' &&
        ((tab === 'received' ? received : sent).data?.length ? (
          <div className="flex flex-col gap-3 px-5">
            {(tab === 'received' ? received : sent).data!.map((inv) => (
              <InvitationCard key={inv.id} inv={inv} busy={act.isPending} onAct={(action) => act.mutate({ id: inv.id, action })} onTeam={() => nav(`/teams/${inv.team.id}`)} onUser={() => nav(`/users/${inv.user.id}`)} />
            ))}
          </div>
        ) : (
          <Empty>{tab === 'received' ? '받은 제안·요청이 없어요' : '보낸 요청이 없어요'}</Empty>
        ))}
    </Screen>
  );
}

function InvitationCard({ inv, busy, onAct, onTeam, onUser }: { inv: Invitation; busy: boolean; onAct: (a: 'accept' | 'reject' | 'cancel') => void; onTeam: () => void; onUser: () => void }) {
  const offerToMe = inv.type === 'OFFER' && inv.direction === 'received';
  const applyToMyTeam = inv.type === 'APPLY' && inv.direction === 'received';
  const title = offerToMe
    ? `${inv.team.leader.name}님이 팀에 제안했어요`
    : applyToMyTeam
      ? `${inv.user.name}님이 참여를 요청했어요`
      : inv.type === 'APPLY'
        ? `${inv.team.name}에 참여 요청`
        : `${inv.user.name}님에게 제안`;
  return (
    <div className={cx('rounded-2xl border p-4', inv.direction === 'received' ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface')}>
      <button onClick={applyToMyTeam ? onUser : onTeam} className="flex w-full items-center gap-3 text-left">
        <Avatar name={applyToMyTeam ? inv.user.name : inv.team.leader.name} src={applyToMyTeam ? inv.user.picture : null} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className="block truncate text-xs text-sub">
            {inv.team.name} · ‘{inv.role?.name}’ 자리{applyToMyTeam && ` · ${majorYear(inv.user.major, inv.user.admissionYear)}`}
          </span>
        </span>
        <ChevronRight size={16} className="text-muted" />
      </button>
      {inv.message && <p className="mt-3 text-sm">“{inv.message}”</p>}
      <div className="mt-3 flex gap-2">
        {inv.direction === 'received' ? (
          <>
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onAct('reject')}>
              거절
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => onAct('accept')}>
              수락하기
            </Button>
          </>
        ) : (
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onAct('cancel')}>
            요청 취소
          </Button>
        )}
      </div>
    </div>
  );
}
