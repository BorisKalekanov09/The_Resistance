import { useEffect, useState } from 'react';
import type { Answers, Profile, Scenario } from '../data/journey';
import { TASK_NOUN, emotion, explainInputs, explainProfile, today } from '../data/journey';
import type { ModelInputs, ModelResult } from '../model/effortModel';
import { band, interpret } from '../model/effortModel';
import AnimatedNumber from '../ui/AnimatedNumber';
import Slider from '../ui/Slider';

interface Props {
  answers: Answers;
  scenario: Scenario;
  profile: Profile;
  inputs: ModelInputs;
  answerInputs: ModelInputs;
  setInputs: (i: ModelInputs) => void;
  result: ModelResult;
  /** Play the reveal sequence (first arrival after the questions) */
  animate: boolean;
  onAnimated: () => void;
  onChangeAnswers: () => void;
  onNext: () => void;
}

const PARAMS: { key: keyof ModelInputs; label: string; plain: string }[] = [
  { key: 'effort', label: 'Perceived effort', plain: 'How heavy the task feels' },
  { key: 'reward', label: 'Expected reward', plain: 'How worthwhile it seems' },
  { key: 'sensitivity', label: 'Sensitivity to effort', plain: 'How much effort counts against reward' },
];

const PROFILE_ROWS: { key: keyof Omit<Profile, 'swing'>; label: string }[] = [
  { key: 'start', label: 'Taking it on right away' },
  { key: 'ret', label: 'Coming back to it' },
  { key: 'focus', label: 'Staying with it despite distractions' },
];

const fmt = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2));

/**
 * Screens 3 & 4 — three separate results:
 *   1. Reported pattern (behavioral scenario + transparent profile)
 *   2. How finishing feels (descriptive, no number)
 *   3. Simulated effort-reward decision (formula, own inputs)
 */
export default function Result({
  answers,
  scenario,
  profile,
  inputs,
  answerInputs,
  setInputs,
  result,
  animate,
  onAnimated,
  onChangeAnswers,
  onNext,
}: Props) {
  // 0: intro · 1: pattern · 2: emotion · 3: simulation inputs · 4: simulated result
  const [phase, setPhase] = useState(animate ? 0 : 4);

  useEffect(() => {
    if (!animate) return;
    const ts = [600, 1300, 2000, 2900].map((ms, i) => window.setTimeout(() => setPhase(i + 1), ms));
    const done = window.setTimeout(onAnimated, 3000);
    return () => [...ts, done].forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const emo = emotion(answers);

  const edited = PARAMS.some((p) => inputs[p.key] !== answerInputs[p.key]);
  const max = Math.max(1, result.R, result.cost);
  const pct = Math.round(result.tendency * 100);

  return (
    <div className="panel-inner result">
      <div className="result-head reveal-1">
        <p className="h3 result-intro">Here is the pattern you described — and what a simple model does with it.</p>
        <p className="fine">
          Three separate results. They are not combined into one score. The questionnaire is not a validated
          psychological test.
        </p>
      </div>

      {/* ---------- 1. Reported pattern ---------- */}
      <section className={`rcard rcard-pattern ${phase >= 1 ? 'in' : ''}`} aria-label="Your reported pattern">
        <header className="rcard-head">
          <span className="rcard-num mono">1</span>
          <span className="label">Your reported pattern</span>
        </header>
        <div className="rcard-value">
          <span className="rcard-word ink">{scenario.title}</span>
        </div>
        <p className="rcard-sentence">{scenario.summary}</p>
        {today(answers) && <p className="small muted">{today(answers)} Shown as you answered — it isn’t scored and doesn’t change the scenario.</p>}
        <ul className="profile-bars" aria-label="Reported behavioral profile">
          {PROFILE_ROWS.map((r) => (
            <li key={r.key}>
              <span className="calc-label">{r.label}</span>
              <span className="calc-track">
                <span className="calc-fill" style={{ width: phase >= 1 ? `${profile[r.key] * 100}%` : 0 }} />
              </span>
              <span className="mono small">{Math.round(profile[r.key] * 100)}%</span>
            </li>
          ))}
        </ul>
        <p className="fine">
          A description of what you reported, using illustrative scoring — not a personality test, a diagnosis or a
          measurement of willpower. There are no better or worse patterns here, only different scenarios to explore.
        </p>
        <details className="fold">
          <summary>How was this scored?</summary>
          <div className="fold-body">
            <ul className="why-list">
              {explainProfile(answers).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </details>
      </section>

      {/* ---------- 2. How finishing feels ---------- */}
      <section className={`rcard rcard-emotion ${phase >= 2 ? 'in' : ''}`} aria-label="How finishing feels">
        <header className="rcard-head">
          <span className="rcard-num mono">2</span>
          <span className="label">How finishing feels</span>
        </header>
        <div className="rcard-value">
          <span className="rcard-word">{emo.label}</span>
        </div>
        <p className="rcard-sentence">{emo.sentence}</p>
        <p className="fine">
          {emo.note} Shown in your own words. It says nothing about brain function; it only sets the starting expected
          reward in the simulation below.
        </p>
      </section>

      {/* ---------- 3. Simulated effort-reward decision ---------- */}
      <section className={`rcard rcard-sim ${phase >= 3 ? 'in' : ''}`} aria-label="Simulated effort-reward decision">
        <header className="rcard-head">
          <span className="rcard-num mono">3</span>
          <span className="label">Simulated effort-reward decision</span>
        </header>
        <p className="rcard-sentence">A separate, simplified computational model of one decision about {TASK_NOUN}.</p>
        <p className="fine">
          It has its own three inputs. Your answers only set their starting values; they are not measurements, and you can
          change them below.
        </p>

        <ul className="calc" aria-live="polite">
          {PARAMS.map((p) => (
            <li key={p.key} className={phase >= 3 ? 'in' : ''}>
              <span className="calc-label">{p.label}</span>
              <span className="calc-track">
                <span className="calc-fill" style={{ width: phase >= 3 ? `${inputs[p.key] * 10}%` : 0 }} />
              </span>
              <span className="mono small">{inputs[p.key].toFixed(1)}</span>
            </li>
          ))}
        </ul>

        {phase >= 4 && (
          <div className="result-main reveal-1">
            <p className="formula mono small">
              value = reward − effort × sensitivity = {result.R.toFixed(2)} − {result.E.toFixed(2)} × {result.C.toFixed(2)}{' '}
              = {fmt(result.value)}
              <br />
              tendency = 1 / (1 + e<sup>−{result.k}·value</sup>) = {pct}%
            </p>
            <div className={`big-number band-${band(result.tendency)}`} aria-label={`${pct} percent`}>
              <AnimatedNumber value={result.tendency * 100} duration={1200} />
              <span className="pct">%</span>
            </div>
            <span className="label">Simulated action tendency</span>
            <p className="interp">{interpret(result)}</p>
            <p className="fine">
              An illustrative output of a simple educational model of effort and reward — not a measurement of your
              willpower, aMCC activity, brain development or what you will actually do.
            </p>
          </div>
        )}
      </section>

      {phase >= 4 && (
        <>
          <details className="fold reveal-2">
            <summary>How were the simulation inputs set?</summary>
            <div className="fold-body">
              <ul className="why-list">
                {explainInputs(answers).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="balance-bars">
                <div className="bar-row">
                  <span className="label">Expected reward</span>
                  <span className="mono small">{result.R.toFixed(2)}</span>
                  <div className="bar">
                    <span className="fill reward" style={{ width: `${(result.R / max) * 100}%` }} />
                  </div>
                </div>
                <div className="bar-row">
                  <span className="label">Effort × sensitivity</span>
                  <span className="mono small">{result.cost.toFixed(2)}</span>
                  <div className="bar">
                    <span className="fill cost" style={{ width: `${(result.cost / max) * 100}%` }} />
                  </div>
                </div>
              </div>
              <p className="fine">
                When the reward bar is longer, the simulated tendency rises above 50%. When effort × sensitivity is longer,
                it falls below.
              </p>
            </div>
          </details>

          <details className="fold reveal-2">
            <summary>Adjust the simulation</summary>
            <div className="fold-body sliders">
              {PARAMS.map((p) => (
                <Slider
                  key={p.key}
                  label={p.label}
                  hint={p.plain}
                  value={inputs[p.key]}
                  onChange={(v) => setInputs({ ...inputs, [p.key]: v })}
                  minLabel="low"
                  maxLabel="high"
                />
              ))}
              <p className="fine">
                These sliders change only result 3 and the repetition model. Your reported pattern stays as you answered.
              </p>
              {edited && (
                <button className="link" onClick={() => setInputs(answerInputs)}>
                  Reset to my answers
                </button>
              )}
            </div>
          </details>

          <div className="row-actions reveal-3">
            <button className="btn btn-primary" onClick={onNext}>
              What if this repeated? →
            </button>
            <button className="link" onClick={onChangeAnswers}>
              ← Change my answers
            </button>
          </div>
        </>
      )}
    </div>
  );
}
