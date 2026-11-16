import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { useMe } from '../../auth/auth';
import { Button, CTABar, errMsg, inputCls, Loading, Screen, TopBar, useToast } from '../../components/ui';
import { cx } from '../../lib/format';

const QS = [
  { key: 'oneLiner', q: 'Q1. 나를 한 줄로 소개해요', max: 100, rows: 1 },
  { key: 'role', q: 'Q2. 팀에서 맡고 싶은 역할', max: 1000, rows: 4 },
  { key: 'experience', q: 'Q3. 끝까지 해낸 경험', max: 2000, rows: 6 },
] as const;

type Form = Record<(typeof QS)[number]['key'], string>;

/** E-04 자소서 작성 */
export function IntroEditPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const [form, setForm] = useState<Form>({ oneLiner: '', role: '', experience: '' });

  useEffect(() => {
    if (me) setForm({ oneLiner: me.intro.oneLiner ?? '', role: me.intro.role ?? '', experience: me.intro.experience ?? '' });
  }, [me]);

  const save = useMutation({
    mutationFn: () => api.patch('/users/me/intro', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      toast('저장했어요');
      nav('/me');
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (!me) return <Loading />;

  return (
    <Screen
      bottom={
        <CTABar>
          <Button size="lg" className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            저장하기
          </Button>
        </CTABar>
      }
    >
      <TopBar title="자소서 작성" sub="관심 표시한 공모전의 사람들과, 내가 지원·제안받은 팀이 읽어요" />
      <div className="flex flex-col gap-5 px-5">
        {QS.map(({ key, q, max, rows }) => (
          <label key={key} className="block">
            <span className="mb-2 block text-sm font-semibold">{q}</span>
            {rows === 1 ? (
              <input className={inputCls} maxLength={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            ) : (
              <textarea rows={rows} maxLength={max} className={cx(inputCls, 'resize-none text-sm leading-relaxed')} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            )}
            <span className="mt-1 block text-right text-[11px] text-muted">
              {form[key].length}/{max}
            </span>
          </label>
        ))}
      </div>
    </Screen>
  );
}
