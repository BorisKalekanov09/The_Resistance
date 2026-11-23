/**
 * Illustrative effort-discounting model.
 *
 * This is a deliberately simple, custom educational model inspired by the
 * effort-based decision-making literature. It is NOT an equation used by the
 * brain, NOT a model of aMCC computations, and NOT a predictor of behaviour.
 *
 *   V = R − (E × C)                 action value
 *   P = 1 / (1 + exp(−k × V))       simulated action tendency
 *
 * Normalisation (slider values are 0–10):
 *   R = reward / 10                 → 0 … 1
 *   E = effort / 10                 → 0 … 1
 *   C = sensitivity / 5             → 0 … 2   (5 = "neutral": effort and reward weigh equally)
 *   k = 5                           → slope of the sigmoid
 *
 * With these choices, equal reward and effort at a neutral sensitivity give
 * V = 0 and therefore P = 50 %, which keeps the sliders intuitive.
 */

export const SIGMOID_K = 5;

export interface ModelInputs {
  /** Perceived effort, slider 0–10 */
  effort: number;
  /** Expected reward, slider 0–10 */
  reward: number;
  /** Sensitivity to effort, slider 0–10 */
  sensitivity: number;
}

export interface ModelResult {
  inputs: ModelInputs;
  R: number;
  E: number;
  C: number;
  k: number;
  /** Effort cost E × C */
  cost: number;
  /** Action value V = R − E × C */
  value: number;
  /** Simulated action tendency, 0–1 */
  tendency: number;
}

export const normalise = (i: ModelInputs) => ({
  R: i.reward / 10,
  E: i.effort / 10,
  C: i.sensitivity / 5,
});

export const sigmoid = (x: number, k = SIGMOID_K) => 1 / (1 + Math.exp(-k * x));

export function actionValue(R: number, E: number, C: number) {
  return R - E * C;
}

export function runModel(inputs: ModelInputs, k = SIGMOID_K): ModelResult {
  const { R, E, C } = normalise(inputs);
  const cost = E * C;
  const value = actionValue(R, E, C);
  return { inputs, R, E, C, k, cost, value, tendency: sigmoid(value, k) };
}

export type Band = 'high' | 'balanced' | 'low';

export function band(tendency: number): Band {
  if (tendency >= 0.62) return 'high';
  if (tendency <= 0.38) return 'low';
  return 'balanced';
}

export function interpret(r: ModelResult): string {
  switch (band(r.tendency)) {
    case 'high':
      return 'In this scenario, the model suggests that the expected reward outweighs the perceived effort.';
    case 'low':
      return 'In this scenario, the model suggests that the perceived effort outweighs the expected reward.';
    default:
      return 'In this scenario, the model suggests that expected reward and perceived effort are almost in balance — it could go either way.';
  }
}

/**
 * Seeds the effort-sensitivity parameter from the user's choices.
 * Choosing the effortful option more often → lower modeled sensitivity.
 * actRate 1 → 2.0, 0.5 → 5.0, 0 → 8.0
 */
export function sensitivityFromChoices(actRate: number) {
  return Math.round((8 - 6 * actRate) * 2) / 2;
}
