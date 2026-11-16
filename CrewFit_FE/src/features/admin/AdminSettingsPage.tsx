import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button, Chip, errMsg, Field, inputCls, Loading, useToast } from '../../components/ui';
import { dateTime } from '../../lib/format';
import type { AdminMe } from './types';

interface Invite {
  id: number;
  code: string;
  department: string | null;
  expiresAt: string;
  usedAt: string | null;
  school: { shortName: string };
  usedBy: { name: string; email: string } | null;
}

/** 설정: 내 정보 · 관리자 초대 */
export function AdminSettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: () => api.get<AdminMe>('/admin/me') });
  const invites = useQuery({ queryKey: ['admin', 'invites'], queryFn: () => api.get<Invite[]>('/admin/invites') });
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [inviteDept, setInviteDept] = useState('');
  const [schoolId, setSchoolId] = useState('');

  useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setDept(me.data.department ?? '');
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => api.patch('/admin/me', { name, department: dept }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'me'] });
      toast('저장했어요');
    },
    onError: (e) => toast(errMsg(e)),
  });
  const invite = useMutation({
    mutationFn: () => api.post<Invite>('/admin/invites', { department: inviteDept || undefined, schoolId: schoolId ? Number(schoolId) : undefined }),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] });
      navigator.clipboard?.writeText(inv.code).catch(() => undefined);
      toast(`초대 코드 ${inv.code}`, '복사했어요 · 7일간 유효');
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (!me.data) return <Loading />;
  const isSuper = me.data.role === 'SUPER_ADMIN';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <p className="text-2xl font-bold">설정</p>
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <p className="font-bold">내 정보</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="이름">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="부서">
            <input className={inputCls} placeholder="창업진흥센터" value={dept} onChange={(e) => setDept(e.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-sub">
          {me.data.email} · {me.data.school?.name ?? '전체 학교'} · {isSuper ? '최고 관리자' : '학교 관리자'}
        </p>
        <Button className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
          저장
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <p className="font-bold">동료 관리자 초대</p>
        <p className="-mt-2 text-sm text-sub">초대 코드를 받은 선생님은 로그인 후 코드를 입력하면 우리 학교 관리자가 돼요.</p>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="부서 (선택)" value={inviteDept} onChange={(e) => setInviteDept(e.target.value)} />
          {isSuper && <input className={`${inputCls} w-40`} placeholder="학교 ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value.replace(/\D/g, ''))} />}
          <Button className="shrink-0" disabled={invite.isPending || (isSuper && !schoolId)} onClick={() => invite.mutate()}>
            코드 발급
          </Button>
        </div>
        <div className="divide-y divide-line">
          {invites.data?.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="font-mono font-bold tracking-widest">{i.code}</span>
              <span className="flex-1 text-xs text-sub">
                {i.school.shortName} {i.department && `· ${i.department}`} · ~{dateTime(i.expiresAt)}
              </span>
              {i.usedBy ? <Chip tone="green">{i.usedBy.name} 사용</Chip> : new Date(i.expiresAt) < new Date() ? <Chip>만료</Chip> : <Chip tone="amber">대기</Chip>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
