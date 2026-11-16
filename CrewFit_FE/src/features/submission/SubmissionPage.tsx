import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, PartyPopper, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, download } from '../../api/client';
import type { SubmissionView } from '../../api/types';
import { useMe } from '../../auth/auth';
import { Button, Card, Chip, CTABar, errMsg, Loading, Screen, TopBar, useToast } from '../../components/ui';
import { cx, dateTime, fileSize } from '../../lib/format';

/** T-04/05 제출 서류 · T-06 제출 완료 */
export function SubmissionPage() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadDoc = useRef<number>(0);

  const { data: s, isLoading } = useQuery({ queryKey: ['submission', id], queryFn: () => api.get<SubmissionView>(`/teams/${id}/submission`) });
  const refresh = (data: SubmissionView) => {
    qc.setQueryData(['submission', id], data);
    qc.invalidateQueries({ queryKey: ['team', id] });
  };

  const upload = useMutation({
    mutationFn: (f: File) => api.upload<SubmissionView>(`/teams/${id}/submission/documents/${uploadDoc.current}/file`, f),
    onSuccess: refresh,
    onError: (e) => toast(errMsg(e)),
  });
  const sign = useMutation({ mutationFn: () => api.post<SubmissionView>(`/teams/${id}/submission/signature`), onSuccess: refresh, onError: (e) => toast(errMsg(e)) });
  const submit = useMutation({ mutationFn: () => api.post<SubmissionView>(`/teams/${id}/submission/submit`), onSuccess: refresh, onError: (e) => toast(errMsg(e)) });

  if (isLoading || !s) return <Loading />;
  const isLeader = s.leader.id === me?.id;
  const editable = s.status === 'PREPARING' || s.status === 'REVISION_REQUESTED';
  const pending = s.totalCount - s.readyCount;

  if (!editable) return <Done s={s} onChat={() => nav(`/chats/${id}`)} onHome={() => nav('/')} />;

  return (
    <Screen
      bottom={
        <CTABar>
          {isLeader ? (
            <Button size="lg" className="w-full" disabled={!s.canSubmit || submit.isPending} onClick={() => submit.mutate()}>
              {s.canSubmit ? `${s.contest.submitTo}로 제출하기` : `서류 ${pending}개를 채우면 제출할 수 있어요`}
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              {s.canSubmit ? '팀장이 제출하면 끝나요' : `서류 ${pending}개 남았어요`}
            </Button>
          )}
        </CTABar>
      }
    >
      <TopBar title="팀 확정 · 제출 서류" sub={`${s.contest.title} · ${s.teamName} ${s.members.length}명`} onBack={() => nav(`/chats/${id}`)} />
      <div className="flex flex-col gap-3 px-5">
        {s.revision && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4">
            <p className="flex items-center gap-1.5 font-semibold text-danger">
              <AlertTriangle size={18} /> 보완 요청 · {s.revision.reasons.map((r) => r.label).join(', ')}
            </p>
            {s.revision.message && <p className="mt-1.5 text-sm whitespace-pre-wrap">{s.revision.message}</p>}
            {s.revision.deadline && <p className="mt-1.5 text-xs text-sub">보완 기한 {dateTime(s.revision.deadline)}</p>}
          </div>
        )}

        <div>
          <div className="mb-2 flex justify-between text-sm font-bold">
            <span>제출 서류</span>
            <span className="text-primary">
              {s.readyCount}/{s.totalCount} 준비됨
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(s.readyCount / Math.max(1, s.totalCount)) * 100}%` }} />
          </div>
        </div>

        {s.documents.map((d) => {
          const ready = d.status === 'READY';
          const needsAction = !ready && (d.type === 'FILE' || d.type === 'CONSENT');
          return (
            <Card key={d.id} className={cx(needsAction && 'border-accent', d.revisionRequested && 'border-danger')}>
              <div className="flex items-start gap-3">
                {ready ? <CheckCircle2 size={22} className="shrink-0 fill-primary text-white" /> : d.type === 'CONSENT' ? <Clock size={22} className="shrink-0 text-accent" /> : <CircleDashed size={22} className="shrink-0 text-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{d.title}</p>
                  <p className={cx('text-xs', ready ? 'text-primary' : 'text-sub')}>
                    {d.type === 'ROSTER' && `자동 작성됨 · ${s.members.length}명 (이름·학과·학번·연락처)`}
                    {d.type === 'ENROLLMENT' && (ready ? `학교 인증으로 대체됨 · ${s.members.length}/${s.members.length}명` : `학교 인증이 안 된 팀원이 있어요`)}
                    {d.type === 'APPLICATION_FORM' && '팀 정보로 자동 작성됨'}
                    {d.type === 'FILE' && (d.fileName ? `${d.fileName} · ${fileSize(d.fileSize)}` : '팀장이 올려 주세요')}
                    {d.type === 'CONSENT' && `팀원 서명 ${d.signedCount}/${s.members.length}`}
                  </p>
                </div>
                {d.auto && <Chip tone={d.type === 'ENROLLMENT' ? 'amber' : 'green'}>{d.type === 'ENROLLMENT' ? '학교 인증' : '자동'}</Chip>}
              </div>

              {d.type === 'FILE' && isLeader && (
                <button
                  onClick={() => {
                    uploadDoc.current = d.id;
                    fileRef.current?.click();
                  }}
                  disabled={upload.isPending}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent bg-accent-soft py-3 text-sm font-semibold"
                >
                  <Upload size={16} />
                  {upload.isPending && uploadDoc.current === d.id ? '올리는 중…' : d.fileName ? '바꾸기 · PDF 10MB 이하' : '파일 올리기 · PDF 10MB 이하'}
                </button>
              )}
              {d.type === 'FILE' && d.fileName && (
                <button onClick={() => download(`/teams/${id}/submission/documents/${d.id}/file`, d.fileName!)} className="mt-2 text-xs font-semibold text-primary">
                  파일 열기
                </button>
              )}

              {d.type === 'CONSENT' && (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.members.map((m) => (
                      <Chip key={m.id} tone={m.signed ? 'green' : 'amber'}>
                        {m.id === me?.id ? '나' : m.name} {m.signed ? '✓' : '대기'}
                      </Chip>
                    ))}
                  </div>
                  {!s.mySigned && (
                    <Button size="sm" className="mt-3" disabled={sign.isPending} onClick={() => sign.mutate()}>
                      개인정보 수집·이용에 동의하고 서명하기
                    </Button>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = '';
        }}
      />
    </Screen>
  );
}

function Done({ s, onChat, onHome }: { s: SubmissionView; onChat: () => void; onHome: () => void }) {
  return (
    <Screen
      bottom={
        <CTABar>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="flex-1" onClick={onHome}>
              홈으로
            </Button>
            <Button size="lg" className="flex-1" onClick={onChat}>
              채팅방으로
            </Button>
          </div>
        </CTABar>
      }
    >
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
          <PartyPopper size={40} />
        </span>
        <p className="mt-4 text-2xl font-bold">제출했어요!</p>
        <p className="mt-1 text-sm text-sub">
          {s.contest.submitTo} · {dateTime(s.submittedAt)}
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3 px-5">
        <Card>
          <div className="grid grid-cols-[72px_1fr] gap-y-2 text-sm">
            <span className="text-muted">대회</span>
            <span className="font-semibold">{s.contest.title}</span>
            <span className="text-muted">팀</span>
            <span className="font-semibold">
              {s.teamName} · {s.members.length}명
            </span>
            <span className="text-muted">서류</span>
            <span className="font-semibold">{s.totalCount}개</span>
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-[15px] font-bold">어디까지 갔나요?</p>
          <ol className="flex flex-col gap-3">
            {s.timeline.map((st) => (
              <li key={st.step} className="flex items-start gap-3">
                <span className={cx('mt-1 size-3 shrink-0 rounded-full', st.done ? 'bg-primary' : st.revision ? 'bg-danger' : 'bg-line')} />
                <span className="flex-1">
                  <span className={cx('block text-sm font-semibold', !st.done && 'text-sub')}>{st.label}</span>
                  <span className="block text-xs text-muted">{st.done ? dateTime(st.at) : st.revision ? '보완 요청' : '진행 중'}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <p className="text-center text-xs text-sub">대회까지 끝까지 함께하면 모두 ‘완주 배지’를 받아요</p>
      </div>
    </Screen>
  );
}
