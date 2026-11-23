/**
 * The questionnaire, its transparent scoring, and the behavioral scenarios.
 *
 * This is NOT a personality test, a psychological diagnosis or a measurement of
 * willpower. A warm-up question about today (not scored) is followed by four short self-report questions describe how someone *says* they
 * usually approach effortful tasks. Nothing here is a neural measurement.
 *
 * The answers are used in three separate, plainly-labelled ways:
 *
 *   A. Reported behavioral profile (three 0–1 numbers, see PROFILE below)
 *        start   — share of challenging moments taken on right away
 *        ret     — share of set-aside moments picked up again later
 *        focus   — share of distractions you continue through
 *        swing   — how much the pattern varies with energy (Q3 "depends")
 *      → used by the *hypothetical* repetition model (trajectory.ts)
 *
 *   B. Scenario (engaging / returning / focused / lighter / mixed)
 *      → chosen from the profile; decides the story and the visuals
 *
 *   C. Starting point of the effort-reward simulation (effort, reward, sensitivity)
 *      → only initial slider values; the user can change them freely
 *
 * The emotional response after finishing (Q4) is shown in the user's words and
 * only nudges the starting reward/effort sliders, never a "score".
 */

import type { ModelInputs } from '../model/effortModel';

export type Today = 'none' | 'few' | 'many';
export type Respond = 'start' | 'return' | 'later' | 'easier';
export type Choose = 'always' | 'often' | 'sometimes' | 'rarely';
export type Temptation = 'continue' | 'sometimes' | 'stop' | 'energy';
export type After = 'satisfied' | 'relieved' | 'neutral' | 'exhausted';

export interface Answers {
  today: Today | null;
  respond: Respond | null;
  choose: Choose | null;
  temptation: Temptation | null;
  after: After | null;
}

export const EMPTY_ANSWERS: Answers = { today: null, respond: null, choose: null, temptation: null, after: null };

export interface Option<T extends string> {
  id: T;
  label: string;
}

/* ---------- Q1 (shown on the start screen) ---------- */

/* ---------- Opening question (start screen) ----------
 * A familiar, everyday warm-up. It is shown back to the user as they answered it
 * and is NOT scored: it does not change the profile, the scenario or the model. */

export const TODAY_QUESTION = 'How many times today did you tell yourself: I’ll do it later?';

export const TODAY: Option<Today>[] = [
  { id: 'none', label: 'Not once' },
  { id: 'few', label: '1–3 times' },
  { id: 'many', label: 'More than 3 times' },
];

export function today(a: Answers) {
  const t = TODAY.find((x) => x.id === a.today);
  return t ? `Today you told yourself “I’ll do it later”: ${t.label.toLowerCase()}.` : null;
}

export const RESPOND_QUESTION = 'Facing something hard, what do you usually do?';

export const RESPOND: (Option<Respond> & { start: number; ret: number })[] = [
  { id: 'start', label: 'I start right away', start: 0.85, ret: 0.5 },
  { id: 'return', label: 'I postpone, then return', start: 0.5, ret: 0.8 },
  { id: 'later', label: 'I leave it for later', start: 0.3, ret: 0.4 },
  { id: 'easier', label: 'I find an easier option', start: 0.2, ret: 0.15 },
];

/* ---------- Q2–Q4 ---------- */

export const CHOOSE: (Option<Choose> & { start: number; sensitivity: number })[] = [
  { id: 'always', label: 'Almost always', start: 0.85, sensitivity: 3.5 },
  { id: 'often', label: 'Often', start: 0.65, sensitivity: 4.5 },
  { id: 'sometimes', label: 'Sometimes', start: 0.45, sensitivity: 5.5 },
  { id: 'rarely', label: 'Rarely', start: 0.25, sensitivity: 6.5 },
];

export const TEMPTATION: (Option<Temptation> & { focus: number; swing: number })[] = [
  { id: 'continue', label: 'I keep going', focus: 0.85, swing: 0.04 },
  { id: 'sometimes', label: 'Sometimes I give in', focus: 0.55, swing: 0.08 },
  { id: 'stop', label: 'I usually stop', focus: 0.25, swing: 0.06 },
  { id: 'energy', label: 'Depends on my energy', focus: 0.55, swing: 0.3 },
];

/** Feelings are descriptive. They only nudge the *starting* reward / effort sliders. */
export const AFTER: (Option<After> & { reward: number; effortDelta: number; note: string })[] = [
  { id: 'satisfied', label: 'Satisfied', reward: 7.5, effortDelta: 0, note: 'Finishing tends to feel rewarding in itself.' },
  { id: 'relieved', label: 'Relieved', reward: 6.5, effortDelta: 0, note: 'Finishing mostly brings a sense of a weight lifted.' },
  { id: 'neutral', label: 'Neutral', reward: 5.5, effortDelta: 0, note: 'Finishing doesn’t leave a strong feeling either way.' },
  { id: 'exhausted', label: 'Exhausted', reward: 5.5, effortDelta: 1, note: 'Finishing tends to take a lot out of you.' },
];

export interface Step {
  key: 'respond' | 'choose' | 'temptation' | 'after';
  question: string;
  options: readonly Option<string>[];
}

export const STEPS: readonly Step[] = [
  { key: 'respond', question: RESPOND_QUESTION, options: RESPOND },
  { key: 'choose', question: 'How often do you pick the harder option?', options: CHOOSE },
  { key: 'temptation', question: 'Distracted mid-task — what happens?', options: TEMPTATION },
  { key: 'after', question: 'After finishing something you avoided, you feel…', options: AFTER },
];

export const isComplete = (a: Answers) => !!(a.today && a.respond && a.choose && a.temptation && a.after);

const findRespond = (a: Answers) => RESPOND.find((x) => x.id === a.respond) ?? RESPOND[1];
const findChoose = (a: Answers) => CHOOSE.find((x) => x.id === a.choose) ?? CHOOSE[2];
const findTemptation = (a: Answers) => TEMPTATION.find((x) => x.id === a.temptation) ?? TEMPTATION[1];
const findAfter = (a: Answers) => AFTER.find((x) => x.id === a.after) ?? AFTER[2];

/* ---------- A. Reported behavioral profile ---------- */

export interface Profile {
  /** Share of challenging moments taken on right away (0–1) */
  start: number;
  /** Share of set-aside or interrupted moments picked up again later (0–1) */
  ret: number;
  /** Share of distractions continued through (0–1) */
  focus: number;
  /** How much the pattern varies from day to day with energy (0–0.3) */
  swing: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function profileFromAnswers(a: Answers): Profile {
  const r = findRespond(a);
  const c = findChoose(a);
  const t = findTemptation(a);
  return { start: round2((r.start + c.start) / 2), ret: r.ret, focus: t.focus, swing: t.swing };
}

/** Plain-language account of how each profile number was scored. */
export function explainProfile(a: Answers): string[] {
  const r = findRespond(a);
  const c = findChoose(a);
  const t = findTemptation(a);
  return [
    `Taking it on right away = average of question 2 (${r.start}) and question 3 (${c.start}).`,
    `Coming back to it = from question 2 (${r.ret}).`,
    `Staying with it despite distractions = from question 4 (${t.focus})${t.id === 'energy' ? ', with a larger day-to-day swing because it depends on energy' : ''}.`,
  ];
}

/* ---------- B. Scenarios ---------- */

export type ScenarioId = 'engaging' | 'returning' | 'focused' | 'lighter' | 'mixed';

export interface Scenario {
  id: ScenarioId;
  /** Name of the behavioral scenario */
  title: string;
  /** One sentence describing the reported pattern */
  summary: string;
  /** The "what if" question that opens the timeline */
  whatIf: string;
  /** Typical profile, used when exploring a scenario other than your own */
  archetype: Profile;
  /** Hand-written caption under the 10-year sketch */
  hand: string;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  engaging: {
    id: 'engaging',
    title: 'Taking on the challenge',
    summary: 'You describe usually starting on difficult things right away, choosing the harder option and staying with it.',
    whatIf: 'What if this pattern of engaging with challenging activities were repeated over time?',
    archetype: { start: 0.85, ret: 0.5, focus: 0.85, swing: 0.04 },
    hand: 'effort, chosen again and again',
  },
  returning: {
    id: 'returning',
    title: 'Coming back to it',
    summary: 'You describe sometimes postponing difficult things, and then returning to them.',
    whatIf: 'What if this pattern of postponing and then returning were repeated over time?',
    archetype: { start: 0.5, ret: 0.8, focus: 0.55, swing: 0.08 },
    hand: 'set aside, then picked up again',
  },
  focused: {
    id: 'focused',
    title: 'Holding focus',
    summary: 'Once started, you describe continuing despite tempting distractions.',
    whatIf: 'What if this pattern of staying with a task despite distractions were repeated over time?',
    archetype: { start: 0.55, ret: 0.4, focus: 0.85, swing: 0.04 },
    hand: 'distractions noticed, task continued',
  },
  lighter: {
    id: 'lighter',
    title: 'Choosing the lighter path',
    summary: 'You describe often leaving difficult things for later or looking for an easier alternative.',
    whatIf: 'What if this pattern of choosing the easier option were repeated over time?',
    archetype: { start: 0.25, ret: 0.3, focus: 0.4, swing: 0.06 },
    hand: 'the easier option, chosen again and again',
  },
  mixed: {
    id: 'mixed',
    title: 'A mixed pattern',
    summary: 'Your answers combine different approaches: sometimes taking things on, sometimes setting them aside.',
    whatIf: 'What if this mix of approaches were repeated over time?',
    archetype: { start: 0.5, ret: 0.5, focus: 0.55, swing: 0.2 },
    hand: 'a bit of everything, repeated',
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ['engaging', 'returning', 'focused', 'mixed', 'lighter'];

/**
 * Transparent scenario rule (checked in this order):
 *   engaging   start ≥ 0.70 and focus ≥ 0.80
 *   returning  question 2 = “postpone, then return”
 *   focused    focus ≥ 0.80 and start ≥ 0.40
 *   lighter    start < 0.40
 *   mixed      everything else
 */
export function scenarioFor(a: Answers): Scenario {
  const p = profileFromAnswers(a);
  if (p.start >= 0.7 && p.focus >= 0.8) return SCENARIOS.engaging;
  if (a.respond === 'return') return SCENARIOS.returning;
  if (p.focus >= 0.8 && p.start >= 0.4) return SCENARIOS.focused;
  if (p.start < 0.4) return SCENARIOS.lighter;
  return SCENARIOS.mixed;
}

/* ---------- Emotional response (descriptive) ---------- */

export function emotion(a: Answers) {
  const f = findAfter(a);
  const word = f.label.replace('.', '');
  return { label: word, sentence: `After finishing something you first wanted to avoid, you usually feel ${word.toLowerCase()}.`, note: f.note };
}

/* ---------- C. Simulation starting point ---------- */

/** The effort-reward simulation always uses the same neutral scenario. */
export const TASK_NOUN = 'a challenging task';
const BASE_EFFORT = 6.5;

const clamp10 = (v: number) => Math.max(0, Math.min(10, v));

/**
 * Initial slider values for the effort-reward simulation:
 *   effort       6.5 for “a challenging task” (+1 if finishing usually feels exhausting)
 *   reward       from how finishing feels (question 5)
 *   sensitivity  from how often you choose the harder option (question 3)
 * These are starting assumptions only — not measurements — and every one can be changed.
 */
export function inputsFromAnswers(a: Answers): ModelInputs {
  const f = findAfter(a);
  return {
    effort: clamp10(BASE_EFFORT + f.effortDelta),
    reward: clamp10(f.reward),
    sensitivity: clamp10(findChoose(a).sensitivity),
  };
}

export function explainInputs(a: Answers): string[] {
  const f = findAfter(a);
  const c = findChoose(a);
  return [
    `The scenario is ${TASK_NOUN}, which starts at an effort of ${BASE_EFFORT}${f.effortDelta ? ` (+${f.effortDelta} because finishing usually feels exhausting)` : ''}.`,
    `Feeling “${f.label.replace('.', '').toLowerCase()}” after finishing sets the starting expected reward at ${f.reward}.`,
    `Choosing the harder option “${c.label.replace('.', '').toLowerCase()}” sets the starting sensitivity to effort at ${c.sensitivity}.`,
    'Question 4 (distractions) does not enter this formula; it is used only in the repetition model.',
  ];
}

/** Sample answers for each scenario (used by `?demo=…&s=…`). */
export const SAMPLE_ANSWERS: Record<ScenarioId, Answers> = {
  engaging: { today: 'none', respond: 'start', choose: 'always', temptation: 'continue', after: 'satisfied' },
  returning: { today: 'few', respond: 'return', choose: 'sometimes', temptation: 'sometimes', after: 'relieved' },
  focused: { today: 'few', respond: 'start', choose: 'sometimes', temptation: 'continue', after: 'neutral' },
  lighter: { today: 'many', respond: 'easier', choose: 'rarely', temptation: 'stop', after: 'relieved' },
  mixed: { today: 'few', respond: 'later', choose: 'often', temptation: 'energy', after: 'exhausted' },
};
