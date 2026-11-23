import { useEffect } from 'react';
import type { LabCategory } from '../data/categoryLab';
import { LAB_CATEGORIES } from '../data/categoryLab';

export interface LabRun {
  domain: LabCategory;
  P: number;
}

interface Props {
  /** Category from the first test */
  firstDomain: LabCategory | null;
  /** Technical runs done in this session */
  runs: LabRun[];
  onPick: (d: LabCategory) => void;
}

/** Pick a category for the technical simulation. */
export default function CategoryPick({ firstDomain, runs, onPick }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < LAB_CATEGORIES.length) onPick(LAB_CATEGORIES[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick]);

  return (
    <section className="screen ask pick">
      <div className="ask-body">
        <p className="ask-kicker reveal-1">Technical simulation</p>
        <h2 className="ask-q reveal-2">Which category do you want to test?</h2>
        <p className="body muted reveal-2 pick-lede">
          Six quick questions, then the model shows every step of its maths: the equations with your numbers, which
          answer pushed the estimate up or down and by how much, and where the tipping points are.
        </p>
      </div>

      <div className="big-options pick-options reveal-3" role="list">
        {LAB_CATEGORIES.map((d, i) => {
          const last = [...runs].reverse().find((r) => r.domain === d.id);
          return (
            <button key={d.id} role="listitem" className="big-option" onClick={() => onPick(d.id)}>
              <span className="choice-key mono">{i + 1}</span>
              <span className="big-option-text">
                {d.label}
                <span className="pick-meta">
                  {d.id === firstDomain && <span className="pick-tag">your first test</span>}
                  {last && <span className="pick-tag mono">last run {Math.round(last.P * 100)}%</span>}
                </span>
              </span>
              <span className="choice-arrow" aria-hidden>
                →
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
