/**
 * Hypothetical repetition model.
 *
 * A purely conceptual model of how a *repeated behavioral pattern* can be
 * represented computationally. It does not model brain tissue, aMCC activity or
 * growth, brain volume, willpower, cognitive ageing, dementia or any health
 * outcome. Every number in it is an assumption, and most can be changed.
 *
 * Inputs
 *   R, E, C0       effort-reward simulation (sliders; see effortModel.ts)
 *   profile        self-reported behavioral profile (see journey.ts):
 *                    start (take it on right away), ret (come back later),
 *                    focus (continue through a distraction), swing (day-to-day variation)
 *   perDay, adaptation, decay   assumptions about repetition
 *
 * State: a dimensionless "follow-through index" I ∈ [0, 1], starting at 0.5.
 *
 * At every modeled challenging moment n (on day d):
 *   c   = C0 × (1 − γ (I − 0.5))                 effort counts slightly less as I rises
 *   pM  = σ(k (R − E × c))                       effort-reward model
 *   s   = clamp(w·start + (1 − w)·pM + swing·energy(d))   taken on right away
 *   q   = s·(focus + (1 − focus)·ret) + (1 − s)·ret     completed (directly or after returning)
 *   I  ← I + α q (1 − I) − β (1 − q) I
 *
 * Each moment is assumed to contain one tempting distraction. The update uses
 * expected values (deterministic), so the curves are smooth and reproducible.
 */

import type { Profile } from '../data/journey';
import { sigmoid, SIGMOID_K } from './effortModel';

export type Horizon = '10m' | '10mo' | '10y';

export interface TrajectoryParams {
  R: number; // 0–1
  E: number; // 0–1
  C0: number; // 0–2
  profile: Profile;
  /** Challenging moments per day (used for months / years) */
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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Deterministic day-to-day "energy" wave in [−1, 1] (a weekly and a slower rhythm). */
export const energy = (day: number) => 0.6 * Math.sin((2 * Math.PI * day) / 7) + 0.4 * Math.sin((2 * Math.PI * day) / 23 + 1);

export interface HorizonSpec {
  id: Horizon;
  label: string;
  unit: string;
  span: number; // in units
  days: number;
  ticks: number[];
  fmt: (u: number) => string;
}

export const HORIZONS: Record<Horizon, HorizonSpec> = {
  '10m': { id: '10m', label: '10 minutes', unit: 'min', span: 10, days: 0, ticks: [0, 2, 4, 6, 8, 10], fmt: (u) => `${Math.round(u)} min` },
  '10mo': { id: '10mo', label: '10 months', unit: 'mo', span: 10, days: 304, ticks: [0, 2, 4, 6, 8, 10], fmt: (u) => `${u.toFixed(u < 1 ? 1 : 0)} mo` },
  '10y': { id: '10y', label: '10 years', unit: 'yr', span: 10, days: 3653, ticks: [0, 2, 4, 6, 8, 10], fmt: (u) => `${u.toFixed(u < 1 ? 1 : 0)} yr` },
};

export interface Moment {
  /** taken on right away */
  s: number;
  /** completed straight through (s × focus) */
  direct: number;
  /** completed after being set aside or interrupted */
  returned: number;
  /** completed in total */
  q: number;
}

/** One modeled challenging moment, given the current index and day. */
export function moment(p: TrajectoryParams, I: number, day: number): Moment {
  const { start, ret, focus, swing } = p.profile;
  const c = p.C0 * (1 - GAMMA * (I - 0.5));
  const pm = sigmoid(p.R - p.E * c, SIGMOID_K);
  const s = clamp01(BLEND_W * start + (1 - BLEND_W) * pm + swing * energy(day));
  const direct = s * focus;
  const returned = s * (1 - focus) * ret + (1 - s) * ret;
  return { s, direct, returned, q: direct + returned };
}

export interface Totals {
  moments: number;
  direct: number;
  returned: number;
  setAside: number;
  /** distractions continued through (one per started moment) */
  resisted: number;
}

export interface Series {
  /** x in horizon units, y = index 0–1 */
  points: { x: number; y: number }[];
  final: number;
  totals: Totals;
}

const MAX_POINTS = 240;

export function simulateTrajectory(p: TrajectoryParams, horizon: Exclude<Horizon, '10m'>): Series {
  const spec = HORIZONS[horizon];
  const perDay = Math.max(1, Math.round(p.perDay));
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const stride = Math.max(1, Math.floor(spec.days / MAX_POINTS));
  const points: { x: number; y: number }[] = [{ x: 0, y: I0 }];
  const totals: Totals = { moments: 0, direct: 0, returned: 0, setAside: 0, resisted: 0 };
  let I = I0;
  for (let d = 0; d < spec.days; d++) {
    for (let k = 0; k < perDay; k++) {
      const m = moment(p, I, d);
      totals.moments++;
      totals.direct += m.direct;
      totals.returned += m.returned;
      totals.setAside += 1 - m.q;
      totals.resisted += m.direct;
      I = I + alpha * m.q * (1 - I) - beta * (1 - m.q) * I;
    }
    if ((d + 1) % stride === 0 || d === spec.days - 1) points.push({ x: ((d + 1) / spec.days) * spec.span, y: I });
  }
  return { points, final: I, totals };
}

/** Same model with the behavioral profile replaced, for the reference lines. */
export const withProfile = (p: TrajectoryParams, profile: Profile): TrajectoryParams => ({ ...p, profile });
export const ALWAYS: Profile = { start: 1, ret: 1, focus: 1, swing: 0 };
export const NEVER: Profile = { start: 0, ret: 0, focus: 0, swing: 0 };

/** Fixed point of the index, ignoring the day-to-day swing. */
export function equilibrium(p: TrajectoryParams) {
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const flat = withProfile(p, { ...p.profile, swing: 0 });
  let I = I0;
  for (let i = 0; i < 200; i++) {
    const { q } = moment(flat, I, 0);
    const next = (alpha * q) / (alpha * q + beta * (1 - q));
    if (Math.abs(next - I) < 1e-7) return next;
    I = next;
  }
  return I;
}

/**
 * Day-by-day view for the 10-month notebook page: per day, the average share of
 * moments completed straight through, completed after returning, and set aside.
 */
export function dailyPattern(p: TrajectoryParams, days: number) {
  const alpha = alphaFrom(p.adaptation);
  const beta = betaFrom(p.decay);
  const perDay = Math.max(1, Math.round(p.perDay));
  const out: { s: number; direct: number; returned: number; index: number }[] = [];
  let I = I0;
  for (let d = 0; d < days; d++) {
    let s = 0;
    let direct = 0;
    let returned = 0;
    for (let k = 0; k < perDay; k++) {
      const m = moment(p, I, d);
      s += m.s;
      direct += m.direct;
      returned += m.returned;
      I = I + alpha * m.q * (1 - I) - beta * (1 - m.q) * I;
    }
    out.push({ s: s / perDay, direct: direct / perDay, returned: returned / perDay, index: I });
  }
  return out;
}

/* ---------- 10 minutes: one focused session ---------- */

export interface SessionEvent {
  t: number;
  kind: 'resisted' | 'paused' | 'stopped' | 'missed';
}

export interface Session {
  /** minute the task is taken on, or null if an easier alternative is chosen */
  startAt: number | null;
  /** segments of work on the task, in minutes */
  segments: { from: number; to: number }[];
  /** tempting distractions and what the modeled pattern does with each */
  events: SessionEvent[];
  minutes: number;
  /** probability of taking it on right away in this moment */
  s: number;
}

export const TEMPTATIONS = [3, 5.5, 8];
const PAUSE = 1.2;

/**
 * A deterministic sketch of ten minutes with three tempting distractions.
 *   start time      from s: ≥ 0.6 → minute 0, ≥ 0.4 → minute 1.5, else
 *                   minute 4 if ret ≥ 0.5 (comes back to it), otherwise an easier alternative
 *   distractions    the first round(3 × focus) are continued through; the next one
 *                   interrupts the task — it resumes after ~1 min if ret ≥ 0.5, otherwise it stops
 */
export function sessionPlan(p: TrajectoryParams): Session {
  const { s } = moment(withProfile(p, { ...p.profile, swing: 0 }), I0, 0);
  const { ret, focus } = p.profile;
  const comesBack = ret >= 0.5;
  const startAt = s >= 0.6 ? 0 : s >= 0.4 ? 1.5 : comesBack ? 4 : null;
  const events: SessionEvent[] = [];
  const segments: { from: number; to: number }[] = [];
  if (startAt === null) {
    TEMPTATIONS.forEach((t) => events.push({ t, kind: 'missed' }));
    return { startAt, segments, events, minutes: 0, s };
  }
  let budget = Math.round(3 * focus);
  let from = startAt;
  let working = true;
  for (const t of TEMPTATIONS) {
    if (t < startAt) {
      events.push({ t, kind: 'missed' });
      continue;
    }
    if (!working) {
      events.push({ t, kind: 'missed' });
      continue;
    }
    if (budget > 0) {
      budget--;
      events.push({ t, kind: 'resisted' });
      continue;
    }
    segments.push({ from, to: t });
    if (comesBack) {
      events.push({ t, kind: 'paused' });
      from = t + PAUSE;
      budget = 1; // after returning, the next distraction is continued through
    } else {
      events.push({ t, kind: 'stopped' });
      working = false;
    }
  }
  if (working && from < 10) segments.push({ from, to: 10 });
  const minutes = segments.reduce((sum, g) => sum + (g.to - g.from), 0);
  return { startAt, segments, events, minutes, s };
}
