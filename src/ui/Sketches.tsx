/**
 * Hand-drawn, pencil-style SVG illustrations for the "research notebook" timeline.
 * The wobble comes from an SVG turbulence filter; strokes "draw in" via pathLength.
 */
import type { ReactNode, SVGProps } from 'react';

/** Shared filters and hatch patterns. Render once per page. */
export function PencilDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="8" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.25" result="g2" />
          <feComposite in="d" in2="g2" operator="in" />
        </filter>
        <filter id="pencil-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id="hatch-rust" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--rust)" strokeWidth="1.3" opacity="0.75" />
        </pattern>
        <pattern id="hatch-lead" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--graphite)" strokeWidth="0.7" opacity="0.35" />
        </pattern>
      </defs>
    </svg>
  );
}

/** A pencil stroke: drawn twice with a slight offset, like a sketched line. */
function Stroke({ d, className = '', delay = 0, ...rest }: { d: string; className?: string; delay?: number } & SVGProps<SVGPathElement>) {
  return (
    <g className={`stroke ${className}`} style={{ ['--d' as string]: `${delay}s` }}>
      <path d={d} pathLength={1} className="draw" {...rest} />
      <path d={d} pathLength={1} className="draw ghost" transform="translate(0.7 0.5)" {...rest} />
    </g>
  );
}

const Hand = ({ x, y, children, anchor = 'start', className = '' }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; className?: string }) => (
  <text x={x} y={y} textAnchor={anchor} className={`hand ${className}`}>
    {children}
  </text>
);

/* ---------- Brain, medial (sagittal) view ---------- */

const CORTEX =
  'M60,160 C36,132 34,84 72,56 C108,30 176,20 232,36 C276,50 302,88 296,128 C292,150 278,162 258,166 C244,169 232,166 222,170 C208,176 196,174 186,170 C170,164 150,170 132,172 C110,176 84,178 60,160 Z';
const CALLOSUM =
  'M110,120 C128,98 196,92 222,114 C228,120 222,128 212,124 C190,110 140,110 122,126 C116,132 106,128 110,120 Z';
const CINGULATE = 'M96,124 C108,82 196,70 236,108';
const AMCC = 'M126,99 C140,87 162,81 188,82 C190,87 189,92 187,97 C165,95 147,99 132,108 C128,105 126,102 126,99 Z';
const SULCI = [
  'M84,72 C98,82 102,94 96,106',
  'M138,40 C146,56 138,66 150,80',
  'M196,34 C190,52 204,62 198,76',
  'M250,54 C240,70 254,80 244,96',
  'M282,96 C266,106 274,118 262,130',
  'M58,112 C72,108 78,120 90,116',
  'M70,146 C84,140 96,150 110,146',
  'M236,140 C248,132 262,140 274,134',
];
const CEREBELLUM = 'M232,170 C224,190 248,206 272,198 C294,190 296,170 282,160';
const FOLIA = ['M240,182 C252,176 270,178 284,172', 'M246,192 C258,186 272,188 286,182'];
const STEM = ['M196,170 C200,190 202,206 206,228', 'M218,170 C218,190 222,206 228,226'];

export type SketchMode = 'moment' | 'months' | 'years';

export function BrainSketch({ mode }: { mode: SketchMode }) {
  return (
    <svg viewBox="0 0 330 268" className="sketch brain-sketch" role="img" aria-label="Pencil sketch of the brain seen from the middle, with the anterior midcingulate cortex shaded">
      <g filter="url(#pencil)">
        <path d={CORTEX} fill="url(#hatch-lead)" stroke="none" className="fade-in" />
        <Stroke d={CORTEX} className="lead" />
        {SULCI.map((d, i) => (
          <Stroke key={d} d={d} className="lead thin" delay={0.25 + i * 0.05} />
        ))}
        <Stroke d={CEREBELLUM} className="lead" delay={0.5} />
        {FOLIA.map((d) => (
          <Stroke key={d} d={d} className="lead thin" delay={0.6} />
        ))}
        {STEM.map((d) => (
          <Stroke key={d} d={d} className="lead" delay={0.55} />
        ))}
        <Stroke d={CALLOSUM} className="lead" delay={0.4} />
        <Stroke d={CINGULATE} className="lead thin" delay={0.45} />
        <path d={AMCC} fill="url(#hatch-rust)" className="fade-in late" />
        <Stroke d={AMCC} className="rust" delay={0.7} />
      </g>

      {/* annotation: the aMCC */}
      <g className="annot-sketch" filter="url(#pencil-soft)">
        <Stroke d="M160,86 C164,60 176,30 196,14" className="rust thin" delay={0.9} />
        <Hand x={200} y={16} className="rust-ink">aMCC</Hand>
      </g>

      {mode === 'moment' && (
        <g filter="url(#pencil-soft)">
          <Hand x={56} y={254}>one moment, one choice</Hand>
        </g>
      )}
      {mode === 'months' && (
        <g filter="url(#pencil-soft)">
          <Stroke d="M120,120 C96,140 120,168 150,150 C176,134 158,104 134,116 C116,126 132,152 156,140" className="rust thin" delay={1.0} />
          <Hand x={56} y={254}>the same choice, again and again</Hand>
        </g>
      )}
      {mode === 'years' && (
        <g filter="url(#pencil-soft)">
          <Hand x={56} y={246}>same brain in every sketch —</Hand>
          <Hand x={56} y={264}>the model follows a habit, not tissue</Hand>
        </g>
      )}
    </svg>
  );
}

/* ---------- 10 minutes: a single balance ---------- */

export function BalanceSketch({ reward, cost }: { reward: number; cost: number }) {
  // positive value: reward is heavier → the reward (left) side goes down
  const v = reward - cost;
  const angle = Math.max(-16, Math.min(16, v * 32)); // degrees, + = left side down
  const rad = (angle * Math.PI) / 180;
  const cx = 165;
  const cy = 70;
  const half = 105;
  const L = { x: cx - half * Math.cos(rad), y: cy + half * Math.sin(rad) };
  const R = { x: cx + half * Math.cos(rad), y: cy - half * Math.sin(rad) };
  const pan = (p: { x: number; y: number }) =>
    `M${p.x - 34},${p.y + 52} Q${p.x},${p.y + 72} ${p.x + 34},${p.y + 52} M${p.x - 34},${p.y + 52} L${p.x},${p.y} L${p.x + 34},${p.y + 52}`;
  const rW = 10 + reward * 18;
  const cW = 10 + cost * 18;

  return (
    <svg viewBox="0 0 330 220" className="sketch" role="img" aria-label={`A balance: reward ${reward.toFixed(2)} against effort ${cost.toFixed(2)}`}>
      <g filter="url(#pencil)">
        <Stroke d={`M${cx},${cy} L${cx - 22},200 L${cx + 22},200 Z`} className="lead" />
        <Stroke d="M110,200 L220,200" className="lead" />
        <g className="beam">
          <Stroke d={`M${L.x},${L.y} L${R.x},${R.y}`} className="lead" delay={0.2} />
          <Stroke d={pan(L)} className="lead thin" delay={0.35} />
          <Stroke d={pan(R)} className="lead thin" delay={0.35} />
          <rect x={L.x - rW / 2} y={L.y + 52 - rW * 0.7} width={rW} height={rW * 0.7} rx={2} fill="url(#hatch-lead)" stroke="var(--graphite)" strokeWidth={1} className="fade-in late" />
          <rect x={R.x - cW / 2} y={R.y + 52 - cW * 0.7} width={cW} height={cW * 0.7} rx={2} fill="url(#hatch-rust)" stroke="var(--rust)" strokeWidth={1} className="fade-in late" />
        </g>
        <circle cx={cx} cy={cy} r={3.5} fill="var(--graphite)" />
      </g>
      <Hand x={L.x} y={L.y + 90} anchor="middle">reward</Hand>
      <Hand x={R.x} y={R.y + 90} anchor="middle" className="rust-ink">effort</Hand>
    </svg>
  );
}

/* ---------- 10 months: one mark per day ---------- */

export function MonthsSketch({ days }: { days: { p: number }[] }) {
  const cols = 30;
  const rows = Math.ceil(days.length / cols);
  const cell = 9.4;
  const x0 = 34;
  const y0 = 14;
  // deterministic dithering: a day is "started" when the running expected count crosses a whole number
  let acc = 0;
  const marks = days.map((d) => {
    const before = Math.floor(acc);
    acc += d.p;
    return Math.floor(acc) > before;
  });
  const perRow = Array.from({ length: rows }, (_, r) => marks.slice(r * cols, r * cols + cols).filter(Boolean).length);

  return (
    <svg viewBox={`0 0 ${x0 + cols * cell + 44} ${y0 + rows * cell + 22}`} className="sketch months" role="img" aria-label={`${marks.filter(Boolean).length} of ${days.length} days marked as started`}>
      <g filter="url(#pencil-soft)">
        {marks.map((on, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const x = x0 + c * cell + cell / 2;
          const y = y0 + r * cell + cell / 2;
          return on ? (
            <circle key={i} cx={x} cy={y} r={3.3} className="day on" style={{ animationDelay: `${0.004 * i}s` }} />
          ) : (
            <circle key={i} cx={x} cy={y} r={2.6} className="day off" style={{ animationDelay: `${0.004 * i}s` }} />
          );
        })}
      </g>
      {perRow.map((n, r) => (
        <g key={r}>
          <text x={x0 - 8} y={y0 + r * cell + cell / 2 + 3} textAnchor="end" className="axis-t">
            {r + 1}
          </text>
          <text x={x0 + cols * cell + 8} y={y0 + r * cell + cell / 2 + 3} className="axis-t">
            {n}/{cols}
          </text>
        </g>
      ))}
      <text x={x0 - 8} y={y0 - 4} textAnchor="end" className="axis-t">
        mo
      </text>
    </svg>
  );
}

/* ---------- 10 years: a single pencil curve ---------- */

export function YearsSketch({
  main,
  high,
  low,
}: {
  main: { x: number; y: number }[];
  high: { x: number; y: number }[];
  low: { x: number; y: number }[];
}) {
  const W = 330;
  const H = 210;
  const pad = { l: 34, r: 16, t: 14, b: 30 };
  const sx = (x: number) => pad.l + (x / 10) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - y) * (H - pad.t - pad.b);
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const end = main[main.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sketch" role="img" aria-label={`Hypothetical index after ten years: ${Math.round(end.y * 100)} out of 100`}>
      <g filter="url(#pencil-soft)">
        <Stroke d={`M${pad.l},${pad.t} L${pad.l},${H - pad.b} L${W - pad.r},${H - pad.b}`} className="lead thin" />
        <Stroke d={`M${pad.l},${sy(0.5)} L${W - pad.r},${sy(0.5)}`} className="lead faint" />
        <Stroke d={toPath(high)} className="lead faint dashed" delay={0.2} />
        <Stroke d={toPath(low)} className="lead faint dotted" delay={0.2} />
        <Stroke d={toPath(main)} className="rust bold" delay={0.4} />
        <circle cx={sx(end.x)} cy={sy(end.y)} r={4} fill="var(--rust)" className="fade-in late" />
      </g>
      {[0, 5, 10].map((t) => (
        <text key={t} x={sx(t)} y={H - pad.b + 16} textAnchor="middle" className="axis-t">
          {t === 0 ? 'now' : `${t} yr`}
        </text>
      ))}
      {[0, 50, 100].map((t) => (
        <text key={t} x={pad.l - 6} y={sy(t / 100) + 3} textAnchor="end" className="axis-t">
          {t}
        </text>
      ))}
      <Hand x={sx(10)} y={sy(high[high.length - 1].y) - 6} anchor="end" className="small-hand">if you always started</Hand>
      <Hand x={sx(10)} y={sy(low[low.length - 1].y) + 16} anchor="end" className="small-hand">if you always postponed</Hand>
    </svg>
  );
}
