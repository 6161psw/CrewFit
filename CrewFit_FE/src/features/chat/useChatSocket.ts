import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, refreshToken, tokenStore } from '../../api/client';
import type { ChatMessage } from '../../api/types';

/** socket.io /chat 수신 전용: join → 'message', 'team'(상태 변경). 전송은 REST (서버가 브로드캐스트) */
export function useChatSocket(teamId: number, onMessage: (m: ChatMessage) => void, onTeam: () => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const handlers = useRef({ onMessage, onTeam });
  handlers.current = { onMessage, onTeam };

  useEffect(() => {
    const s = io(`${API_URL}/chat`, { auth: (cb) => cb({ token: tokenStore.get() }), transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.on('connect', () => {
      setConnected(true);
      s.emit('join', { teamId });
    });
    s.on('disconnect', () => setConnected(false));
    s.on('error', async (e: { message?: string }) => {
      if (e?.message === 'unauthorized' && (await refreshToken())) s.connect();
    });
    s.on('message', (m: ChatMessage) => m.teamId === teamId && handlers.current.onMessage(m));
    s.on('team', () => handlers.current.onTeam());
    return () => {
      s.emit('leave', { teamId });
      s.disconnect();
    };
  }, [teamId]);

  return { connected };
}
