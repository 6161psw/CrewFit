import { House, MessageCircle, User } from 'lucide-react';
import { NavLink } from 'react-router';
import { cx } from '../lib/format';

const TABS = [
  { to: '/', label: '홈', Icon: House, end: true },
  { to: '/chats', label: '채팅', Icon: MessageCircle, end: false },
  { to: '/me', label: '내 정보', Icon: User, end: false },
];

/** 하단 탭: 홈 · 채팅 · 내 정보 */
export function BottomNav({ chatDot }: { chatDot?: boolean }) {
  return (
    <nav className="flex border-t border-line bg-surface px-6 pt-2.5 pb-[max(env(safe-area-inset-bottom),20px)]">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="flex flex-1 flex-col items-center gap-1">
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon size={24} className={isActive ? 'text-primary' : 'text-muted'} />
                {label === '채팅' && chatDot && <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-danger" />}
              </span>
              <span className={cx('text-[11px]', isActive ? 'font-semibold text-primary' : 'font-medium text-muted')}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
