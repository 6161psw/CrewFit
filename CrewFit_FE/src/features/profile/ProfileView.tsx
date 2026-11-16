import { BadgeCheck, Star, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Profile } from '../../api/types';
import { Avatar, Card, Chip, SectionTitle } from '../../components/ui';
import { majorYear } from '../../lib/format';

/** 프로필 공용 (H-05 / T-07 / E-03) */
export function ProfileHead({ p, extra }: { p: Profile; extra?: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3.5">
        <Avatar name={p.name} src={p.picture} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xl font-bold">{p.name}</p>
            {p.schoolVerified && p.school && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                <BadgeCheck size={12} />
                {p.school.shortName} 인증
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-sub">{majorYear(p.major, p.admissionYear) || '학과 정보 없음'}</p>
        </div>
      </div>
      {!!p.skills.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.skills.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-3 border-t border-line pt-3 text-center">
        <Stat v={p.stats.completionRate !== null ? `${p.stats.completionRate}%` : '—'} l="완주율" accent />
        <Stat v={`${p.stats.contestCount}개`} l="참여 공모전" />
        <Stat v={`${p.stats.awardCount}개`} l="수상" />
      </div>
      {extra}
    </Card>
  );
}

function Stat({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <div>
      <p className={accent ? 'text-lg font-bold text-primary' : 'text-lg font-bold'}>{v}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  );
}

export function ProfileHistory({ p }: { p: Profile }) {
  return (
    <Card>
      <SectionTitle>크루핏에서 참여한 공모전</SectionTitle>
      {p.history.length ? (
        <div className="flex flex-col gap-2.5">
          {p.history.map((h) => (
            <div key={h.teamId} className="flex items-center gap-2">
              <Trophy size={18} className="shrink-0 text-accent" />
              <p className="min-w-0 flex-1 truncate text-sm">
                {h.contest.title} <span className="text-muted">· {h.teamName}</span>
              </p>
              {h.award && <Chip tone="amber">{h.award}</Chip>}
              <Chip tone="green">{h.outcome === 'COMPLETED' ? '완주' : h.teamStatus === 'SUBMITTED' ? '제출 완료' : h.teamStatus === 'RECRUITING' ? '모집 중' : '진행 중'}</Chip>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">아직 기록이 없어요 · 첫 참여</p>
      )}
    </Card>
  );
}

export function ProfileBadges({ p }: { p: Profile }) {
  return (
    <Card>
      <SectionTitle>완주 배지</SectionTitle>
      {p.badges.length ? (
        <div className="grid grid-cols-3 gap-2">
          {p.badges.map((b) => (
            <div key={b.code} className="flex flex-col items-center gap-1 rounded-xl bg-accent-soft py-3" title={b.description}>
              <Star size={22} className="fill-accent text-accent" />
              <span className="text-[11px] font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">대회를 끝까지 완주하면 배지를 받아요</p>
      )}
    </Card>
  );
}

export function ProfileEssay({ p, right }: { p: Profile; right?: ReactNode }) {
  const { oneLiner, role, experience, updatedAt } = p.intro;
  const empty = !oneLiner && !role && !experience;
  return (
    <Card>
      <SectionTitle right={right ?? (updatedAt && <span className="text-[11px] text-muted">{new Date(updatedAt).toLocaleDateString('ko-KR')} 수정</span>)}>자기소개서</SectionTitle>
      {empty ? (
        <p className="text-sm text-muted">아직 자소서가 없어요</p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {oneLiner && <p className="font-semibold">{oneLiner}</p>}
          {role && (
            <div>
              <p className="text-[13px] font-semibold text-sub">Q. 팀에서 맡고 싶은 역할</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{role}</p>
            </div>
          )}
          {experience && (
            <div>
              <p className="text-[13px] font-semibold text-sub">Q. 끝까지 해낸 경험</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{experience}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
