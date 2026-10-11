import { MoonDot } from './ui';

const Item = ({ swatch, label }: { swatch: React.ReactNode; label: string }) => (
  <li className="flex items-center gap-1.5 whitespace-nowrap">
    {swatch}
    <span>{label}</span>
  </li>
);

/** Legenda die er altijd bij hoort onder de kalender. */
export function Legend({ className = '' }: { className?: string }) {
  return (
    <ul aria-label="Legenda" className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink ${className}`}>
      <Item swatch={<span className="size-3.5 rounded bg-period" />} label="Menstruatie" />
      <Item swatch={<span className="hatch-blue size-3.5 rounded border border-dashed border-period/70" />} label="Verwacht" />
      <Item swatch={<span className="size-3 rounded-full bg-ovul ring-2 ring-ovul-soft" />} label="Ovulatie" />
      <Item swatch={<span className="hatch-green size-3.5 rounded border border-ovul/40" />} label="Vruchtbaar venster" />
      <Item swatch={<span className="h-1.5 w-4 rounded-full bg-moon" />} label="Maanfase (Jonas)" />
      <Item swatch={<MoonDot kind="new" />} label="Nieuwe maan" />
      <Item swatch={<MoonDot kind="full" />} label="Volle maan" />
    </ul>
  );
}
