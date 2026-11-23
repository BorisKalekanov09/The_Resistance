import { useEffect, useState } from 'react';
import type { Answers } from '../data/journey';
import { explainAnswers } from '../data/journey';
import type { ModelInputs, ModelResult } from '../model/effortModel';
import { band, interpret } from '../model/effortModel';
import AnimatedNumber from '../ui/AnimatedNumber';
import Slider from '../ui/Slider';

interface Props {
  answers: Answers;
  inputs: ModelInputs;
  answerInputs: ModelInputs;
  setInputs: (i: ModelInputs) => void;
  result: ModelResult;
  /** Play the calculation sequence (first arrival after the questions) */
  animate: boolean;
  onAnimated: () => void;
  onChangeAnswers: () => void;
  onNext: () => void;
}

const PARAMS: { key: keyof ModelInputs; label: string; plain: string }[] = [
  { key: 'effort', label: 'Perceived effort', plain: 'How heavy the task feels' },
  { key: 'reward', label: 'Expected reward', plain: 'How worthwhile it seems' },
  { key: 'sensitivity', label: 'Weight of effort', plain: 'How much effort counts against reward' },
];

/** Screens 3 & 4 — the model runs on your answers and reveals one number. */
export default function Result({
  answers,
  inputs,
  answerInputs,
  setInputs,
  result,
  animate,
  onAnimated,
  onChangeAnswers,
  onNext,
}: Props) {
  // 0: intro line · 1–3: parameters appear · 4: result
  const [phase, setPhase] = useState(animate ? 0 : 4);

  useEffect(() => {
    if (!animate) return;
    const ts = [900, 1350, 1800, 2600].map((ms, i) => window.setTimeout(() => setPhase(i + 1), ms));
    const done = window.setTimeout(onAnimated, 2700);
    return () => [...ts, done].forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const edited = PARAMS.some((p) => inputs[p.key] !== answerInputs[p.key]);
  const max = Math.max(1, result.R, result.cost);
  const pct = Math.round(result.tendency * 100);

  return (
    <div className="panel-inner result">
      <p className="h3 result-intro reveal-1">Let’s explore what your answers mean in this model.</p>

      <ul className="calc" aria-live="polite">
        {PARAMS.map((p, i) => (
          <li key={p.key} className={phase > i ? 'in' : ''}>
            <span className="calc-label">{p.label}</span>
            <span className="calc-track">
              <span className="calc-fill" style={{ width: phase > i ? `${inputs[p.key] * 10}%` : 0 }} />
            </span>
            <span className="mono small">{inputs[p.key].toFixed(1)}</span>
          </li>
        ))}
      </ul>

      {phase >= 4 && (
        <div className="result-main reveal-1">
          <div className={`big-number band-${band(result.tendency)}`} aria-label={`${pct} percent`}>
            <AnimatedNumber value={result.tendency * 100} duration={1200} />
            <span className="pct">%</span>
          </div>
          <span className="label">Simulated action tendency</span>
          <p className="interp">{interpret(result)}</p>
          <p className="fine">
            This percentage comes from a simple educational model that weighs the reward and effort you described. It is
            not a measurement of your willpower, your brain activity or what you will actually do.
          </p>
        </div>
      )}

      {phase >= 4 && (
        <>
          <details className="fold reveal-2">
            <summary>What shaped this number?</summary>
            <div className="fold-body">
              <ul className="why-list">
                {explainAnswers(answers).map((s) => (
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
                  <span className="label">Effort × its weight</span>
                  <span className="mono small">{result.cost.toFixed(2)}</span>
                  <div className="bar">
                    <span className="fill cost" style={{ width: `${(result.cost / max) * 100}%` }} />
                  </div>
                </div>
              </div>
              <p className="fine">
                When the reward bar is longer, the number rises above 50%. When effort is longer, it falls below.
              </p>
            </div>
          </details>

          <details className="fold reveal-2">
            <summary>Adjust the model</summary>
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
