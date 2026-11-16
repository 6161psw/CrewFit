import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import type { Me } from '../../api/types';
import { useMe } from '../../auth/auth';
import { Button, Chip, CTABar, errMsg, Field, inputCls, Loading, Screen, TopBar, useToast } from '../../components/ui';

const GENDERS = [
  ['MALE', '남'],
  ['FEMALE', '여'],
  ['UNDISCLOSED', '밝히지 않음'],
] as const;

/** S-04 기본 프로필 (팀원에게 보일 정보) */
export function ProfileEditPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const [form, setForm] = useState({ name: '', major: '', admissionYear: '', gender: 'UNDISCLOSED' as Me['gender'], skills: [] as string[] });
  const [skill, setSkill] = useState('');

  useEffect(() => {
    if (me) setForm({ name: me.name, major: me.major ?? '', admissionYear: me.admissionYear?.toString() ?? '', gender: me.gender, skills: me.skills });
  }, [me]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/users/me', {
        name: form.name.trim(),
        major: form.major.trim() || undefined,
        admissionYear: form.admissionYear ? Number(form.admissionYear) : undefined,
        gender: form.gender,
        skills: form.skills,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      toast('저장했어요');
      nav('/me');
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (!me) return <Loading />;
  const addSkill = () => {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    setSkill('');
  };

  return (
    <Screen
      bottom={
        <CTABar>
          <Button size="lg" className="w-full" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            완료
          </Button>
        </CTABar>
      }
    >
      <TopBar title="팀원에게 보일 기본 정보" sub="관심 표시한 공모전의 사람들에게 이렇게 보여요" />
      <div className="flex flex-col gap-4 px-5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="이름">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="학번">
            <input className={inputCls} inputMode="numeric" placeholder="26" value={form.admissionYear} onChange={(e) => setForm({ ...form, admissionYear: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
          </Field>
        </div>
        <Field label="학과">
          <input className={inputCls} placeholder="자유전공학부" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} />
        </Field>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-sub">성별</p>
          <div className="grid grid-cols-3 gap-1.5">
            {GENDERS.map(([v, l]) => (
              <Chip key={v} active={form.gender === v} onClick={() => setForm({ ...form, gender: v })} className="justify-center py-2 text-sm">
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-sub">기술 스택</p>
          <div className="flex flex-wrap gap-1.5">
            {form.skills.map((s) => (
              <Chip key={s} tone="green" onClick={() => setForm({ ...form, skills: form.skills.filter((x) => x !== s) })} className="py-1">
                {s} <X size={12} />
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className={inputCls} placeholder="Figma, Flutter, 기획…" value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
            <Button variant="outline" onClick={addSkill}>
              + 추가
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
