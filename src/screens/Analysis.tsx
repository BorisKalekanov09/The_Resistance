import { useMemo } from 'react';
import type { LabCategory } from '../data/categoryLab';
import { FACTOR_META, labCategory, labQuestions } from '../data/categoryLab';
import type { ModelResult } from '../model/effortModel';
import { band } from '../model/effortModel';
import type { CategoryResult, Choices, FactorKey } from '../model/categoryModel';
import {
  FACTOR_FIELD,
  FACTOR_KEYS,
  JITTER,
  K,
  KAPPA,
  LAMBDA,
  MC_N,
  TAU,
  W_D,
  W_I,
  evaluate,
  factorsFrom,
  gradients,
  referenceFactors,
  shapley,
  tippingPoints,
  uncertainty,
} from '../model/categoryModel';
import AnimatedNumber from '../ui/AnimatedNumber';
import SigmoidPlot from '../ui/SigmoidPlot';
import { useSize } from '../ui/useSize';

interface Props {
  domain: LabCategory;
  choices: Choices;
  /** Result of the first (simple) test, for comparison */
  first: { label: string; result: ModelResult };
  onAnother: () => void;
  onChangeAnswers: () => void;
  onReplay: () => void;
}

const f2 = (n: number) => (n < 0 ? `−${Math.abs(n).toFixed(2)}` : n.toFixed(2));
const f3 = (n: number) => (n < 0 ? `−${Math.abs(n).toFixed(3)}` : n.toFixed(3));
const pct = (p: number) => Math.round(p * 100);
const pts = (p: number) => `${p >= 0 ? '+' : '−'}${Math.abs(p * 100).toFixed(1)}`;

/** Express a category result in the shape the shared sigmoid plot expects. */
const asModelResult = (r: CategoryResult): ModelResult => ({
  inputs: { effort: r.E * 10, reward: r.R * 10, sensitivity: r.C * 5 },
  R: r.R,
  E: r.E,
  C: r.C,
  k: K,
  cost: r.cost,
  value: r.V,
  tendency: r.P,
});

const WHY: Record<FactorKey, [string, string]> = {
  duration: ['A shorter session lowers the time part of the effort.', 'A longer session raises the time part of the effort.'],
  intensity: ['Lighter work lowers the effort term.', 'Harder work raises the effort term, which is multiplied by your sensitivity.'],
  value: ['Higher importance raises the reward before any discounting.', 'Lower importance shrinks the reward before any discounting.'],
  delay: ['A sooner benefit is barely discounted.', 'A distant benefit is discounted hyperbolically: R is divided by (1 + κD).'],
  certainty: ['More certainty keeps more of the reward.', 'Doubt multiplies the reward by a smaller q.'],
  energy: ['More energy lowers how strongly effort counts (C).', 'Fatigue raises C, so every unit of effort weighs more.'],
};

export default function Analysis({ domain, choices, first, onAnother, onChangeAnswers, onReplay }: Props) {
  const cat = labCategory(domain)!;
  const questions = useMemo(() => labQuestions(domain), [domain]);

  const { r, ref, phi, grad, tip, mc } = useMemo(() => {
    const x = factorsFrom(choices);
    const refX = referenceFactors();
    const r = evaluate(x);
    return {
      r,
      ref: evaluate(refX),
      phi: shapley(x, refX),
      grad: gradients(r),
      tip: tippingPoints(r),
      mc: uncertainty(x),
    };
  }, [choices]);

  const ranked = [...FACTOR_KEYS].sort((a, b) => Math.abs(phi[b]) - Math.abs(phi[a]));
  const maxPhi = Math.max(0.001, ...FACTOR_KEYS.map((k) => Math.abs(phi[k])));
  const top = ranked[0];
  const x = r.factors;

  return (
    <section className="screen analysis">
      <header className="an-head reveal-1">
        <p className="label">Technical simulation · {cat.label}</p>
        <div className="an-hero">
          <div className={`big-number band-${band(r.P)}`} aria-label={`${pct(r.P)} percent`}>
            <AnimatedNumber value={r.P * 100} duration={1200} />
            <span className="pct">%</span>
          </div>
          <div className="an-hero-text">
            <p className="h3">
              Simulated tendency to start {cat.noun} now, instead of postponing.
            </p>
            <p className="small">
              80% interval under ±{JITTER * 100}% input noise: <span className="mono">{pct(mc.p10)}–{pct(mc.p90)}%</span>{' '}
              (median {pct(mc.p50)}%, {MC_N.toLocaleString('en')} Monte Carlo runs).
            </p>
            <p className="small">
              Biggest driver: <b>{FACTOR_META[top].name.toLowerCase()}</b> ({pts(phi[top])} percentage points versus
              the reference profile).
            </p>
          </div>
        </div>
      </header>

      <div className="an-grid">
        {/* ---------- 1. derivation ---------- */}
        <section className="an-card reveal-2">
          <span className="mono small muted">01 · From answers to numbers</span>
          <table className="an-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Your answer</th>
                <th className="r">Value</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const m = FACTOR_META[q.key];
                const v = x[FACTOR_FIELD[q.key]];
                return (
                  <tr key={q.key}>
                    <td>{m.name}</td>
                    <td className="muted">{q.options[choices[q.key]].label}</td>
                    <td className="r mono">
                      {m.symbol} = {m.fmt(v)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="an-card reveal-2">
          <span className="mono small muted">02 · The equations, with your numbers</span>
          <div className="equation mono an-eq">
            <div className="an-eq-c">Effort — intensity plus a saturating cost of time</div>
            <div>
              E = {W_I}·i + {W_D}·(1 − e<sup>−d/τ</sup>) = {W_I}·{x.i.toFixed(2)} + {W_D}·(1 − e<sup>−{x.d}/{TAU}</sup>) ={' '}
              <b>{f3(r.E)}</b>
            </div>
            <div className="an-eq-c">Reward — importance × certainty, hyperbolically discounted by delay</div>
            <div>
              R = q·r₀ / (1 + κD) = {x.q}·{x.r0} / (1 + {KAPPA}·{x.D}) = {(x.q * x.r0).toFixed(3)} × {r.discount.toFixed(3)} ={' '}
              <b>{f3(r.R)}</b>
            </div>
            <div className="an-eq-c">Sensitivity — fatigue makes effort weigh more</div>
            <div>
              C = 1 + λf = 1 + {LAMBDA}·{x.f} = <b>{f3(r.C)}</b>
            </div>
            <div className="an-eq-c">Action value and tendency</div>
            <div>
              V = R − E·C = {f3(r.R)} − {f3(r.E)}·{f3(r.C)} = {f3(r.R)} − {f3(r.cost)} = <b>{f3(r.V)}</b>
            </div>
            <div>
              P = 1 / (1 + e<sup>−{K}·V</sup>) = 1 / (1 + e<sup>{f2(-K * r.V)}</sup>) = <b>{r.P.toFixed(3)}</b>
            </div>
          </div>
          <p className="fine">
            V &gt; 0 means the discounted reward is larger than the weighted effort, so P is above 50%. k = {K} sets how
            sharply the S-curve switches between postponing and starting.
          </p>
        </section>

        {/* ---------- 2. curves ---------- */}
        <section className="an-card reveal-3">
          <span className="mono small muted">03 · Where you sit on the decision curve</span>
          <SigmoidPlot current={asModelResult(r)} history={[asModelResult(ref)]} k={K} />
          <p className="fine">
            Rust dot: your answers (V = {f2(r.V)}). Hollow dot: the reference profile (V = {f2(ref.V)}, P = {pct(ref.P)}%).
            The curve is steepest at V = 0, where small changes matter most.
          </p>
        </section>

        <section className="an-card reveal-3">
          <span className="mono small muted">04 · How waiting shrinks the reward</span>
          <DiscountChart r={r} />
          <p className="fine">
            Line: reward R as a function of delay D, with your importance and certainty. Dashed: the weighted effort E·C you
            must overcome. Where the line is above the dashed line, P &gt; 50%.
          </p>
        </section>

        {/* ---------- 3. why ---------- */}
        <section className="an-card an-wide reveal-4">
          <span className="mono small muted">05 · Why the simulation estimates {pct(r.P)}%</span>
          <p className="body">
            Start from a reference profile (the second option on every question): P<sub>ref</sub> = {pct(ref.P)}%. Each bar
            shows how much one of your answers moved the estimate away from it. These are exact Shapley values: each
            answer’s average effect over all 64 orders of swapping answers in, so they add up exactly to{' '}
            <span className="mono">
              {pct(r.P)} − {pct(ref.P)} = {pts(r.P - ref.P)}
            </span>{' '}
            points.
          </p>
          <ul className="shap">
            {ranked.map((k) => {
              const v = phi[k];
              const w = (Math.abs(v) / maxPhi) * 50;
              return (
                <li key={k}>
                  <div className="shap-label">
                    <span>{FACTOR_META[k].name}</span>
                    <span className="fine">{questions.find((q) => q.key === k)!.options[choices[k]].label}</span>
                  </div>
                  <div className="shap-track" aria-hidden>
                    <span className="shap-axis" />
                    <span
                      className={`shap-bar ${v >= 0 ? 'up' : 'down'}`}
                      style={v >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
                    />
                  </div>
                  <span className={`mono small shap-v ${v >= 0 ? 'up' : 'down'}`}>{pts(v)}</span>
                  <p className="fine shap-why">{Math.abs(v) < 0.0005 ? 'Same as the reference answer — no effect.' : WHY[k][v >= 0 ? 0 : 1]}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------- 4. sensitivity ---------- */}
        <section className="an-card reveal-4">
          <span className="mono small muted">06 · Sensitivity (derivatives at your point)</span>
          <div className="equation mono an-eq">
            <div>
              ∂P/∂V = k·P(1−P) = {K}·{r.P.toFixed(3)}·{(1 - r.P).toFixed(3)} = <b>{grad.dPdV.toFixed(3)}</b>
            </div>
            <div>
              ∂P/∂R = ∂P/∂V = <b>{grad.dPdR.toFixed(3)}</b>
            </div>
            <div>
              ∂P/∂E = −C·∂P/∂V = <b>{f3(grad.dPdE)}</b>
            </div>
            <div>
              ∂P/∂C = −E·∂P/∂V = <b>{f3(grad.dPdC)}</b>
            </div>
          </div>
          <ul className="an-list small">
            <li>
              +0.10 reward → about <b className="mono">{pts(grad.dPdR * 0.1)}</b> points
            </li>
            <li>
              −0.10 effort → about <b className="mono">{pts(-grad.dPdE * 0.1)}</b> points
            </li>
            <li>
              −0.10 sensitivity → about <b className="mono">{pts(-grad.dPdC * 0.1)}</b> points
            </li>
          </ul>
          <p className="fine">
            Linear approximations. Since P(1−P) peaks at P = 0.5, the same change matters most near a 50/50 decision and
            very little when the outcome is already lopsided.
          </p>
        </section>

        <section className="an-card reveal-4">
          <span className="mono small muted">07 · Tipping points (P = 50% ⇔ R = E·C)</span>
          <ul className="tips">
            <li>
              <span className="label">Longest delay that still tips toward starting</span>
              <span className="stat mono">
                {tip.maxDelay === null ? 'none' : tip.maxDelay > 3650 ? '> 10 yr' : `${Math.round(tip.maxDelay)} days`}
              </span>
              <span className="fine">
                {tip.maxDelay === null
                  ? `Even an immediate reward (q·r₀ = ${(x.q * x.r0).toFixed(2)}) is below the weighted effort (${r.cost.toFixed(2)}).`
                  : `D* = (q·r₀ / (E·C) − 1) / κ. Yours is ${x.D} days.`}
              </span>
            </li>
            <li>
              <span className="label">Most effort the reward can carry</span>
              <span className="stat mono">E* = {tip.maxEffort.toFixed(2)}</span>
              <span className="fine">E* = R / C. Yours is {r.E.toFixed(2)}.</span>
            </li>
            <li>
              <span className="label">Least certainty needed</span>
              <span className="stat mono">{tip.minCertainty > 1 ? '> 100%' : `q* = ${pct(tip.minCertainty)}%`}</span>
              <span className="fine">
                q* = E·C·(1 + κD) / r₀. Yours is {pct(x.q)}%.
                {tip.minCertainty > 1 ? ' No level of certainty is enough with this effort and delay.' : ''}
              </span>
            </li>
          </ul>
        </section>

        {/* ---------- 5. comparison ---------- */}
        <section className="an-card an-wide reveal-5">
          <span className="mono small muted">08 · Compared with your first test</span>
          <div className="compare">
            <div>
              <span className="label">First test · {first.label}</span>
              <span className="stat mono">{pct(first.result.tendency)}%</span>
              <span className="fine">
                3 inputs set by your answers: R = {first.result.R.toFixed(2)}, E = {first.result.E.toFixed(2)}, C ={' '}
                {first.result.C.toFixed(2)} → V = {f2(first.result.value)}
              </span>
            </div>
            <div>
              <span className="label">This test · {cat.label}</span>
              <span className="stat mono">{pct(r.P)}%</span>
              <span className="fine">
                6 answers → R = {r.R.toFixed(2)}, E = {r.E.toFixed(2)}, C = {r.C.toFixed(2)} → V = {f2(r.V)}
              </span>
            </div>
          </div>
          <p className="fine">
            Same final equation (V = R − E·C, P = σ(kV)), but here R, E and C are built from measurable-sounding parts —
            time, difficulty, delay, certainty, energy — instead of being set directly.
          </p>
        </section>

        <details className="fold an-wide reveal-5">
          <summary>Model constants and assumptions</summary>
          <div className="fold-body">
            <ul className="an-list small">
              <li>
                <span className="mono">τ = {TAU} h</span> — after one hour, the time cost reaches 63% of its maximum
                (1 − e<sup>−1</sup>).
              </li>
              <li>
                <span className="mono">
                  w<sub>I</sub> = {W_I}, w<sub>D</sub> = {W_D}
                </span>{' '}
                — effort is mostly how hard the task is, partly how long.
              </li>
              <li>
                <span className="mono">κ = {KAPPA}/day</span> — hyperbolic discounting, the form most often fitted to human
                delay choices; a reward 50 days away keeps half its value.
              </li>
              <li>
                <span className="mono">λ = {LAMBDA}</span> — when drained (f = 1), effort counts {1 + LAMBDA}× as much.
              </li>
              <li>
                <span className="mono">k = {K}</span> — same sigmoid slope as the first test.
              </li>
              <li>Uncertainty: each input jittered uniformly by ±{JITTER * 100}%, {MC_N} runs, fixed seed (reproducible).</li>
            </ul>
            <p className="fine">
              The constants are chosen for teaching, not fitted to data. This is an illustrative model inspired by
              effort- and delay-discounting research — not a measurement of you, your brain, or what you will do.
            </p>
          </div>
        </details>
      </div>

      <div className="row-actions an-actions">
        <button className="btn btn-primary" onClick={onAnother}>
          Test another category →
        </button>
        <button className="link" onClick={onChangeAnswers}>
          ← Change these answers
        </button>
        <button className="link" onClick={onReplay}>
          Replay from the start ↺
        </button>
      </div>
    </section>
  );
}

const DMAX = 200;

/** R(D) = q·r₀ / (1 + κD), with the effort threshold E·C. */
function DiscountChart({ r }: { r: CategoryResult }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const h = 160;
  const pad = { l: 34, r: 10, t: 10, b: 26 };
  const w = Math.max(220, width);
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const ymax = Math.max(1, r.cost * 1.1);
  const sx = (d: number) => pad.l + (Math.min(d, DMAX) / DMAX) * iw;
  const sy = (v: number) => pad.t + (1 - Math.min(v, ymax) / ymax) * ih;
  const base = r.factors.q * r.factors.r0;
  const Rof = (d: number) => base / (1 + KAPPA * d);

  let path = '';
  for (let i = 0; i <= 100; i++) {
    const d = (i / 100) * DMAX;
    path += `${i ? 'L' : 'M'}${sx(d).toFixed(1)},${sy(Rof(d)).toFixed(1)}`;
  }

  return (
    <div ref={ref} className="sigmoid">
      <svg width={w} height={h} role="img" aria-label="Reward as a function of delay, compared with the weighted effort">
        {[0, 0.5, 1].filter((v) => v <= ymax).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={sy(v)} y2={sy(v)} className="grid" />
            <text x={pad.l - 6} y={sy(v) + 3} className="axis-t" textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {[0, 50, 100, 150, 200].map((d) => (
          <text key={d} x={sx(d)} y={h - 8} className="axis-t" textAnchor="middle">
            {d}d
          </text>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={sy(r.cost)} y2={sy(r.cost)} className="an-threshold" />
        <text x={w - pad.r} y={sy(r.cost) - 5} className="axis-t an-threshold-t" textAnchor="end">
          E·C = {r.cost.toFixed(2)}
        </text>
        <path d={path} className="sig-curve" />
        <g className="sig-now" style={{ transform: `translate(${sx(r.factors.D)}px, ${sy(r.R)}px)` }}>
          <circle r={9} className="sig-halo" />
          <circle r={4.5} className="sig-dot" />
        </g>
      </svg>
    </div>
  );
}
