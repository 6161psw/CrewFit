import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api, tokenStore } from '../../api/client';
import { devLogin, googleLoginUrl, isAdminRole, useMe } from '../../auth/auth';
import { Button, errMsg, inputCls } from '../../components/ui';

const DEV = import.meta.env.VITE_DEV_LOGIN === 'true';

/** W-01 학교 관리자 로그인 */
export function AdminLoginPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const loc = useLocation();
  const { data: me } = useMe();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const loggedIn = !!tokenStore.get() && !!me;
  const notAdmin = loggedIn && !isAdminRole(me);

  const redeem = useMutation({
    mutationFn: () => api.post('/admin-invites/redeem', { code: code.trim() }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav('/admin', { replace: true });
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-primary px-16 text-white lg:flex">
        <p className="mb-8 text-xl font-bold">
          크루핏 <span className="rounded bg-white/15 px-1.5 py-0.5 text-xs">for School</span>
        </p>
        <p className="text-4xl leading-tight font-bold">
          지원 명단과 서류,
          <br />
          이제 구글폼 없이
          <br />
          한 화면에서 확인해요
        </p>
        <ul className="mt-10 flex flex-col gap-4 text-sm">
          {[
            ['학교 인증된 학생만 지원', '재학 확인이 자동으로 끝나요'],
            ['신청서 자동 작성', '학교가 정한 양식 그대로 모여요'],
            ['승인한 팀은 한 번에 전달', '운영사에 명단을 다시 정리해 보낼 필요 없어요'],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-3">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>
                <span className="block font-semibold">{a}</span>
                <span className="text-white/70">{b}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center bg-surface px-8 py-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-2xl font-bold">학교 관리자 로그인</p>
          <p className="mt-1 text-sm text-sub">대회 담당 부서 선생님만 들어올 수 있어요</p>

          {notAdmin || (loc.state as { notAdmin?: boolean } | null)?.notAdmin ? (
            <div className="mt-8">
              <p className="rounded-xl bg-accent-soft p-3 text-sm">
                {me?.email} 계정은 아직 관리자 권한이 없어요.
                <br />
                받은 초대 코드를 입력하세요.
              </p>
              <input className={`${inputCls} mt-3 tracking-widest uppercase`} placeholder="초대 코드 8자리" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button size="lg" className="mt-3 w-full" disabled={code.trim().length < 6 || redeem.isPending} onClick={() => redeem.mutate()}>
                관리자 초대 코드로 시작하기
              </Button>
            </div>
          ) : (
            <a href={googleLoginUrl('admin')} className="mt-8 block">
              <Button size="lg" className="w-full bg-ink">
                학교 구글 계정으로 로그인
              </Button>
            </a>
          )}

          {DEV && !loggedIn && (
            <div className="mt-6 rounded-xl border border-dashed border-line p-4">
              <p className="mb-2 text-xs font-semibold text-muted">개발용 로그인 (SUPER_ADMIN_EMAILS 에 넣은 메일)</p>
              <input className={inputCls} placeholder="admin@gm.gist.ac.kr" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button
                variant="outline"
                className="mt-2 w-full"
                disabled={!email.includes('@')}
                onClick={async () => {
                  try {
                    await devLogin(email.trim());
                    await qc.invalidateQueries({ queryKey: ['me'] });
                    nav('/admin', { replace: true });
                  } catch (e) {
                    setError(errMsg(e));
                  }
                }}
              >
                이메일로 로그인
              </Button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <p className="mt-6 text-xs text-muted">학생 계정으로는 로그인할 수 없어요. 권한은 학교 연간 라이선스 담당자가 초대해요.</p>
        </div>
      </div>
    </div>
  );
}
