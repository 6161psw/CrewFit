import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, download, qs } from '../../api/client';
import type { SubmissionStatus, SubmissionView } from '../../api/types';
import { Avatar, Button, Chip, Empty, errMsg, inputCls, Loading, Modal, Thumb, useToast } from '../../components/ui';
import { cx, dateTime, dDayLabel, fileSize, shortDate } from '../../lib/format';
import { STATUS_LABEL, STATUS_TONE, type AdminContest, type TeamList } from './types';

const TABS: ('all' | SubmissionStatus)[] = ['all', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'FORWARDED'];
const REASONS = [
  ['OVER_LENGTH', '분량 초과'],
  ['FORMAT_MISMATCH', '학교 양식과 다름'],
  ['MISSING_SIGNATURE', '서명 누락'],
  ['INSUFFICIENT', '내용 불충분'],
  ['OTHER', '기타'],
] as const;

/** W-03 지원 팀 목록 + W-04 팀 상세 + W-05 보완 요청 */
export function AdminTeamsPage() {
  const params = useParams();
  const nav = useNavigate();
  const contests = useQuery({ queryKey: ['admin', 'contests'], queryFn: () => api.get<AdminContest[]>('/admin/contests') });
  const contestId = Number(params.id) || contests.data?.[0]?.id;

  const [tab, setTab] = useState<'all' | SubmissionStatus>('all');
  const [q, setQ] = useState('');
  const [major, setMajor] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => setPage(1), [tab, q, major, docStatus, contestId]);

  const list = useQuery({
    queryKey: ['admin', 'teams', contestId, tab, q, major, docStatus, page],
    queryFn: () => api.get<TeamList>(`/admin/contests/${contestId}/teams${qs({ status: tab === 'all' ? undefined : tab, q, major, docStatus, page, limit: 20 })}`),
    enabled: !!contestId,
  });
  const contest = contests.data?.find((c) => c.id === contestId);

  if (contests.isLoading) return <Loading />;
  if (!contestId) return <Empty>등록된 공고가 없어요</Empty>;
  const L = list.data;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="mb-4 text-sm text-sub">
        지원 팀 ›{' '}
        <select className="bg-transparent font-semibold text-ink" value={contestId} onChange={(e) => nav(`/admin/contests/${e.target.value}/teams`)}>
          {contests.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </p>

      {contest && (
        <div className="mb-5 flex items-center gap-4">
          <Thumb label={contest.categoryLabel} size={56} className="bg-primary text-white" />
          <div className="flex-1">
            <p className="flex items-center gap-2 text-2xl font-bold">
              {contest.title}
              <Chip tone="red">{dDayLabel(Math.ceil((new Date(contest.deadline).getTime() - Date.now()) / 86_400_000))}</Chip>
              {L?.contest.open && <Chip tone="green">접수 중</Chip>}
            </p>
            <p className="text-sm text-sub">
              {contest.organizer} · 접수 ~{shortDate(contest.deadline)} · 팀 {contest.minTeamSize}~{contest.maxTeamSize}명 · 제출 서류 {contest.requiredDocuments.length}종
            </p>
          </div>
          <Button variant="outline" onClick={() => download(`/admin/contests/${contestId}/export.csv`, `${contest.title}.csv`)}>
            엑셀 내보내기 (학교 양식)
          </Button>
          <Button onClick={() => nav(`/admin/forward?contestId=${contestId}`)}>승인 팀 운영사 전달</Button>
        </div>
      )}

      <div className="mb-4 flex gap-5 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx('flex items-center gap-1.5 pb-2.5 text-[15px]', tab === t ? 'border-b-2 border-ink font-bold' : 'text-sub')}>
            {t === 'all' ? '전체' : STATUS_LABEL[t]}
            <span className={cx('rounded-full px-1.5 text-xs', tab === t ? 'bg-ink text-white' : 'text-sub')}>{L?.counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <label className="flex w-72 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="팀 이름 · 팀원 이름 검색" className="w-full py-2.5 text-sm outline-none" />
        </label>
        <select className="rounded-xl border border-line bg-surface px-3 text-sm" value={major} onChange={(e) => setMajor(e.target.value)}>
          <option value="">학과 전체</option>
          {L?.majors.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="rounded-xl border border-line bg-surface px-3 text-sm" value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
          <option value="">서류 상태 전체</option>
          <option value="complete">서류 완료</option>
          <option value="incomplete">서류 미완료</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-xs text-sub">
            <tr>
              <th className="px-4 py-3 font-medium">팀</th>
              <th className="px-3 font-medium">인원</th>
              <th className="px-3 font-medium">학과 구성</th>
              <th className="px-3 font-medium">서류</th>
              <th className="px-3 font-medium">접수 일시</th>
              <th className="px-3 font-medium">상태</th>
              <th className="px-3" />
            </tr>
          </thead>
          <tbody>
            {L?.items.map((r) => (
              <tr key={r.submissionId} className={cx('border-t border-line', selected === r.submissionId && 'bg-primary-soft/50')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb label={r.teamName.slice(0, 1)} size={32} />
                    <div>
                      <p className="font-semibold">{r.teamName}</p>
                      <p className="text-xs text-sub">
                        팀장 {r.leader?.name} · {[r.leader?.major, r.leader?.admissionYear].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 font-semibold">{r.memberCount}명</td>
                <td className="max-w-56 truncate px-3 text-sub">{r.majors.join(' · ')}</td>
                <td className="px-3">
                  <Chip tone={r.docs.complete ? 'green' : 'amber'}>{r.docs.label}</Chip>
                </td>
                <td className="px-3 text-sub">{dateTime(r.submittedAt)}</td>
                <td className="px-3">
                  <Chip tone={STATUS_TONE[r.status]}>{r.statusLabel}</Chip>
                </td>
                <td className="px-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(r.submissionId)}>
                    보기
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.isLoading && <Loading />}
        {L && !L.items.length && <Empty>해당하는 팀이 없어요</Empty>}
        {L && L.total > L.limit && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-sub">
            <span>
              {(L.page - 1) * L.limit + 1}–{Math.min(L.page * L.limit, L.total)} / {L.total}팀
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                이전
              </Button>
              <Button size="sm" variant="outline" disabled={page * L.limit >= L.total} onClick={() => setPage(page + 1)}>
                다음
              </Button>
            </span>
          </div>
        )}
      </div>

      {selected && <TeamDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** W-04 팀 상세 (오른쪽 패널) */
function TeamDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [revOpen, setRevOpen] = useState(false);
  const { data: s, isLoading } = useQuery({ queryKey: ['admin', 'submission', id], queryFn: () => api.get<SubmissionView>(`/admin/submissions/${id}`) });

  const done = (data: SubmissionView) => {
    qc.setQueryData(['admin', 'submission', id], data);
    qc.invalidateQueries({ queryKey: ['admin', 'teams'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };
  const approve = useMutation({
    mutationFn: () => api.post<SubmissionView>(`/admin/submissions/${id}/approve`),
    onSuccess: (d) => {
      done(d);
      toast('승인했어요');
    },
    onError: (e) => toast(errMsg(e)),
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-[520px] flex-col bg-surface" onClick={(e) => e.stopPropagation()}>
        {isLoading || !s ? (
          <Loading />
        ) : (
          <>
            <div className="flex items-start gap-3 border-b border-line p-6">
              <Thumb label={s.teamName.slice(0, 2)} size={44} />
              <div className="flex-1">
                <p className="flex items-center gap-2 text-xl font-bold">
                  {s.teamName} <Chip tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Chip>
                </p>
                <p className="text-xs text-sub">
                  {s.contest.title} · {dateTime(s.submittedAt)} 크루핏 접수
                </p>
              </div>
              <button onClick={onClose} aria-label="닫기">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">팀원 {s.members.length}명</p>
                {s.allSchoolVerified && <Chip tone="green">모두 학교 인증</Chip>}
              </div>
              <div className="divide-y divide-line rounded-xl border border-line">
                {s.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar name={m.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {m.name} {m.schoolVerified && <CheckCircle2 size={12} className="inline fill-primary text-white" />}
                      </p>
                      <p className="truncate text-xs text-sub">
                        {[m.major, m.admissionYear && `${m.admissionYear}학번`, m.contact].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Chip>{[m.isLeader && '팀장', m.role].filter(Boolean).join(' · ')}</Chip>
                    {m.firstTime && <span className="text-[11px] text-muted">첫 참여</span>}
                  </div>
                ))}
              </div>

              <div className="mt-6 mb-2 flex items-center justify-between">
                <p className="font-bold">
                  제출 서류 {s.readyCount}/{s.totalCount}
                </p>
                <Chip tone="amber">학교 양식으로 자동 정리</Chip>
              </div>
              <div className="flex flex-col gap-2">
                {s.documents.map((d) => (
                  <div key={d.id} className={cx('flex items-center gap-3 rounded-xl bg-canvas px-3 py-3', d.revisionRequested && 'ring-1 ring-danger')}>
                    {d.status === 'READY' ? <CheckCircle2 size={20} className="fill-primary text-white" /> : <CircleDashed size={20} className="text-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {d.title} <Chip tone={d.auto ? 'green' : 'amber'}>{d.auto ? '자동 작성' : d.type === 'CONSENT' ? '팀원 서명' : '팀장 업로드'}</Chip>
                      </p>
                      <p className="truncate text-xs text-sub">
                        {d.type === 'FILE' ? (d.fileName ? `${d.fileName} · ${fileSize(d.fileSize)}` : '미제출') : d.type === 'CONSENT' ? `팀원 전자서명 ${d.signedCount}/${s.members.length}` : d.description}
                      </p>
                    </div>
                    {d.type === 'FILE' && d.fileName && (
                      <Button size="sm" variant="outline" onClick={() => download(`/admin/submissions/${id}/documents/${d.id}/file`, d.fileName!)}>
                        열기
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {s.revision && (
                <div className="mt-4 rounded-xl bg-danger-soft p-3 text-sm">
                  <p className="font-semibold text-danger">보완 요청 · {s.revision.reasons.map((r) => r.label).join(', ')}</p>
                  <p className="mt-1 whitespace-pre-wrap">{s.revision.message}</p>
                </div>
              )}

              <p className="mt-6 mb-2 font-bold">처리 기록</p>
              <ol className="flex flex-col gap-2 text-sm">
                {s.logs?.map((l, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-primary">●</span>
                    <span className="w-24 shrink-0 text-xs text-muted">{dateTime(l.at)}</span>
                    <span>{l.message}</span>
                  </li>
                ))}
              </ol>
            </div>

            {(s.status === 'SUBMITTED' || s.status === 'APPROVED') && (
              <div className="flex gap-2 border-t border-line p-4">
                <Button variant="danger" size="lg" className="flex-1" onClick={() => setRevOpen(true)}>
                  보완 요청
                </Button>
                {s.status === 'SUBMITTED' && (
                  <Button size="lg" className="flex-1" disabled={approve.isPending} onClick={() => approve.mutate()}>
                    승인하기
                  </Button>
                )}
              </div>
            )}
            {revOpen && <RevisionModal s={s} onClose={() => setRevOpen(false)} onDone={done} />}
          </>
        )}
      </div>
    </div>
  );
}

/** W-05 보완 요청 */
function RevisionModal({ s, onClose, onDone }: { s: SubmissionView; onClose: () => void; onDone: (d: SubmissionView) => void }) {
  const toast = useToast();
  const revisable = s.documents.filter((d) => d.type === 'FILE' || d.type === 'CONSENT');
  const [docs, setDocs] = useState<number[]>(revisable[0] ? [revisable[0].id] : []);
  const [reasons, setReasons] = useState<string[]>(['OVER_LENGTH']);
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const send = useMutation({
    mutationFn: () =>
      api.post<SubmissionView>(`/admin/submissions/${s.id}/revision`, {
        documentIds: docs,
        reasons,
        message,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      }),
    onSuccess: (d) => {
      onDone(d);
      onClose();
      toast('보완 요청을 보냈어요', '팀 채팅방으로 전달돼요');
    },
    onError: (e) => toast(errMsg(e)),
  });

  return (
    <Modal open onClose={onClose} title="보완 요청 보내기">
      <p className="-mt-2 mb-4 text-sm text-sub">
        {s.teamName} 팀장 {s.leader.name}에게 팀 채팅방으로 전달돼요
      </p>
      <p className="mb-2 text-sm font-semibold">다시 받을 서류</p>
      <div className="flex flex-col gap-2">
        {revisable.map((d) => (
          <label key={d.id} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm">
            <input type="checkbox" checked={docs.includes(d.id)} onChange={() => setDocs(toggle(docs, d.id))} />
            {d.title}
          </label>
        ))}
      </div>
      <p className="mt-4 mb-2 text-sm font-semibold">사유</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map(([v, l]) => (
          <Chip key={v} active={reasons.includes(v)} onClick={() => setReasons(toggle(reasons, v))} className="px-2.5 py-1">
            {reasons.includes(v) && '✓ '}
            {l}
          </Chip>
        ))}
      </div>
      <p className="mt-4 mb-2 text-sm font-semibold">팀에게 보낼 메시지</p>
      <textarea className={cx(inputCls, 'h-24 resize-none text-sm')} placeholder="아이디어 요약서가 3쪽이에요. 2쪽 이내로 다시 올려 주세요." value={message} onChange={(e) => setMessage(e.target.value)} />
      <p className="mt-4 mb-2 text-sm font-semibold">보완 기한</p>
      <input type="datetime-local" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" className="flex-1" disabled={!docs.length || !reasons.length || !message.trim() || send.isPending} onClick={() => send.mutate()}>
          보완 요청 보내기
        </Button>
      </div>
    </Modal>
  );
}
