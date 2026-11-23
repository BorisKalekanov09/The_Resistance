/**
 * Hypothetical long-term trajectory model.
 *
 * A purely conceptual model of how a *repeated behavioural pattern* could be
 * represented mathematically. It does not model brain tissue, aMCC growth,
 * brain volume, cognitive ageing, dementia or any health outcome.
 *
 * State: a dimensionless "persistence index" I ∈ [0, 1], starting at 0.5.
 *
 * At every modeled effortful decision n:
 *   c_n  = C0 × (1 − γ (I_n − 0.5))          adaptation: the index slightly lowers
 *                                             the modeled effort sensitivity
 *   pM_n = σ(k (R − E × c_n))                 effort model (same as the simulator)
 *   p_n  = w × pChoices + (1 − w) × pM_n      blend with the user's actual choice rate
 *   I_{n+1} = I_n + α p_n (1 − I_n) − β (1 − p_n) I_n
 *
 * The update is the *expected* change (deterministic), so the curve is smooth
 * and reproducible. Its fixed point is I* = α p / (α p + β (1 − p)).
 */

import { sigmoid, SIGMOID_K } from './effortModel';

export type Horizon = '10m' | '10mo' | '10y';

export interface TrajectoryParams {
  R: number; // 0–1
  E: number; // 0–1
  C0: number; // 0–2
  /** Fraction of effortful choices the user actually made (0–1) */
  pChoices: number;
  /** Effortful decisions per day (used for months / years) */
  perDay: number;
  /** Adaptation slider 1–10 */
  adaptation: number;
  /** Decay slider 1–10 */
  decay: number;
}

export const BLEND_W = 0.5;
export const GAMMA = 0.5;
export const I0 = 0.5;

export const alphaFrom = (slider: number) => slider * 0.0004;
export const betaFrom = (slider: number) => slider * 0.0004;

export interface HorizonSpec {
  id: Horizon;
  label: string;
  unit: string;
  span: number; // in units
  events: (perDay: number) => number;
  ticks: number[];
  fmt: (u: number) => string;
}

export const HORIZONS: Record<Horizon, HorizonSpec> = {
  '10m': {
    id: '10m',
    label: '10 minutes',
    unit: 'min',
    span: 10,
    // a focused session: about one effortful micro-decision per minute
    events: () => 10,
    ticks: [0, 2, 4, 6, 8, 10],
    fmt: (u) => `${Math.round(u)} min`,
  },
  '10mo': {
    id: '10mo',
    label: '10 months',
    unit: 'mo',
    span: 10,
    events: (d) => Math.round(d * 30.44 * 10),
    ticks: [0, 2, 4, 6, 8, 10],
    fmt: (u) => `${u.toFixed(u < 1 ? 1 : 0)} mo`,
  },
  '10y': {
    id: '10y',
    label: '10 years',
    unit: 'yr',
    span: 10,
    events: (d) => Math.round(d * 365.25 * 10),
    ticks: [0, 2, 4, 6, 8, 10],
    fmt: (u) => `${u.toFixed(u < 1 ? 1 : 0)} yr`,
  },
};

export interface Series {
  /** x in horizon units, y = index 0–1 */
  points: { x: number; y: number }[];
  final: number;
  events: number;
}

const MAX_POINTS = 240;

export function simulateTrajectory(
  p: TrajectoryParams,
  horizon: Horizon,
  pChoicesOverride?: number,
): Series {
  const spec = HORIZONS[horizon];
  const n = Math.max(1, spec.events(p.perDay));
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const pc = pChoicesOverride ?? p.pChoices;

  const stride = Math.max(1, Math.floor(n / MAX_POINTS));
  const points: { x: number; y: number }[] = [{ x: 0, y: I0 }];
  let I = I0;
  for (let i = 1; i <= n; i++) {
    const c = p.C0 * (1 - GAMMA * (I - 0.5));
    const pm = sigmoid(p.R - p.E * c, SIGMOID_K);
    const prob = BLEND_W * pc + (1 - BLEND_W) * pm;
    I = I + alpha * prob * (1 - I) - beta * (1 - prob) * I;
    if (i % stride === 0 || i === n) points.push({ x: (i / n) * spec.span, y: I });
  }
  return { points, final: I, events: n };
}

/** Fixed point found by iterating the same dynamics to convergence. */
export function equilibrium(p: TrajectoryParams, pChoicesOverride?: number) {
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const pc = pChoicesOverride ?? p.pChoices;
  let I = I0;
  for (let i = 0; i < 200; i++) {
    const c = p.C0 * (1 - GAMMA * (I - 0.5));
    const pm = sigmoid(p.R - p.E * c, SIGMOID_K);
    const prob = BLEND_W * pc + (1 - BLEND_W) * pm;
    const next = (alpha * prob) / (alpha * prob + beta * (1 - prob));
    if (Math.abs(next - I) < 1e-7) return next;
    I = next;
  }
  return I;
}

/**
 * Day-by-day view of the same dynamics: for each day, the modeled probability
 * of starting anyway (averaged over that day's `perDay` decisions) and the
 * index at the end of the day. Used by the 10-month notebook page.
 */
export function dailyPattern(p: TrajectoryParams, days: number) {
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const perDay = Math.max(1, Math.round(p.perDay));
  const out: { p: number; index: number }[] = [];
  let I = I0;
  for (let d = 0; d < days; d++) {
    let sum = 0;
    for (let k = 0; k < perDay; k++) {
      const c = p.C0 * (1 - GAMMA * (I - 0.5));
      const pm = sigmoid(p.R - p.E * c, SIGMOID_K);
      const prob = BLEND_W * p.pChoices + (1 - BLEND_W) * pm;
      sum += prob;
      I = I + alpha * prob * (1 - I) - beta * (1 - prob) * I;
    }
    out.push({ p: sum / perDay, index: I });
  }
  return out;
}
