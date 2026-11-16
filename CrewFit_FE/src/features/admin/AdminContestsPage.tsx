import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../api/client';
import { Button, Chip, Empty, errMsg, Field, inputCls, Loading, useToast } from '../../components/ui';
import { dDayLabel, shortDate } from '../../lib/format';
import type { AdminContest } from './types';

/** 대회 · 공고 목록 */
export function AdminContestsPage() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'contests'], queryFn: () => api.get<AdminContest[]>('/admin/contests') });
  if (isLoading) return <Loading />;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-2xl font-bold">대회 · 공고</p>
        <Button onClick={() => nav('/admin/contests/new')}>+ 공고 등록</Button>
      </div>
      {data?.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs text-sub">
              <tr>
                <th className="px-4 py-3 font-medium">대회</th>
                <th className="px-3 font-medium">범위</th>
                <th className="px-3 font-medium">마감</th>
                <th className="px-3 font-medium">관심</th>
                <th className="px-3 font-medium">팀</th>
                <th className="px-3 font-medium">상태</th>
                <th className="px-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-sub">
                      {c.organizer} · {c.categoryLabel} · 제출처 {c.submitTo}
                    </p>
                  </td>
                  <td className="px-3">{c.scope === 'SCHOOL' ? '교내' : c.scope === 'REGION' ? `연합 (${c.region})` : '전국'}</td>
                  <td className="px-3">
                    {shortDate(c.deadline)} <Chip tone="red">{dDayLabel(Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86_400_000))}</Chip>
                  </td>
                  <td className="px-3">{c._count.interests}</td>
                  <td className="px-3">{c._count.teams}</td>
                  <td className="px-3">
                    <Chip tone={c.status === 'PUBLISHED' ? 'green' : 'gray'}>{c.status === 'PUBLISHED' ? '게시 중' : c.status === 'DRAFT' ? '임시 저장' : '마감'}</Chip>
                  </td>
                  <td className="px-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => nav(`/admin/contests/${c.id}/teams`)}>
                      지원 팀
                    </Button>{' '}
                    <Button size="sm" variant="ghost" onClick={() => nav(`/admin/contests/${c.id}/edit`)}>
                      수정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>등록된 공고가 없어요</Empty>
      )}
    </div>
  );
}

const CATEGORIES = [
  ['HACKATHON', '해커톤'],
  ['STARTUP', '창업'],
  ['RESEARCH', '연구'],
  ['DEMO', '데모'],
  ['IDEA', '아이디어'],
  ['ETC', '기타'],
] as const;
const DOC_TYPES = [
  ['ROSTER', '팀 명단 (자동)'],
  ['ENROLLMENT', '재학 확인 (학교 인증)'],
  ['APPLICATION_FORM', '참가 신청서 (자동)'],
  ['FILE', '파일 업로드 (팀장)'],
  ['CONSENT', '동의서 (팀원 서명)'],
] as const;
const DEFAULT_DOCS = [
  { type: 'ROSTER', title: '팀 명단' },
  { type: 'ENROLLMENT', title: '재학 확인' },
  { type: 'APPLICATION_FORM', title: '참가 신청서 (학교 양식)' },
  { type: 'FILE', title: '아이디어 요약서 (2쪽 이내)' },
  { type: 'CONSENT', title: '개인정보 수집·이용 동의서' },
];

type Form = {
  title: string;
  organizer: string;
  description: string;
  category: string;
  tags: string;
  scope: 'SCHOOL' | 'REGION' | 'NATIONAL';
  minTeamSize: number;
  maxTeamSize: number;
  deadline: string;
  submitTo: string;
  operatorName: string;
  operatorEmail: string;
  linkUrl: string;
  requiredDocuments: { type: string; title: string }[];
};

/** 공고 등록 / 수정 */
export function AdminContestFormPage() {
  const id = Number(useParams().id) || undefined;
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const contests = useQuery({ queryKey: ['admin', 'contests'], queryFn: () => api.get<AdminContest[]>('/admin/contests'), enabled: !!id });
  const [f, setF] = useState<Form>({
    title: '',
    organizer: '',
    description: '',
    category: 'STARTUP',
    tags: '',
    scope: 'SCHOOL',
    minTeamSize: 2,
    maxTeamSize: 5,
    deadline: '',
    submitTo: '',
    operatorName: '',
    operatorEmail: '',
    linkUrl: '',
    requiredDocuments: DEFAULT_DOCS,
  });

  useEffect(() => {
    const c = contests.data?.find((x) => x.id === id);
    if (!c) return;
    setF({
      title: c.title,
      organizer: c.organizer,
      description: c.description,
      category: c.category,
      tags: c.tags.join(', '),
      scope: c.scope,
      minTeamSize: c.minTeamSize,
      maxTeamSize: c.maxTeamSize,
      deadline: c.deadline.slice(0, 16),
      submitTo: c.submitTo,
      operatorName: c.operatorName ?? '',
      operatorEmail: c.operatorEmail ?? '',
      linkUrl: c.linkUrl ?? '',
      requiredDocuments: c.requiredDocuments.map((d) => ({ type: d.type, title: d.title })),
    });
  }, [contests.data, id]);

  const body = () => ({
    ...f,
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    deadline: new Date(f.deadline).toISOString(),
    operatorName: f.operatorName || undefined,
    operatorEmail: f.operatorEmail || undefined,
    linkUrl: f.linkUrl || undefined,
  });
  const save = useMutation({
    mutationFn: () => (id ? api.patch(`/admin/contests/${id}`, body()) : api.post('/admin/contests', body())),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast(id ? '수정했어요' : '공고를 등록했어요');
      nav('/admin/contests');
    },
    onError: (e) => toast(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete<{ closed?: boolean }>(`/admin/contests/${id}`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast(r?.closed ? '팀이 있어 마감 처리했어요' : '삭제했어요');
      nav('/admin/contests');
    },
    onError: (e) => toast(errMsg(e)),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.title && f.organizer && f.deadline && f.submitTo && f.minTeamSize <= f.maxTeamSize;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-2xl font-bold">{id ? '공고 수정' : '공고 등록'}</p>
        {id && (
          <Button variant="danger" size="sm" onClick={() => window.confirm('삭제할까요? (팀이 있으면 마감 처리)') && remove.mutate()}>
            <Trash2 size={14} /> 삭제
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">공고문 자동 입력(LLM)은 다음 단계예요. 지금은 직접 입력해 주세요.</p>
        <Field label="대회명">
          <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="주최">
            <input className={inputCls} value={f.organizer} onChange={(e) => set('organizer', e.target.value)} />
          </Field>
          <Field label="제출처 (명단 받는 부서)">
            <input className={inputCls} placeholder="GIST 창업진흥센터" value={f.submitTo} onChange={(e) => set('submitTo', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="분야">
            <select className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="범위">
            <select className={inputCls} value={f.scope} onChange={(e) => set('scope', e.target.value as Form['scope'])}>
              <option value="SCHOOL">교내</option>
              <option value="REGION">연합 (우리 지역)</option>
              <option value="NATIONAL">전국 (최고 관리자)</option>
            </select>
          </Field>
          <Field label="접수 마감">
            <input type="datetime-local" className={inputCls} value={f.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="최소 인원">
            <input type="number" min={1} className={inputCls} value={f.minTeamSize} onChange={(e) => set('minTeamSize', Number(e.target.value))} />
          </Field>
          <Field label="최대 인원">
            <input type="number" min={1} className={inputCls} value={f.maxTeamSize} onChange={(e) => set('maxTeamSize', Number(e.target.value))} />
          </Field>
          <Field label="태그 (쉼표)">
            <input className={inputCls} placeholder="창업, AI" value={f.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
        </div>
        <Field label="대회 안내">
          <textarea rows={5} className={inputCls} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="운영사">
            <input className={inputCls} value={f.operatorName} onChange={(e) => set('operatorName', e.target.value)} />
          </Field>
          <Field label="운영사 메일">
            <input className={inputCls} value={f.operatorEmail} onChange={(e) => set('operatorEmail', e.target.value)} />
          </Field>
          <Field label="공고 링크">
            <input className={inputCls} placeholder="https://" value={f.linkUrl} onChange={(e) => set('linkUrl', e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-sub">팀 확정 후 낼 서류</p>
          <div className="flex flex-col gap-2">
            {f.requiredDocuments.map((d, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className={`${inputCls} w-56`}
                  value={d.type}
                  onChange={(e) => set('requiredDocuments', f.requiredDocuments.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}
                >
                  {DOC_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <input className={inputCls} value={d.title} onChange={(e) => set('requiredDocuments', f.requiredDocuments.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Button variant="ghost" onClick={() => set('requiredDocuments', f.requiredDocuments.filter((_, j) => j !== i))}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => set('requiredDocuments', [...f.requiredDocuments, { type: 'FILE', title: '' }])}>
              + 서류 추가
            </Button>
          </div>
        </div>
        <Button size="lg" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {id ? '저장' : '공고 게시'}
        </Button>
      </div>
    </div>
  );
}
