/**
 * The personal questionnaire and how each answer becomes a model parameter.
 *
 * These mappings are illustrative design choices, not a validated
 * psychological instrument. They are shown to the user in the
 * "How was this calculated?" panels.
 *
 * Every answer nudges one of three slider-scale parameters (0–10):
 *   effort       perceived effort of the postponed task
 *   reward       expected reward of doing it now
 *   sensitivity  how strongly effort weighs against reward
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

export const FREQUENCY: (Option<Frequency> & { sensitivity: number; followThrough: number })[] = [
  // sensitivity: base effort sensitivity · followThrough: assumed share of moments you start anyway (timeline only)
  { id: 'none', label: 'Not once', sensitivity: 4, followThrough: 0.7 },
  { id: 'few', label: '1–3 times', sensitivity: 5, followThrough: 0.5 },
  { id: 'many', label: 'More than 3 times', sensitivity: 6, followThrough: 0.3 },
];

/* ---------- Screen 2 ---------- */

export interface Step<T extends string> {
  key: 'domain' | 'reason' | 'feeling';
  question: string;
  options: Option<T>[];
}

export const DOMAINS: (Option<Domain> & { effort: number; reward: number; noun: string })[] = [
  { id: 'study', label: 'Studying', effort: 6, reward: 7.5, noun: 'studying' },
  { id: 'work', label: 'Work', effort: 6, reward: 6.5, noun: 'a work task' },
  { id: 'exercise', label: 'Exercise', effort: 7, reward: 7, noun: 'exercising' },
  { id: 'chores', label: 'Everyday responsibilities', effort: 4.5, reward: 5, noun: 'an everyday responsibility' },
];

export const REASONS: (Option<Reason> & ModelDelta & { why: string })[] = [
  { id: 'tired', label: 'I’m tired', effort: 1.5, why: 'Being tired makes the same task feel heavier, so the modeled effort goes up.' },
  { id: 'unmotivated', label: 'I don’t feel like doing it', reward: -1.5, why: 'Not feeling like it lowers how rewarding the task seems right now.' },
  { id: 'distracted', label: 'I get distracted', sensitivity: 1, why: 'Distractions offer easier rewards, so effort weighs a little more in the balance.' },
  { id: 'difficult', label: 'It feels difficult', effort: 2, why: 'When a task feels difficult, the modeled effort goes up.' },
];

export const FEELINGS: (Option<Feeling> & ModelDelta & { why: string })[] = [
  { id: 'relieved', label: 'Relieved', reward: -1, why: 'Feeling relieved suggests postponing pays off right away, which lowers the value of doing it now.' },
  { id: 'guilty', label: 'Guilty', reward: 1, why: 'Feeling guilty suggests the task matters to you, which raises its expected reward.' },
  { id: 'disappointed', label: 'Disappointed', reward: 1.5, why: 'Feeling disappointed suggests you care about the outcome, which raises its expected reward.' },
  { id: 'neutral', label: 'Neutral', why: 'Feeling neutral leaves the expected reward unchanged.' },
];

export const STEPS = [
  { key: 'domain', question: 'What do you postpone most often?', options: DOMAINS },
  { key: 'reason', question: 'What usually makes you postpone it?', options: REASONS },
  { key: 'feeling', question: 'How do you usually feel afterwards?', options: FEELINGS },
] as const;

interface ModelDelta {
  effort?: number;
  reward?: number;
  sensitivity?: number;
}

const clamp10 = (v: number) => Math.max(0, Math.min(10, v));

export const isComplete = (a: Answers) => !!(a.frequency && a.domain && a.reason && a.feeling);

/** Translates the four answers into the three model parameters. */
export function inputsFromAnswers(a: Answers): ModelInputs {
  const f = FREQUENCY.find((x) => x.id === a.frequency) ?? FREQUENCY[1];
  const d = DOMAINS.find((x) => x.id === a.domain) ?? DOMAINS[1];
  const r = REASONS.find((x) => x.id === a.reason);
  const fe = FEELINGS.find((x) => x.id === a.feeling);
  return {
    effort: clamp10(d.effort + (r?.effort ?? 0) + (fe?.effort ?? 0)),
    reward: clamp10(d.reward + (r?.reward ?? 0) + (fe?.reward ?? 0)),
    sensitivity: clamp10(f.sensitivity + (r?.sensitivity ?? 0) + (fe?.sensitivity ?? 0)),
  };
}

/** Assumed share of everyday moments in which the user starts anyway (timeline only). */
export function followThrough(a: Answers) {
  return (FREQUENCY.find((x) => x.id === a.frequency) ?? FREQUENCY[1]).followThrough;
}

/** Plain-language reasons behind the numbers, one per answer. */
export function explainAnswers(a: Answers): string[] {
  const out: string[] = [];
  const d = DOMAINS.find((x) => x.id === a.domain);
  const f = FREQUENCY.find((x) => x.id === a.frequency);
  if (d) out.push(`You picked ${d.noun}, which sets the starting effort and reward.`);
  const r = REASONS.find((x) => x.id === a.reason);
  if (r) out.push(r.why);
  const fe = FEELINGS.find((x) => x.id === a.feeling);
  if (fe) out.push(fe.why);
  if (f)
    out.push(
      f.id === 'none'
        ? 'You didn’t postpone anything today, so effort weighs a little less in this model.'
        : f.id === 'few'
          ? 'Postponing a few times today keeps the weight of effort neutral.'
          : 'Postponing often today makes effort weigh a little more in this model.',
    );
  return out;
}

export const domainNoun = (a: Answers) => (DOMAINS.find((x) => x.id === a.domain) ?? DOMAINS[1]).noun;
