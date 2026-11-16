import { ChevronDown, ChevronLeft, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { cx } from '../lib/format';

/** 모바일 화면 틀 (최대 430px) */
export function Screen({ children, bottom, className }: { children: ReactNode; bottom?: ReactNode; className?: string }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-canvas">
      <div className={cx('flex flex-1 flex-col', bottom ? 'pb-28' : 'pb-6', className)}>{children}</div>
      {bottom && <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px]">{bottom}</div>}
    </div>
  );
}

export function TopBar({ title, sub, right, back = true, onBack }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-10 flex min-h-[56px] items-center gap-2 bg-canvas/95 px-3 py-2 backdrop-blur">
      {back && (
        <button aria-label="뒤로" onClick={onBack ?? (() => nav(-1))} className="grid size-8 place-items-center rounded-lg">
          <ChevronLeft size={24} />
        </button>
      )}
      <div className={cx('min-w-0 flex-1', !back && 'pl-2')}>
        <p className="truncate text-[17px] font-bold">{title}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type BtnVariant = 'primary' | 'soft' | 'outline' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-primary text-white disabled:bg-line disabled:text-muted',
  soft: 'bg-primary-soft text-primary',
  outline: 'border border-line bg-surface text-ink',
  danger: 'bg-danger-soft text-danger',
  ghost: 'text-sub',
};

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-[52px] rounded-[14px] text-base' : size === 'sm' ? 'h-9 rounded-[10px] px-3 text-[13px]' : 'h-11 rounded-xl px-4 text-sm';
  return <button {...p} className={cx('inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-[0.99]', BTN[variant], s, className)} />;
}

/** 하단 고정 CTA */
export function CTABar({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border-t border-line bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
      {hint && <p className="mb-2 text-center text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

type ChipTone = 'gray' | 'green' | 'amber' | 'red' | 'dark';
const CHIP: Record<ChipTone, string> = {
  gray: 'bg-canvas text-sub',
  green: 'bg-primary-soft text-primary',
  amber: 'bg-accent-soft text-[#9a6400]',
  red: 'bg-danger-soft text-danger',
  dark: 'bg-ink text-white',
};

export function Chip({ tone = 'gray', children, className, onClick, active }: { tone?: ChipTone; children: ReactNode; className?: string; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag onClick={onClick} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold', active ? CHIP.dark : CHIP[tone], className)}>
      {children}
    </Tag>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('rounded-2xl border border-line bg-surface p-4', onClick && 'cursor-pointer active:bg-canvas', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[15px] font-bold">{children}</p>
      {right}
    </div>
  );
}

const AVATAR_COLORS = ['bg-primary', 'bg-accent', 'bg-sub', 'bg-danger', 'bg-ink'];
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  if (src) return <img src={src} alt="" style={{ width: size, height: size }} className={cx('shrink-0 rounded-full object-cover', className)} />;
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={cx('grid shrink-0 place-items-center rounded-full font-bold text-white', color, className)}>
      {name.slice(0, 1)}
    </span>
  );
}

/** 이니셜 사각 썸네일 (팀/대회) */
export function Thumb({ label, size = 48, className }: { label: string; size?: number; className?: string }) {
  return (
    <span style={{ width: size, height: size }} className={cx('grid shrink-0 place-items-center rounded-xl text-sm font-bold', className ?? 'bg-primary-soft text-primary')}>
      {label}
    </span>
  );
}

/** 내 학교 / 내 지역 / 전국 */
export function ScopeTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; sub?: string }[] }) {
  return (
    <div className="px-5 pb-3">
      <div className="flex gap-1 rounded-xl bg-line p-1">
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button key={it.value} onClick={() => onChange(it.value)} className={cx('flex flex-1 items-center justify-center gap-1 rounded-[9px] py-2', on && 'bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)]')}>
              <span className={cx('text-sm', on ? 'font-bold text-primary' : 'font-medium text-sub')}>{it.label}</span>
              {it.sub && <span className={cx('text-[11px] font-medium', on ? 'text-primary' : 'text-muted')}>{it.sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ▾ 정렬 버튼 */
export function SortMenu<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-lg border border-line bg-surface py-1 pr-2.5 pl-2 text-[13px] font-semibold">
        <ChevronDown size={14} />
        {cur?.label}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cx('block w-full px-3 py-2.5 text-left text-sm', o.value === value ? 'font-bold text-primary' : 'text-ink')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 아래에서 올라오는 시트 */
export function Sheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-surface px-5 pt-2.5 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <p className="text-[19px] font-bold">{title}</p>
        {sub && <p className="mt-0.5 text-[13px] text-sub">{sub}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/** PC 모달 (관리자) */
export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div style={{ maxWidth: width }} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="text-lg font-bold">{title}</p>
          <button onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Radio({ checked }: { checked: boolean }) {
  return <span className={cx('grid size-[22px] shrink-0 place-items-center rounded-full border-2', checked ? 'border-primary' : 'border-line')}>{checked && <span className="size-3 rounded-full bg-primary" />}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-sub">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary';

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted">{children}</div>;
}

export function Loading() {
  return <div className="py-12 text-center text-sm text-muted">불러오는 중…</div>;
}

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string, sub?: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; sub?: string; id: number } | null>(null);
  const show = useCallback((msg: string, sub?: string) => setT({ msg, sub, id: Date.now() }), []);
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => setT(null), 2600);
    return () => clearTimeout(h);
  }, [t]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div className="fixed inset-x-0 bottom-28 z-[60] mx-auto w-[min(358px,calc(100%-32px))] rounded-2xl bg-ink px-4 py-3 text-white shadow-xl">
          <p className="text-sm font-semibold">{t.msg}</p>
          {t.sub && <p className="text-xs text-white/70">{t.sub}</p>}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/** 에러 메시지 추출 */
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : '오류가 발생했어요');
