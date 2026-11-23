/**
 * The personal questionnaire and what each answer is used for.
 *
 * This is NOT a validated psychological test. The answers are kept as three
 * separate, plainly-labelled results instead of being merged into one score:
 *
 *   A. Reported postponement pattern  (frequency → transparent 10 / 50 / 90 index)
 *   B. Emotional response             (feeling → descriptive text only, no number)
 *   C. Decision context               (activity → the scenario for the simulation)
 *
 * The effort-reward simulation has its own three inputs (0–10 sliders):
 *   effort       perceived effort of the postponed task
 *   reward       expected reward of doing it now
 *   sensitivity  how strongly effort weighs against reward
 * The answers only *initialise* those sliders (see inputsFromAnswers). The
 * postponement index is never converted directly into an action probability,
 * and the emotional response does not enter the simulation at all.
 */

import type { ModelInputs } from '../model/effortModel';

export type Frequency = 'none' | 'few' | 'many';
export type Domain = 'study' | 'work' | 'exercise' | 'chores';
export type Reason = 'tired' | 'unmotivated' | 'distracted' | 'difficult';
export type Feeling = 'relieved' | 'guilty' | 'disappointed' | 'neutral';

export interface Answers {
  frequency: Frequency | null;
  domain: Domain | null;
  reason: Reason | null;
  feeling: Feeling | null;
}

export const EMPTY_ANSWERS: Answers = { frequency: null, domain: null, reason: null, feeling: null };

export interface Option<T extends string> {
  id: T;
  label: string;
}

/* ---------- Screen 1 ---------- */

export const FREQUENCY_QUESTION = 'How many times today did you tell yourself: I’ll do it later?';

export const FREQUENCY: (Option<Frequency> & {
  /** Reported postponement index, 0–100 (illustrative, transparent scoring) */
  index: number;
  /** Plain-language name of the pattern */
  pattern: string;
  /** Starting value for the "sensitivity to effort" slider in the simulation */
  sensitivity: number;
  /** Assumed share of moments you start anyway (timeline only) */
  followThrough: number;
})[] = [
  { id: 'none', label: 'Not once', index: 10, pattern: 'rare', sensitivity: 4, followThrough: 0.7 },
  { id: 'few', label: '1–3 times', index: 50, pattern: 'occasional', sensitivity: 5, followThrough: 0.5 },
  { id: 'many', label: 'More than 3 times', index: 90, pattern: 'frequent', sensitivity: 6, followThrough: 0.3 },
];

/* ---------- Screen 2 ---------- */

export interface Step<T extends string> {
  key: 'domain' | 'reason' | 'feeling';
  question: string;
  options: Option<T>[];
}

interface ModelDelta {
  effort?: number;
  reward?: number;
  sensitivity?: number;
}

export const DOMAINS: (Option<Domain> & { effort: number; reward: number; noun: string })[] = [
  { id: 'study', label: 'Studying', effort: 6, reward: 7.5, noun: 'studying' },
  { id: 'work', label: 'Work', effort: 6, reward: 6.5, noun: 'a work task' },
  { id: 'exercise', label: 'Exercise', effort: 7, reward: 7, noun: 'exercising' },
  { id: 'chores', label: 'Everyday responsibilities', effort: 4.5, reward: 5, noun: 'an everyday responsibility' },
];

export const REASONS: (Option<Reason> & ModelDelta & { why: string })[] = [
  { id: 'tired', label: 'I’m tired', effort: 1.5, why: 'Being tired makes the same task feel heavier, so the starting effort goes up by 1.5.' },
  { id: 'unmotivated', label: 'I don’t feel like doing it', reward: -1.5, why: 'Not feeling like it lowers how rewarding the task seems right now, so the starting reward goes down by 1.5.' },
  { id: 'distracted', label: 'I get distracted', sensitivity: 1, why: 'Distractions offer easier rewards, so the starting sensitivity to effort goes up by 1.' },
  { id: 'difficult', label: 'It feels difficult', effort: 2, why: 'When a task feels difficult, the starting effort goes up by 2.' },
];

/** Feelings are descriptive only — they carry no number and do not enter the simulation. */
export const FEELINGS: (Option<Feeling> & { adjective: string; note: string })[] = [
  { id: 'relieved', label: 'Relieved', adjective: 'relieved', note: 'Postponing brings a sense of relief in the moment.' },
  { id: 'guilty', label: 'Guilty', adjective: 'guilty', note: 'Postponing leaves you with a sense of guilt.' },
  { id: 'disappointed', label: 'Disappointed', adjective: 'disappointed', note: 'Postponing leaves you disappointed with how things went.' },
  { id: 'neutral', label: 'Neutral', adjective: 'neutral', note: 'Postponing doesn’t leave a strong feeling either way.' },
];

export const STEPS = [
  { key: 'domain', question: 'What do you postpone most often?', options: DOMAINS },
  { key: 'reason', question: 'What usually makes you postpone it?', options: REASONS },
  { key: 'feeling', question: 'How do you usually feel afterwards?', options: FEELINGS },
] as const;

const clamp10 = (v: number) => Math.max(0, Math.min(10, v));

export const isComplete = (a: Answers) => !!(a.frequency && a.domain && a.reason && a.feeling);

const findFrequency = (a: Answers) => FREQUENCY.find((x) => x.id === a.frequency) ?? FREQUENCY[1];
const findDomain = (a: Answers) => DOMAINS.find((x) => x.id === a.domain) ?? DOMAINS[1];
const findFeeling = (a: Answers) => FEELINGS.find((x) => x.id === a.feeling) ?? FEELINGS[3];

/* ---------- A. Reported postponement pattern ---------- */

export interface PostponementResult {
  /** 0–100, from the transparent 10 / 50 / 90 scoring */
  index: number;
  /** The answer as the user gave it */
  answer: string;
  pattern: string;
  sentence: string;
}

export function postponement(a: Answers): PostponementResult {
  const f = findFrequency(a);
  const article = f.pattern === 'occasional' ? 'an' : 'a';
  return {
    index: f.index,
    answer: f.label,
    pattern: f.pattern,
    sentence: `Your answers suggest ${article} ${f.pattern} postponement pattern today.`,
  };
}

/* ---------- B. Emotional response (descriptive, no number) ---------- */

export function emotion(a: Answers) {
  const fe = findFeeling(a);
  return { label: fe.label, sentence: `You report feeling ${fe.adjective} afterwards.`, note: fe.note };
}

/* ---------- C. Decision context ---------- */

export function context(a: Answers) {
  const d = findDomain(a);
  return {
    label: d.label,
    noun: d.noun,
    sentence: `${d.label} is the context in which you most often experience this resistance.`,
  };
}

/* ---------- Simulation starting point ---------- */

/**
 * Initialises the effort-reward simulation from the answers.
 *   context (activity) → starting effort and reward of the scenario
 *   reason             → small nudge to effort, reward or sensitivity
 *   frequency          → starting sensitivity to effort (4 / 5 / 6)
 *   feeling            → not used
 * The simulated tendency is then computed by the formula in effortModel.ts.
 */
export function inputsFromAnswers(a: Answers): ModelInputs {
  const f = findFrequency(a);
  const d = findDomain(a);
  const r = REASONS.find((x) => x.id === a.reason);
  return {
    effort: clamp10(d.effort + (r?.effort ?? 0)),
    reward: clamp10(d.reward + (r?.reward ?? 0)),
    sensitivity: clamp10(f.sensitivity + (r?.sensitivity ?? 0)),
  };
}

/** Assumed share of everyday moments in which the user starts anyway (timeline only). */
export function followThrough(a: Answers) {
  return findFrequency(a).followThrough;
}

/** Plain-language account of how the answers set the simulation's starting sliders. */
export function explainAnswers(a: Answers): string[] {
  const out: string[] = [];
  const d = DOMAINS.find((x) => x.id === a.domain);
  const f = FREQUENCY.find((x) => x.id === a.frequency);
  if (d) out.push(`The scenario is ${d.noun}, which sets the starting effort (${d.effort}) and reward (${d.reward}).`);
  const r = REASONS.find((x) => x.id === a.reason);
  if (r) out.push(r.why);
  if (f)
    out.push(
      `Your reported frequency (“${f.label}”) sets the starting sensitivity to effort at ${f.sensitivity} out of 10. ` +
        'This is only a starting assumption you can change below; the postponement index itself is never turned into a percentage.',
    );
  if (a.feeling) out.push('Your emotional response is shown as you described it and does not change the simulation.');
  return out;
}

export const domainNoun = (a: Answers) => findDomain(a).noun;
