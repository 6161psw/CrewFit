import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SOURCE_LABEL, type ContestCard as Contest, type TeamCard as Team } from '../../api/types';
import { Avatar, Chip } from '../../components/ui';
import { categoryColor, cx, dDayLabel } from '../../lib/format';

/** 공모전 카드 (H-01) */
export function ContestCard({ c }: { c: Contest }) {
  const nav = useNavigate();
  const scope = c.scope === 'SCHOOL' ? '교내' : c.scope === 'REGION' ? '연합' : '전국';
  return (
    <button onClick={() => nav(`/contests/${c.id}`)} className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface py-3.5 pr-3 pl-3.5 text-left">
      <span className={cx('grid size-16 shrink-0 place-items-center rounded-xl text-[15px] font-bold text-white', categoryColor(c.categoryLabel))}>{c.categoryLabel}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-xs font-medium text-muted">
          {c.organizer} · {scope}
        </span>
        <span className="truncate text-[15px] font-semibold">{c.title}</span>
        <span className="flex items-center gap-2">
          <Chip tone="red">{dDayLabel(c.dDay)}</Chip>
          {c.source && c.source !== 'MANUAL' && <Chip>{SOURCE_LABEL[c.source]}</Chip>}
          <span className="text-xs font-semibold text-primary">모집 중인 팀 {c.recruitingTeamCount}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-center pr-0.5 pl-1">
        <Heart size={22} className={c.isInterested ? 'fill-danger text-danger' : 'text-danger'} />
        <span className="text-xs font-semibold text-sub">{c.interestCount}</span>
      </span>
    </button>
  );
}

/** 모집 채팅방 카드 (H-02, H-03 팀 목록) */
export function TeamCard({ t, showContest = true }: { t: Team; showContest?: boolean }) {
  const nav = useNavigate();
  const d = Math.ceil((new Date(t.contest.deadline).getTime() - Date.now()) / 86_400_000);
  return (
    <button onClick={() => nav(`/teams/${t.id}`)} className="w-full rounded-2xl border border-line bg-surface p-3.5 text-left">
      {showContest && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="truncate rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{t.contest.title}</span>
          <Chip tone="red">{dDayLabel(d)}</Chip>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="flex -space-x-2">
          {Array.from({ length: Math.min(t.memberCount, 3) }).map((_, i) => (
            <span key={i} className={cx('size-6 rounded-full border-2 border-surface', ['bg-primary', 'bg-accent', 'bg-sub'][i])} />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold">{t.name}</span>
            {t.badgeHidden && <Chip>배지 숨김</Chip>}
          </span>
          <span className="block truncate text-xs text-sub">
            {t.lastMessage ? `${t.lastMessage.senderName ?? '알림'}: ${t.lastMessage.content}` : t.description || `방장 ${t.leader.name}`}
          </span>
        </span>
        <span className="text-xs font-semibold text-primary">● 모집 중</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex flex-wrap gap-1.5">
          {t.openRoles.length ? (
            t.openRoles.map((r) => (
              <span key={r.id} className="rounded-md border border-line px-2 py-0.5 text-xs text-sub">
                {r.name} {r.open}
              </span>
            ))
          ) : (
            <span className="rounded-md border border-line px-2 py-0.5 text-xs text-sub">자리 없음</span>
          )}
        </span>
        <span className="text-[13px] font-bold text-primary">
          {t.memberCount}/{t.capacity}명
        </span>
      </div>
    </button>
  );
}

/** 사람 한 줄 (H-04, 팀원 목록) */
export function PersonRow({
  name,
  picture,
  line,
  skills,
  stat,
  onClick,
}: {
  name: string;
  picture?: string | null;
  line: string;
  skills?: string[];
  stat?: string | null;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-line bg-surface px-5 py-3.5 text-left">
      <Avatar name={name} src={picture} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{name}</span>
        <span className="block truncate text-xs text-sub">{line}</span>
        {!!skills?.length && (
          <span className="mt-1 flex flex-wrap gap-1">
            {skills.slice(0, 4).map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </span>
        )}
      </span>
      {stat && <Chip tone="amber">{stat}</Chip>}
    </button>
  );
}
