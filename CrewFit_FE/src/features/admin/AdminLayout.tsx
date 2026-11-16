import { useQuery } from '@tanstack/react-query';
import { Bell, FileText, LayoutGrid, LogOut, Megaphone, Send, Settings, Trophy, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { useLogout } from '../../auth/auth';
import { Avatar } from '../../components/ui';
import { cx } from '../../lib/format';
import type { AdminMe, Dashboard } from './types';

const MENU = [
  { to: '/admin', label: '대시보드', Icon: LayoutGrid, end: true },
  { to: '/admin/contests', label: '대회 · 공고', Icon: Trophy, end: true },
  { to: '/admin/teams', label: '지원 팀', Icon: Users, end: false, badge: true },
  { to: '/admin/documents', label: '서류 보관함', Icon: FileText, end: false },
  { to: '/admin/forward', label: '운영사 전달', Icon: Send, end: false },
  { to: '/admin/contests/new', label: '공고 등록', Icon: Megaphone, end: true },
];

/** 크루핏 for School 레이아웃 (PC) */
export function AdminLayout() {
  const nav = useNavigate();
  const logout = useLogout();
  const me = useQuery({ queryKey: ['admin', 'me'], queryFn: () => api.get<AdminMe>('/admin/me') });
  const dash = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api.get<Dashboard>('/admin/dashboard') });
  const m = me.data;

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-xl font-bold text-primary">크루핏</span>
          <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">for School</span>
        </div>
        <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-canvas p-3">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">{m?.school?.shortName.slice(0, 1) ?? 'C'}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{m?.school?.shortName ?? '크루핏 관리자'}</span>
            <span className="block truncate text-[11px] text-sub">{m?.department ?? (m?.role === 'SUPER_ADMIN' ? '최고 관리자' : '')}</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {MENU.map(({ to, label, Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm', isActive ? 'bg-primary-soft font-bold text-primary' : 'text-ink hover:bg-canvas')}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge && !!dash.data?.review.count && <span className="rounded-full bg-accent px-2 text-[11px] font-bold text-white">{dash.data.review.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          {m?.licenseExpiresAt && (
            <div className="rounded-xl bg-primary-soft p-3">
              <p className="text-xs font-bold text-primary">학교 연간 라이선스</p>
              <p className="text-[11px] text-sub">{new Date(m.licenseExpiresAt).toLocaleDateString('ko-KR')}까지 · 학생 무료</p>
            </div>
          )}
          <NavLink to="/admin/settings" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-canvas">
            <Settings size={18} /> 설정
          </NavLink>
          <button
            onClick={async () => {
              await logout();
              nav('/admin/login', { replace: true });
            }}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-sub hover:bg-canvas"
          >
            <LogOut size={18} /> 로그아웃
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 border-b border-line bg-surface px-8">
          <button className="grid size-9 place-items-center rounded-lg border border-line" aria-label="알림">
            <Bell size={16} />
          </button>
          {m && (
            <div className="flex items-center gap-2">
              <Avatar name={m.name} size={32} />
              <div>
                <p className="text-sm font-bold">{m.name} 선생님</p>
                <p className="text-[11px] text-sub">{[m.department, '관리자'].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
