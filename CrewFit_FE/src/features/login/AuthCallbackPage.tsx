import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { refreshToken } from '../../api/client';

/** 구글 로그인 후 백엔드가 보내는 곳 → refresh 쿠키로 access token 받기 */
export function AuthCallbackPage({ to }: { to: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (params.get('error')) return setFailed(true);
    refreshToken().then(async (ok) => {
      if (!ok) return setFailed(true);
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav(to, { replace: true });
    });
  }, [nav, params, qc, to]);

  return (
    <div className="grid min-h-dvh place-items-center text-sm text-sub">
      {failed ? (
        <div className="text-center">
          <p>로그인에 실패했어요</p>
          <button className="mt-3 font-semibold text-primary" onClick={() => nav(to === '/admin' ? '/admin/login' : '/login', { replace: true })}>
            다시 시도
          </button>
        </div>
      ) : (
        '로그인 중…'
      )}
    </div>
  );
}
