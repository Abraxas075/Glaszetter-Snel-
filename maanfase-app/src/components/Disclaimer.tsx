import { DISCLAIMER } from '../lib/types';
import { Icon } from './ui';

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <aside role="note" className={`flex gap-3 rounded-2xl border border-line bg-lav/50 p-3 text-sm leading-snug text-ink ${className}`}>
      <Icon name="info" className="mt-0.5 size-5 shrink-0 text-accent" />
      <p>{DISCLAIMER}</p>
    </aside>
  );
}
