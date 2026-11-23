import { useEffect } from 'react';
import type { Today } from '../data/journey';
import { TODAY, TODAY_QUESTION } from '../data/journey';

interface Props {
  value: Today | null;
  onPick: (f: Today) => void;
  onContinue: () => void;
}

/** Screen 1 — a familiar warm-up question (not scored). */
export default function Start({ value, onPick, onContinue }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < TODAY.length) onPick(TODAY[i].id);
      if (e.key === 'Enter' && value) onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onPick, onContinue]);

  return (
    <section className="screen start">
      <div className="intro-mark" aria-hidden>
        <svg viewBox="0 0 400 400">
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse key={i} cx="200" cy="200" rx={60 + i * 17} ry={44 + i * 13} className="contour" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
          <circle cx="226" cy="176" r="4" className="contour-dot" />
        </svg>
      </div>

      <div className="start-inner">
        <p className="label reveal-1">The Resistance · 1/5</p>
        <h1 className="display start-q reveal-2">
          How many times today did you tell yourself: <em>I’ll do it later?</em>
        </h1>

        <div className="big-options three reveal-3" role="radiogroup" aria-label={TODAY_QUESTION}>
          {TODAY.map((f, i) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={value === f.id}
              className={`big-option ${value === f.id ? 'on' : ''} ${value && value !== f.id ? 'dim' : ''}`}
              onClick={() => onPick(f.id)}
            >
              <span className="choice-key mono">{i + 1}</span>
              <span className="big-option-text">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="start-cta reveal-4">
          <button className="btn btn-primary btn-lg" disabled={!value} onClick={onContinue}>
            See what happens
          </button>
          <p className="fine">Five quick questions · No right answers · Not a test · Nothing leaves your browser</p>
        </div>
      </div>
    </section>
  );
}
