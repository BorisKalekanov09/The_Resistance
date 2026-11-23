import { useEffect, useRef, useState } from 'react';
import { STEPS } from '../data/journey';

interface Props {
  index: number;
  /** Previously given answer for this step, if any */
  value: string | null;
  onAnswer: (id: string) => void;
  /** Questions to step through (defaults to the main questionnaire) */
  steps?: readonly { question: string; options: readonly { id: string; label: string }[] }[];
  /** Line shown above the first question */
  kicker?: string;
  /** Questions answered before this sequence (for the progress counter) */
  offset?: number;
}

/** Screen 2 — one short personal question per screen. */
export default function Ask({
  index,
  value,
  onAnswer,
  steps = STEPS,
  kicker = 'Four more. No right answers.',
  offset = 0,
}: Props) {
  const step = steps[index];
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (id: string) => {
    if (picked) return;
    setPicked(id);
    timer.current = window.setTimeout(() => onAnswer(id), 380);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < step.options.length) choose(step.options[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = picked ?? value;

  return (
    <section className="screen ask">
      <div className="q-meta reveal-1">
        <span className="mono small">
          {index + 1 + offset}
          <span className="muted">/{steps.length + offset}</span>
        </span>
        <div className="q-progress" aria-hidden>
          {Array.from({ length: steps.length + offset }, (_, i) => (
            <span key={i} className={i <= index + offset ? 'on' : ''} />
          ))}
        </div>
      </div>

      <div className="ask-body">
        {index === 0 && <p className="ask-kicker reveal-1">{kicker}</p>}
        <h2 className="ask-q reveal-2">{step.question}</h2>
      </div>

      <div className="big-options reveal-3" role="radiogroup" aria-label={step.question}>
        {step.options.map((o, i) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={shown === o.id}
            className={`big-option ${shown === o.id ? 'on' : ''} ${picked && picked !== o.id ? 'dim' : ''}`}
            onClick={() => choose(o.id)}
          >
            <span className="choice-key mono">{i + 1}</span>
            <span className="big-option-text">{o.label}</span>
            <span className="choice-arrow" aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
