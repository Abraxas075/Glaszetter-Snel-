import { type DayKey, diffDays, formatDayMonth } from '../lib/dates';

interface Props {
  points: { day: DayKey; t: number }[];
  from: DayKey;
  to: DayKey;
  periodDays: Set<DayKey>;
  ovulationDays: DayKey[];
}

/** Lijngrafiek van de basale temperatuur, met menstruatiedagen (blauw) en ovulatie (groen). */
export function BbtChart({ points, from, to, periodDays, ovulationDays }: Props) {
  const W = 340;
  const H = 190;
  const pad = { l: 38, r: 10, t: 12, b: 26 };
  const span = Math.max(1, diffDays(from, to));
  const ts = points.map((p) => p.t);
  const lo = Math.floor((Math.min(...ts, 36.2) - 0.1) * 10) / 10;
  const hi = Math.ceil((Math.max(...ts, 36.9) + 0.1) * 10) / 10;
  const x = (d: DayKey) => pad.l + (diffDays(from, d) / span) * (W - pad.l - pad.r);
  const y = (t: number) => pad.t + (1 - (t - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo * 5) / 5; v <= hi + 1e-9; v += 0.2) ticks.push(Math.round(v * 10) / 10);
  const bw = (W - pad.l - pad.r) / (span + 1);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.t).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Grafiek van de basale temperatuur van ${formatDayMonth(from)} tot ${formatDayMonth(to)}`}>
      {[...periodDays].filter((d) => d >= from && d <= to).map((d) => (
        <rect key={d} x={x(d) - bw / 2} y={pad.t} width={bw} height={H - pad.t - pad.b} className="fill-period-soft" opacity="0.7" />
      ))}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth="1" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" className="fill-muted">
            {v.toFixed(1).replace('.', ',')}
          </text>
        </g>
      ))}
      {ovulationDays.filter((d) => d >= from && d <= to).map((d) => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={pad.t} y2={H - pad.b} className="stroke-ovul" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={x(d)} y={pad.t + 8} textAnchor="middle" fontSize="8" className="fill-ovul font-bold">
            ovulatie
          </text>
        </g>
      ))}
      <path d={line} fill="none" className="stroke-accent" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.t)} r="3" className="fill-accent stroke-card" strokeWidth="1.5" />
      ))}
      <text x={pad.l} y={H - 8} fontSize="9" className="fill-muted">
        {formatDayMonth(from)}
      </text>
      <text x={W - pad.r} y={H - 8} fontSize="9" textAnchor="end" className="fill-muted">
        {formatDayMonth(to)}
      </text>
    </svg>
  );
}
