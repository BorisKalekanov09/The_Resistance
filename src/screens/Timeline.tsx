import { useMemo } from 'react';
import type { Answers } from '../data/journey';
import { domainNoun, followThrough } from '../data/journey';
import type { ModelResult } from '../model/effortModel';
import type { Horizon, TrajectoryParams } from '../model/trajectory';
import { dailyPattern, simulateTrajectory } from '../model/trajectory';
import { BalanceSketch, BrainSketch, MonthsSketch, PencilDefs, YearsSketch } from '../ui/Sketches';

export interface Assumptions {
  perDay: number;
  adaptation: number;
  decay: number;
}

interface Props {
  answers: Answers;
  result: ModelResult;
  assumptions: Assumptions;
  horizon: Horizon;
  setHorizon: (h: Horizon) => void;
  onNext: () => void;
}

const TABS: { id: Horizon; label: string; title: string }[] = [
  { id: '10m', label: '10 minutes', title: 'Your immediate decision.' },
  { id: '10mo', label: '10 months', title: 'What a repeated behavioral pattern could look like in a hypothetical model.' },
  { id: '10y', label: '10 years', title: 'An illustrative long-term scenario, not a prediction.' },
];

const DAYS = 300;

/** Screen 5 — the same modeled choice, repeated over three time horizons. */
export default function Timeline({ answers, result, assumptions, horizon, setHorizon, onNext }: Props) {
  const noun = domainNoun(answers);
  const pFollow = followThrough(answers);
  const params: TrajectoryParams = useMemo(
    () => ({ R: result.R, E: result.E, C0: result.C, pChoices: pFollow, ...assumptions }),
    [result, pFollow, assumptions],
  );

  const days = useMemo(() => dailyPattern(params, DAYS), [params]);
  const years = useMemo(
    () => ({
      main: simulateTrajectory(params, '10y'),
      high: simulateTrajectory(params, '10y', 1),
      low: simulateTrajectory(params, '10y', 0),
    }),
    [params],
  );
  const started = useMemo(() => Math.round(days.reduce((s, d) => s + d.p, 0)), [days]);
  const firstMonth = Math.round(days.slice(0, 30).reduce((s, d) => s + d.p, 0));
  const lastMonth = Math.round(days.slice(-30).reduce((s, d) => s + d.p, 0));
  const endIndex = Math.round(years.main.final * 100);
  const pct = Math.round(result.tendency * 100);
  const tabIndex = TABS.findIndex((t) => t.id === horizon);
  const tab = TABS[tabIndex];

  const drift =
    lastMonth > firstMonth ? 'slowly becomes more frequent' : lastMonth < firstMonth ? 'slowly becomes less frequent' : 'stays about the same';

  let sketch = null;
  let represent = '';
  let detail = null;
  if (horizon === '10m') {
    sketch = <BalanceSketch reward={result.R} cost={result.cost} />;
    represent = `The balance shows one moment: the expected reward of ${noun} on one side, its perceived effort on the other. It tips toward the heavier side — which is why your result was ${pct}%.`;
    detail = (
      <>
        <p>
          Ten minutes is one decision. The model weighs reward ({result.R.toFixed(2)}) against effort multiplied by how much
          effort counts for you ({result.cost.toFixed(2)}). The difference is turned into the {pct}% you saw on the
          previous screen.
        </p>
        <p>Nothing accumulates yet. A single choice says very little about a pattern.</p>
      </>
    );
  } else if (horizon === '10mo') {
    sketch = <MonthsSketch days={days} />;
    represent = `Each circle is one day. A filled circle is a day on which the modeled version of you starts ${noun} instead of postponing it — about ${started} of ${DAYS} days.`;
    detail = (
      <>
        <p>
          Across the first month the model starts on about {firstMonth} of 30 days, and in the last month on about{' '}
          {lastMonth}: the pattern {drift}.
        </p>
        <p className="assume-head">Hypothetical assumptions</p>
        <ul>
          <li>{assumptions.perDay} moments like this per day.</li>
          <li>
            Your first answer sets how often you start anyway ({Math.round(pFollow * 100)}% of moments). It is blended
            50/50 with the model’s own {pct}% tendency.
          </li>
          <li>Each time the model starts, the next effort weighs slightly less; each time it postpones, slightly more.</li>
        </ul>
      </>
    );
  } else {
    sketch = <YearsSketch main={years.main.points} high={years.high.points} low={years.low.points} />;
    represent = `The pencil line is a made-up “persistence index” (0–100, starting at 50) that summarizes how often the modeled pattern starts rather than postpones. After ten years it settles near ${endIndex}.`;
    detail = (
      <>
        <p>
          The faint lines show the same model if every moment were started, or every moment postponed. Your line sits
          between them, according to your answers.
        </p>
        <p className="assume-head">What this is not</p>
        <ul>
          <li>It does not calculate aMCC growth, brain volume or any change in brain tissue.</li>
          <li>It does not estimate dementia or Alzheimer’s risk, or anything about your future health.</li>
          <li>It does not predict what you will do. Real lives change; this model does not.</li>
        </ul>
      </>
    );
  }

  const nextLabel = horizon === '10m' ? 'Repeat it for 10 months →' : horizon === '10mo' ? 'And for 10 years →' : 'Continue →';
  const next = () => (tabIndex < TABS.length - 1 ? setHorizon(TABS[tabIndex + 1].id) : onNext());

  return (
    <section className="screen timeline">
      <PencilDefs />
      <header className="timeline-head reveal-1">
        <h1 className="h1">What if this pattern repeated over time?</h1>
      </header>

      <div className="horizon-tabs reveal-2" role="tablist" aria-label="Time horizon">
        {TABS.map((t, i) => (
          <button key={t.id} role="tab" aria-selected={t.id === horizon} className={t.id === horizon ? 'on' : ''} onClick={() => setHorizon(t.id)}>
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            {t.label}
          </button>
        ))}
      </div>

      <article className="notebook reveal-3" key={horizon} role="tabpanel" aria-label={tab.label}>
        <div className="nb-grid">
          <figure className="nb-figure">
            <BrainSketch mode={horizon === '10m' ? 'moment' : horizon === '10mo' ? 'months' : 'years'} />
          </figure>
          <div className="nb-text">
            <p className="nb-title">{tab.title}</p>
            <figure className="nb-viz">{sketch}</figure>
            <p className="nb-represent">{represent}</p>
            <details className="fold">
              <summary>How was this calculated?</summary>
              <div className="fold-body">{detail}</div>
            </details>
          </div>
        </div>
      </article>

      <div className="row-actions reveal-4">
        <button className="btn btn-primary" onClick={next}>
          {nextLabel}
        </button>
        <p className="fine">Hypothetical model · not a prediction of brain changes or health outcomes.</p>
      </div>
    </section>
  );
}
