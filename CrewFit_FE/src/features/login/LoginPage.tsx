import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { devLogin, googleLoginUrl } from '../../auth/auth';
import { Button, errMsg, inputCls, Screen } from '../../components/ui';

const DEV = import.meta.env.VITE_DEV_LOGIN === 'true';

/** S-01 시작 (학교 메일 인증 S-02~05 는 추후) */
export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const onDev = async () => {
    try {
      await devLogin(email.trim());
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen
      bottom={
        <div className="bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <p className="mb-2 text-center text-xs text-muted">학교 구글 계정이면 학교 인증이 자동으로 끝나요</p>
          <a href={googleLoginUrl('web')}>
            <Button size="lg" className="w-full">구글로 시작하기</Button>
          </a>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center px-6 pt-20 text-center">
        <p className="text-[40px] font-bold text-primary">크루핏</p>
        <p className="mt-4 text-[22px] leading-snug font-bold">
          나와 가까운 사람,
          <br />
          나와 가까운 대외활동
        </p>
        <div className="relative mt-8 grid size-[260px] place-items-center rounded-full bg-primary-soft/60">
          <span className="absolute top-3 text-sm font-semibold text-sub">전국</span>
          <div className="relative grid size-[180px] place-items-center rounded-full bg-primary-soft">
            <span className="absolute top-3 text-sm font-semibold text-sub">내 지역</span>
            <div className="grid size-[104px] place-items-center rounded-full bg-primary text-white">
              <div>
                <p className="text-xs">내 학교</p>
                <p className="text-xl font-bold">GIST</p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-sub">우리 학교 대회부터, 같은 학교 사람과 팀을 꾸려요</p>

        {DEV && (
          <div className="mt-8 w-full rounded-2xl border border-dashed border-line p-4 text-left">
            <p className="mb-2 text-xs font-semibold text-muted">개발용 로그인</p>
            <input className={inputCls} placeholder="test@gm.gist.ac.kr" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button variant="outline" className="mt-2 w-full" disabled={!email.includes('@')} onClick={onDev}>
              이메일로 로그인
            </Button>
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          </div>
        )}
      </div>
    </Screen>
  );
}
