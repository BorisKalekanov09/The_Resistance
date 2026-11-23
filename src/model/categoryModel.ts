/**
 * Technical category simulation — an extended, still illustrative, version of
 * the effort-reward model used in the main journey.
 *
 * Six answers are turned into six numbers, which are combined into the same
 * three quantities as the simple model (R, E, C) and then into V and P:
 *
 *   E = wI · i + wD · (1 − e^(−d/τ))      effort: intensity + saturating duration cost
 *   R = q · r₀ / (1 + κ · D)               reward: hyperbolic delay discounting × certainty
 *   C = 1 + λ · f                          effort sensitivity rises with fatigue
 *   V = R − E · C                          action value
 *   P = 1 / (1 + e^(−k·V))                 simulated action tendency
 *
 * "Why" is answered with exact Shapley values: each answer's average marginal
 * effect on P over all 2⁶ = 64 orderings of swapping reference → your answer.
 * They sum exactly to P − P_ref.
 *
 * NOT a validated psychological model and NOT a prediction of behaviour.
 */

import { SIGMOID_K, sigmoid } from './effortModel';

export const TAU = 1; // hours — duration at which the time cost reaches 63 % of its maximum
export const W_I = 0.6; // weight of intensity in effort
export const W_D = 0.4; // weight of duration in effort
export const KAPPA = 0.02; // per day — hyperbolic discount rate
export const LAMBDA = 0.6; // fatigue → sensitivity gain
export const K = SIGMOID_K;

export type FactorKey = 'duration' | 'intensity' | 'value' | 'delay' | 'certainty' | 'energy';
export const FACTOR_KEYS: FactorKey[] = ['duration', 'intensity', 'value', 'delay', 'certainty', 'energy'];

export interface Factors {
  /** hours */
  d: number;
  /** 0–1 */
  i: number;
  /** 0–1 */
  r0: number;
  /** days */
  D: number;
  /** 0–1 */
  q: number;
  /** fatigue 0–1 */
  f: number;
}

export const FACTOR_FIELD: Record<FactorKey, keyof Factors> = {
  duration: 'd',
  intensity: 'i',
  value: 'r0',
  delay: 'D',
  certainty: 'q',
  energy: 'f',
};

/** The numeric value behind each of the four options (same for every category). */
export const OPTION_VALUES: Record<FactorKey, number[]> = {
  duration: [0.25, 0.75, 1.5, 3],
  intensity: [0.25, 0.5, 0.75, 1],
  value: [0.4, 0.6, 0.8, 1],
  delay: [0, 3, 30, 180],
  certainty: [0.95, 0.75, 0.5, 0.3],
  energy: [0, 0.3, 0.6, 1],
};

/** Reference profile = the second option on every question. */
export const REFERENCE_CHOICE = 1;

export type Choices = Record<FactorKey, number>;

export function factorsFrom(choices: Choices): Factors {
  const out = {} as Factors;
  for (const key of FACTOR_KEYS) out[FACTOR_FIELD[key]] = OPTION_VALUES[key][choices[key]];
  return out;
}

export const referenceFactors = (): Factors =>
  factorsFrom(Object.fromEntries(FACTOR_KEYS.map((k) => [k, REFERENCE_CHOICE])) as Choices);

export interface CategoryResult {
  factors: Factors;
  /** 1 − e^(−d/τ) */
  timeCost: number;
  E: number;
  /** 1 / (1 + κD) */
  discount: number;
  R: number;
  C: number;
  cost: number;
  V: number;
  P: number;
}

export function evaluate(x: Factors): CategoryResult {
  const timeCost = 1 - Math.exp(-x.d / TAU);
  const E = W_I * x.i + W_D * timeCost;
  const discount = 1 / (1 + KAPPA * x.D);
  const R = x.q * x.r0 * discount;
  const C = 1 + LAMBDA * x.f;
  const cost = E * C;
  const V = R - cost;
  return { factors: x, timeCost, E, discount, R, C, cost, V, P: sigmoid(V, K) };
}

/* ---------- Why: exact Shapley attribution ---------- */

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** Contribution of each answer to P − P_ref, in probability units. Sums exactly to P − P_ref. */
export function shapley(x: Factors, ref: Factors): Record<FactorKey, number> {
  const n = FACTOR_KEYS.length;
  const cache = new Map<number, number>();
  const valueOf = (mask: number) => {
    const hit = cache.get(mask);
    if (hit !== undefined) return hit;
    const mixed = { ...ref };
    FACTOR_KEYS.forEach((k, j) => {
      if (mask & (1 << j)) mixed[FACTOR_FIELD[k]] = x[FACTOR_FIELD[k]];
    });
    const p = evaluate(mixed).P;
    cache.set(mask, p);
    return p;
  };
  const out = {} as Record<FactorKey, number>;
  FACTOR_KEYS.forEach((k, j) => {
    let phi = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      if (mask & (1 << j)) continue;
      let size = 0;
      for (let b = mask; b; b >>= 1) size += b & 1;
      const weight = (factorial(size) * factorial(n - size - 1)) / factorial(n);
      phi += weight * (valueOf(mask | (1 << j)) - valueOf(mask));
    }
    out[k] = phi;
  });
  return out;
}

/* ---------- Local sensitivity (gradients) ---------- */

export function gradients(r: CategoryResult) {
  const s = K * r.P * (1 - r.P); // dP/dV
  return {
    dPdV: s,
    dPdR: s,
    dPdE: -s * r.C,
    dPdC: -s * r.E,
  };
}

/* ---------- Tipping points (P = 50 % ⇔ V = 0 ⇔ R = E·C) ---------- */

export function tippingPoints(r: CategoryResult) {
  const { q, r0, D } = r.factors;
  const undiscounted = q * r0;
  // largest delay that still keeps P ≥ 50 %
  const maxDelay = undiscounted > r.cost ? (undiscounted / r.cost - 1) / KAPPA : null;
  // largest effort that still keeps P ≥ 50 %
  const maxEffort = r.R / r.C;
  // smallest certainty that keeps P ≥ 50 %
  const minCertainty = (r.cost * (1 + KAPPA * D)) / r0;
  return { maxDelay, maxEffort, minCertainty };
}

/* ---------- Uncertainty: deterministic Monte Carlo ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The answers are coarse (4 options), so each number is jittered by ±JITTER
 * (uniform, clamped) and the model re-run N times. Returns the 10th, 50th and
 * 90th percentile of P.
 */
export const MC_N = 2000;
export const JITTER = 0.2;

export function uncertainty(x: Factors) {
  const rand = mulberry32(42);
  const j = () => 1 + (rand() * 2 - 1) * JITTER;
  const c01 = (v: number) => Math.max(0, Math.min(1, v));
  const ps: number[] = [];
  for (let n = 0; n < MC_N; n++) {
    ps.push(
      evaluate({
        d: x.d * j(),
        i: c01(x.i * j()),
        r0: c01(x.r0 * j()),
        D: x.D * j(),
        q: c01(x.q * j()),
        f: c01(x.f === 0 ? rand() * JITTER * 0.5 : x.f * j()),
      }).P,
    );
  }
  ps.sort((a, b) => a - b);
  const at = (p: number) => ps[Math.min(ps.length - 1, Math.floor(p * ps.length))];
  return { p10: at(0.1), p50: at(0.5), p90: at(0.9) };
}
