/**
 * Questions for the technical category simulation. Every category asks the
 * same six things (so the maths is identical), worded for its own context.
 * Option i of each question always maps to OPTION_VALUES[key][i].
 */

import type { FactorKey } from '../model/categoryModel';
import type { Domain } from './journey';
import { DOMAINS } from './journey';

/** Categories for the technical simulation: the original four plus four more. */
export type LabCategory = Domain | 'creative' | 'finance' | 'health' | 'social';

export const LAB_CATEGORIES: { id: LabCategory; label: string; noun: string }[] = [
  ...DOMAINS.map(({ id, label, noun }) => ({ id, label, noun })),
  { id: 'creative', label: 'Creative projects', noun: 'a creative project' },
  { id: 'finance', label: 'Personal finances', noun: 'sorting out your finances' },
  { id: 'health', label: 'Health appointments', noun: 'booking a health appointment' },
  { id: 'social', label: 'Reaching out to people', noun: 'reaching out to someone' },
];

export const labCategory = (id: LabCategory | null) => LAB_CATEGORIES.find((c) => c.id === id);

export interface LabQuestion {
  key: FactorKey;
  question: string;
  options: { id: string; label: string }[];
}

const opts = (labels: string[]) => labels.map((label, i) => ({ id: String(i), label }));

const DELAY = (soon: string) => opts([soon, 'In a few days', 'In about a month', 'Months from now']);
const CERTAINTY = opts(['Almost certain', 'Fairly sure', 'About 50/50', 'Doubtful']);
const ENERGY = opts(['Fresh', 'Okay', 'Tired', 'Drained']);

interface CategoryCopy {
  duration: [string, string[]];
  intensity: [string, string[]];
  value: [string, string[]];
  delay: [string, string];
  certainty: string;
  energy: string;
}

const COPY: Record<LabCategory, CategoryCopy> = {
  study: {
    duration: ['How long is the study session you usually put off?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How demanding is the material?', ['Re-reading notes', 'Practice I already know', 'New, hard material', 'Exam-level problems']],
    value: ['How much does this session matter to you?', ['A little', 'Somewhat', 'A lot', 'It’s critical (exam, grade)']],
    delay: ['When would you feel the benefit?', 'Right away (it clicks today)'],
    certainty: 'How sure are you that studying now actually pays off?',
    energy: 'How is your energy when you usually postpone it?',
  },
  work: {
    duration: ['How long does the work task you postpone take?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How mentally demanding is it?', ['Routine admin', 'A familiar task', 'An unclear or new problem', 'Complex, high-stakes work']],
    value: ['How much does finishing it matter?', ['Minor', 'Useful', 'Important', 'Career-critical']],
    delay: ['When would you see the result of doing it?', 'Right away (it’s off my plate)'],
    certainty: 'How sure are you the effort will be recognised or pay off?',
    energy: 'How is your energy when you usually postpone it?',
  },
  exercise: {
    duration: ['How long is the workout you put off?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How physically hard is it?', ['An easy walk', 'A moderate workout', 'Hard training', 'Maximum effort']],
    value: ['How much does this workout matter to you?', ['Nice to have', 'Somewhat important', 'An important health goal', 'Essential (competition, doctor’s advice)']],
    delay: ['When would you feel the benefit?', 'Right away (mood boost)'],
    certainty: 'How sure are you that this workout makes a difference?',
    energy: 'How is your energy when you usually skip it?',
  },
  chores: {
    duration: ['How long does the responsibility you postpone take?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How unpleasant or demanding is it?', ['A quick tidy', 'Regular chores', 'Paperwork or admin', 'A big, unpleasant job']],
    value: ['How much does getting it done matter?', ['A little', 'Somewhat', 'A lot', 'It has real consequences if missed']],
    delay: ['When would you feel the benefit?', 'Right away (relief, clean space)'],
    certainty: 'How sure are you that doing it now makes things better?',
    energy: 'How is your energy when you usually postpone it?',
  },
  creative: {
    duration: ['How long is the creative session you put off?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How hard is it to get going?', ['Light sketching or noodling', 'Continuing something started', 'Starting from a blank page', 'A difficult, high-standard piece']],
    value: ['How much does this project matter to you?', ['A small hobby', 'Something I enjoy', 'A personal goal', 'A deadline or commission']],
    delay: ['When would you feel the benefit?', 'Right away (the joy of making)'],
    certainty: 'How sure are you the session will produce something you like?',
    energy: 'How is your energy when you usually postpone it?',
  },
  finance: {
    duration: ['How long would the money task take?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How demanding is it?', ['Checking a balance', 'Paying bills', 'Making a budget', 'Taxes or a complex form']],
    value: ['How much does it matter?', ['A little', 'Saves some money', 'Important for my plans', 'Fines or debt if missed']],
    delay: ['When would you feel the benefit?', 'Right away (peace of mind)'],
    certainty: 'How sure are you that doing it now makes a difference?',
    energy: 'How is your energy when you usually postpone it?',
  },
  health: {
    duration: ['How long would booking and going take?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How uncomfortable is it?', ['A quick online booking', 'A phone call', 'A visit I find awkward', 'A procedure I dread']],
    value: ['How much does this appointment matter?', ['A routine check', 'Somewhat important', 'Important for my health', 'Urgent']],
    delay: ['When would you feel the benefit?', 'Right away (relief it’s booked)'],
    certainty: 'How sure are you the appointment will help?',
    energy: 'How is your energy when you usually postpone it?',
  },
  social: {
    duration: ['How long would the message, call or visit take?', ['About 15 minutes', '30–60 minutes', '1–2 hours', 'More than 2 hours']],
    intensity: ['How emotionally demanding is it?', ['A quick friendly message', 'A catch-up call', 'An awkward conversation', 'A difficult apology or confrontation']],
    value: ['How much does this person or conversation matter?', ['A little', 'Somewhat', 'A lot', 'A key relationship']],
    delay: ['When would you feel the benefit?', 'Right away (connection)'],
    certainty: 'How sure are you it will go well?',
    energy: 'How is your energy when you usually postpone it?',
  },
};

export function labQuestions(domain: LabCategory): LabQuestion[] {
  const c = COPY[domain];
  return [
    { key: 'duration', question: c.duration[0], options: opts(c.duration[1]) },
    { key: 'intensity', question: c.intensity[0], options: opts(c.intensity[1]) },
    { key: 'value', question: c.value[0], options: opts(c.value[1]) },
    { key: 'delay', question: c.delay[0], options: DELAY(c.delay[1]) },
    { key: 'certainty', question: c.certainty, options: CERTAINTY },
    { key: 'energy', question: c.energy, options: ENERGY },
  ];
}

export const FACTOR_META: Record<FactorKey, { name: string; symbol: string; unit: string; fmt: (v: number) => string }> = {
  duration: { name: 'Duration', symbol: 'd', unit: 'h', fmt: (v) => `${v} h` },
  intensity: { name: 'Intensity', symbol: 'i', unit: '', fmt: (v) => v.toFixed(2) },
  value: { name: 'Importance', symbol: 'r₀', unit: '', fmt: (v) => v.toFixed(2) },
  delay: { name: 'Delay of reward', symbol: 'D', unit: 'days', fmt: (v) => `${v} days` },
  certainty: { name: 'Certainty', symbol: 'q', unit: '', fmt: (v) => v.toFixed(2) },
  energy: { name: 'Fatigue', symbol: 'f', unit: '', fmt: (v) => v.toFixed(2) },
};
