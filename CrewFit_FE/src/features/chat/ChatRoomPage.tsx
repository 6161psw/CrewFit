import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MoreVertical, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import type { ChatMessage, TeamDetail } from '../../api/types';
import { useMe } from '../../auth/auth';
import { Avatar, Button, errMsg, Loading, Modal, TopBar, useToast } from '../../components/ui';
import { chatTime, cx } from '../../lib/format';
import { useChatSocket } from './useChatSocket';

/** T-03 채팅방 */
export function ChatRoomPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const team = useQuery({ queryKey: ['team', id], queryFn: () => api.get<TeamDetail>(`/teams/${id}`) });
  const history = useQuery({ queryKey: ['messages', id], queryFn: () => api.get<ChatMessage[]>(`/teams/${id}/messages?limit=100`) });

  useEffect(() => {
    if (history.data) setMsgs(history.data);
  }, [history.data]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length]);

  const { connected } = useChatSocket(
    id,
    (m) => setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m])),
    () => qc.invalidateQueries({ queryKey: ['team', id] }),
  );

  const send = useMutation({
    mutationFn: (content: string) => api.post<ChatMessage>(`/teams/${id}/messages`, { content }),
    onSuccess: (m) => {
      setText('');
      setMsgs((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
    },
    onError: (e) => toast(errMsg(e)),
  });
  const confirm = useMutation({
    mutationFn: () => api.post(`/teams/${id}/confirm`),
    onSuccess: () => {
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['team', id] });
      nav(`/teams/${id}/submission`);
    },
    onError: (e) => toast(errMsg(e)),
  });
  const leave = useMutation({
    mutationFn: () => (team.data?.me.isLeader ? api.delete(`/teams/${id}`) : api.post(`/teams/${id}/leave`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      nav('/chats', { replace: true });
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (team.isLoading || !team.data) return <Loading />;
  const t = team.data;
  const full = t.memberCount >= t.contest.minTeamSize;
  const after = t.status !== 'RECRUITING' && t.status !== 'DISBANDED';

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-canvas">
      <TopBar
        title={t.name}
        sub={`${t.memberCount}/${t.capacity}명 · ${t.contest.title}${connected ? '' : ' · 연결 중…'}`}
        onBack={() => nav('/chats')}
        right={
          <button onClick={() => setMenu(true)} aria-label="메뉴" className="p-1">
            <MoreVertical size={22} />
          </button>
        }
      />

      {t.me.isLeader && t.status === 'RECRUITING' && (
        <div className="px-3.5 pb-2">
          <div className="flex items-center gap-3 rounded-2xl border border-primary bg-primary-soft p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{full ? `${t.memberCount}/${t.capacity}명이 모였어요` : `최소 ${t.contest.minTeamSize}명이면 확정할 수 있어요`}</p>
              <p className="text-xs text-sub">확정하면 제출 서류를 여기서 같이 준비해요</p>
            </div>
            <Button size="sm" disabled={!full} onClick={() => setConfirmOpen(true)}>
              팀 확정하기
            </Button>
          </div>
        </div>
      )}
      {after && (
        <div className="px-3.5 pb-2">
          <button onClick={() => nav(`/teams/${id}/submission`)} className="flex w-full items-center gap-3 rounded-2xl border border-accent bg-accent-soft p-3.5 text-left">
            <FileText size={20} className="text-accent" />
            <span className="flex-1 text-sm font-semibold">
              {t.submission?.status === 'REVISION_REQUESTED' ? '보완 요청이 왔어요 · 서류 고치기' : t.status === 'CONFIRMED' ? '팀 확정 · 제출 서류 준비하기' : '제출 서류 · 진행 상태 보기'}
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {msgs.map((m) =>
          m.type === 'SYSTEM' ? (
            <div key={m.id} className="my-2 text-center">
              <span className="inline-block rounded-full bg-line px-2.5 py-1 text-[11px] whitespace-pre-wrap text-sub">{m.content}</span>
            </div>
          ) : m.sender?.id === me?.id ? (
            <div key={m.id} className="my-2 flex items-end justify-end gap-1.5">
              <span className="text-[10px] text-muted">{chatTime(m.createdAt)}</span>
              <p className="max-w-[72%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-white">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="my-2 flex gap-2">
              <Avatar name={m.sender?.name ?? '?'} src={m.sender?.picture} size={30} />
              <div className="max-w-[72%]">
                <p className="mb-1 text-xs text-sub">
                  {m.sender?.name}
                  {m.sender?.id === t.leaderId && ' · 방장'}
                </p>
                <div className="flex items-end gap-1.5">
                  <p className="rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</p>
                  <span className="shrink-0 text-[10px] text-muted">{chatTime(m.createdAt)}</span>
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate(text.trim());
        }}
        className="flex items-center gap-2 border-t border-line bg-surface px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지 보내기" className="flex-1 rounded-full bg-canvas px-4 py-2.5 text-sm outline-none" />
        <button type="submit" disabled={!text.trim() || send.isPending} className={cx('grid size-10 place-items-center rounded-full', text.trim() ? 'bg-primary text-white' : 'bg-line text-muted')} aria-label="보내기">
          <Send size={18} />
        </button>
      </form>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="팀을 확정할까요?" width={400}>
        <div className="flex flex-col gap-2 text-sm">
          {t.members.map((m) => (
            <div key={m.id} className="flex justify-between rounded-lg bg-canvas px-3 py-2">
              <span>
                {m.name}
                {m.id === me?.id && ' (나)'}
              </span>
              <span className="text-sub">{m.role?.name}</span>
            </div>
          ))}
          <p className="mt-1 text-xs text-sub">확정하면 새 팀원을 받을 수 없고, {t.contest.submitTo}에 낼 서류 준비가 시작돼요.</p>
        </div>
        <Button size="lg" className="mt-4 w-full" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
          확정하고 서류 준비하기
        </Button>
      </Modal>

      <Modal open={menu} onClose={() => setMenu(false)} title="채팅방 메뉴" width={360}>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => nav(`/teams/${id}`)}>
            팀 정보 보기
          </Button>
          {t.me.isLeader && t.status === 'RECRUITING' && t.openCount > 0 && (
            <Button variant="outline" onClick={() => nav(`/contests/${t.contest.id}/interested?teamId=${id}`)}>
              팀원 찾기 · 제안 보내기
            </Button>
          )}
          {t.status === 'RECRUITING' && (
            <Button
              variant="danger"
              disabled={leave.isPending}
              onClick={() => {
                if (window.confirm(t.me.isLeader ? '팀을 해산할까요?' : '팀에서 나갈까요?')) leave.mutate();
              }}
            >
              {t.me.isLeader ? '팀 해산하기' : '팀 나가기'}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
