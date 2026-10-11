import { type ReactNode, useEffect } from 'react';

/* ---------- iconen (24×24, lijnstijl) ---------- */
const PATHS: Record<string, ReactNode> = {
  home: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
  calendar: (<><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  chart: (<><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></>),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  drop: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>),
  upload: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>),
  lock: (<><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  print: (<><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></>),
  info: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>),
  thermo: <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  trash: (<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'size-5', strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ---------- basis ---------- */
export function Card({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: 'rose' | 'lav' | 'soft' }) {
  const bg = tone === 'rose' ? 'bg-rose/60' : tone === 'lav' ? 'bg-lav/70' : tone === 'soft' ? 'bg-soft' : 'bg-card';
  return <section className={`rounded-3xl border border-line ${bg} p-4 shadow-sm ${className}`}>{children}</section>;
}

export function H2({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-ink">
      {icon && <Icon name={icon} className="size-5 text-accent" />}
      {children}
    </h2>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'period';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: IconName;
  'aria-label'?: string;
};

export function Button({ children, onClick, variant = 'soft', className = '', disabled, type = 'button', icon, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-accent text-white shadow-sm active:brightness-95',
    soft: 'bg-accent-soft text-accent active:brightness-95',
    ghost: 'bg-transparent text-muted border border-line active:bg-soft',
    danger: 'bg-moon-soft text-moon active:brightness-95',
    period: 'bg-period text-white shadow-sm active:brightness-95',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={rest['aria-label']}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition disabled:opacity-50 ${styles} ${className}`}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, tone = 'accent' }: { active?: boolean; onClick: () => void; children: ReactNode; tone?: 'accent' | 'period' | 'ovul' }) {
  const on = tone === 'period' ? 'bg-period text-white border-period' : tone === 'ovul' ? 'bg-ovul text-white border-ovul' : 'bg-accent text-white border-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? on : 'border-line bg-card text-ink active:bg-soft'}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-soft p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition ${value === o.value ? 'bg-card text-accent shadow-sm' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-1">
      <span>
        <span className="block text-base font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className="relative inline-block h-8 w-14 shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute left-1 top-1 size-6 rounded-full bg-white shadow transition peer-checked:translate-x-6" />
      </span>
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'block min-h-12 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

export function Stepper({ value, onChange, min, max, unit, label }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string; label: string }) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" aria-label={`${label} minder`} onClick={() => onChange(Math.max(min, value - 1))} className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent active:brightness-95">
        <Icon name="minus" />
      </button>
      <div className="min-w-24 text-center text-xl font-bold">
        {value} <span className="text-sm font-medium text-muted">{unit}</span>
      </div>
      <button type="button" aria-label={`${label} meer`} onClick={() => onChange(Math.min(max, value + 1))} className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent active:brightness-95">
        <Icon name="plus" />
      </button>
    </div>
  );
}

/** Onderblad (bottom sheet) dat het scherm vult op een telefoon. */
export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dagboek'}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-[2rem] bg-app shadow-2xl sm:rounded-[2rem]"
      >
        <header className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
          <div className="min-w-0 flex-1">{title}</div>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="grid size-11 shrink-0 place-items-center rounded-full bg-soft text-muted active:brightness-95">
            <Icon name="x" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <footer className="safe-bottom border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** Kleine pictogrammen van nieuwe en volle maan, ook los te gebruiken in de legenda. */
export function MoonDot({ kind, className = 'size-3' }: { kind: 'new' | 'full'; className?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-full ${className} ${kind === 'new' ? 'bg-newmoon ring-1 ring-line' : 'bg-fullmoon ring-1 ring-amber-600/40'}`} />;
}
