import { useMemo } from 'react';
import type { Profile, ScenarioId } from '../data/journey';
import { SCENARIOS, TASK_NOUN } from '../data/journey';
import type { ModelResult } from '../model/effortModel';
import type { Horizon, TrajectoryParams } from '../model/trajectory';
import { ALWAYS, HORIZONS, NEVER, TEMPTATIONS, dailyPattern, sessionPlan, simulateTrajectory, withProfile } from '../model/trajectory';
import { BalanceSketch, BrainSketch, DayLegend, MonthsSketch, PencilDefs, SessionSketch, YearsSketch } from '../ui/Sketches';

export interface Assumptions {
  perDay: number;
  adaptation: number;
  decay: number;
}

interface Props {
  scenario: ScenarioId;
  profile: Profile;
  result: ModelResult;
  assumptions: Assumptions;
  horizon: Horizon;
  setHorizon: (h: Horizon) => void;
  onNext: () => void;
}

const TABS: { id: Horizon; label: string; title: string }[] = [
  { id: '10m', label: '10 minutes', title: 'One session with a challenging task.' },
  { id: '10mo', label: '10 months', title: 'The same pattern, repeated day after day in a hypothetical model.' },
  { id: '10y', label: '10 years', title: 'An illustrative long-term scenario, not a prediction.' },
];

const DAYS = HORIZONS['10mo'].days;
const pctOf = (v: number) => `${Math.round(v * 100)}%`;

/** Per-scenario sentence for each horizon. Descriptive, never good-versus-bad. */
const NOTES: Record<ScenarioId, Record<Horizon, string>> = {
  engaging: {
    '10m': 'The task is taken on at once and the distractions come and go without ending the session.',
    '10mo': 'Most marks are filled. Repeating this pattern keeps the modeled follow-through index climbing until it levels off.',
    '10y': 'The curve rises and then flattens: even a very consistent pattern reaches a ceiling in this model, set by the assumptions about adaptation and decay.',
  },
  returning: {
    '10m': 'The task is set aside for a while and then picked up again. Returning still gets the work done.',
    '10mo': 'Many marks are rings — tasks set aside and finished later. In this model, coming back counts: it moves the index almost as much as starting right away.',
    '10y': 'The curve settles above or near its starting point because returning keeps completing tasks, even when the first response is to wait.',
  },
  focused: {
    '10m': 'Distractions appear, are noticed, and the task continues. Once started, very little of the session is lost.',
    '10mo': 'Started tasks are rarely lost to distractions, so most started days end with a filled mark.',
    '10y': 'The curve is shaped mostly by how often a task is started; once started, it is usually finished.',
  },
  lighter: {
    '10m': 'In this session the easier option wins. That is one moment — the model only shows what happens if it repeats.',
    '10mo': 'Many marks are open: the lighter option is chosen on most days. Try raising the expected reward in the simulation and watch how the picture changes.',
    '10y': 'The curve settles below its starting point. This is a property of the made-up model and its assumptions, not a forecast about a person.',
  },
  mixed: {
    '10m': 'Part of the session goes to the task, part to distractions — a bit of each.',
    '10mo': 'The marks vary from week to week. Different approaches on different days add up to a pattern in between.',
    '10y': 'With a mix of approaches, the direction depends on how often tasks end up completed — straight away or after returning.',
  },
};

type Trend = 'none' | 'up' | 'down' | 'steady';

interface Outlook {
  trend: Trend;
  title: string;
  body: string;
}

/**
 * What the model says could happen if the pattern repeats — in plain behavioral
 * terms. Direction and size come from the same dynamics as the curve: as the index
 * rises, effort counts less (γ), so starting becomes more likely; as it falls, the reverse.
 */
function outlook(horizon: Horizon, final: number, start: number): Outlook {
  if (horizon === '10m') {
    return {
      trend: 'none',
      title: 'Nothing accumulates yet',
      body: 'A single session barely registers. The model only changes through repetition — over months, not minutes.',
    };
  }
  const d = final - start;
  const long = horizon === '10y';
  const big = Math.abs(d) >= 0.08;
  if (Math.abs(d) < 0.02) {
    return {
      trend: 'steady',
      title: 'Holding steady',
      body: 'Taking things on and setting them aside balance out, so effort weighs about the same as at the start.',
    };
  }
  if (d > 0) {
    if (!big)
      return {
        trend: 'up',
        title: 'Slowly getting easier',
        body: long
          ? 'Over the years, effort weighs a little less than at the start. Starting gets somewhat easier, then the pattern levels off.'
          : 'Each completed task makes the next one weigh a little less. The change is gentle, but starting slowly gets easier.',
      };
    return {
      trend: 'up',
      title: long ? 'Taking things on has become the default' : 'Starting is getting easier',
      body: long
        ? 'After years of this pattern, effort weighs clearly less than at the start. Starting is less of a struggle and taking things on is the usual response — until the pattern levels off.'
        : 'Each completed task makes the next effort weigh a little less, so starting comes more readily — the pattern is beginning to reinforce itself.',
    };
  }
  if (!big)
    return {
      trend: 'down',
      title: 'Slowly getting heavier',
      body: long
        ? 'Over the years, effort weighs a little more than at the start, and the easier option comes up a bit more often.'
        : 'Each set-aside task makes the next one weigh a little more. The change is gentle, but starting slowly gets harder.',
    };
  return {
    trend: 'down',
    title: long ? 'The easier option has become the default' : 'Starting is getting heavier',
    body: long
      ? 'After years of this pattern, effort weighs clearly more than at the start. Each start feels heavier and the lighter option usually comes first. Nothing here is fixed — raising the expected reward in Explore changes the direction.'
      : 'Each set-aside task makes the next effort weigh a little more, so the easier option is slowly becoming the first choice.',
  };
}

/** Screen 5 — the reported pattern, repeated over three time horizons. */
export default function Timeline({ scenario: own, profile, result, assumptions, horizon, setHorizon, onNext }: Props) {
  const sc = SCENARIOS[own];
  const prof = profile;

  const params: TrajectoryParams = useMemo(
    () => ({ R: result.R, E: result.E, C0: result.C, profile: prof, ...assumptions }),
    [result, prof, assumptions],
  );

  const session = useMemo(() => sessionPlan(params), [params]);
  const days = useMemo(() => dailyPattern(params, DAYS), [params]);
  const months = useMemo(() => simulateTrajectory(params, '10mo'), [params]);
  const years = useMemo(
    () => ({
      main: simulateTrajectory(params, '10y'),
      high: simulateTrajectory(withProfile(params, ALWAYS), '10y'),
      low: simulateTrajectory(withProfile(params, NEVER), '10y'),
    }),
    [params],
  );

  const tabIndex = TABS.findIndex((t) => t.id === horizon);
  const tab = TABS[tabIndex];
  const look = outlook(horizon, horizon === '10y' ? years.main.final : months.final, horizon === '10y' ? years.main.start : months.start);
  const resisted = session.events.filter((e) => e.kind === 'resisted').length;

  let sketch = null;
  let represent = '';
  let detail = null;
  if (horizon === '10m') {
    sketch = (
      <>
        <SessionSketch session={session} />
        <div className="nb-mini">
          <BalanceSketch reward={result.R} cost={result.cost} />
        </div>
      </>
    );
    const how =
      session.startAt === 0
        ? 'takes it on right away'
        : session.startAt === null
          ? 'chooses an easier alternative'
          : session.startAt < 3
            ? 'starts after a short pause'
            : 'sets it aside and comes back to it';
    represent = `Ten minutes with ${TASK_NOUN}. Three tempting distractions appear (the small circles). In this scenario the modeled pattern ${how}${
      session.startAt === null ? '' : `, continues through ${resisted} of the distractions it meets, and spends about ${Math.round(session.minutes)} of the 10 minutes on the task`
    }.`;
    detail = (
      <>
        <p>
          The small balance shows the starting decision: expected reward ({result.R.toFixed(2)}) against effort × sensitivity (
          {result.cost.toFixed(2)}), which gives the {pctOf(result.tendency)} tendency from the simulation.
        </p>
        <ul>
          <li>
            Chance of taking it on right away = 50% reported profile ({pctOf(prof.start)}) + 50% simulation ({pctOf(result.tendency)}) ={' '}
            {pctOf(session.s)}. At 60% or more it starts at minute 0; at 40% or more, after a short pause; otherwise it
            {prof.ret >= 0.5 ? ' comes back at minute 4' : ' turns to an easier alternative'}.
          </li>
          <li>
            Distractions at minutes {TEMPTATIONS.join(', ')}. The first {Math.round(3 * prof.focus)} met are continued through
            (focus {pctOf(prof.focus)}); the next one interrupts the task, which {prof.ret >= 0.5 ? 'resumes about a minute later' : 'then stops'}.
          </li>
        </ul>
        <p>Nothing accumulates yet. A single session says very little about a pattern.</p>
      </>
    );
  } else if (horizon === '10mo') {
    sketch = (
      <>
        <MonthsSketch days={days} />
        <DayLegend />
      </>
    );
    represent = `Each circle is one day with ${TASK_NOUN}. ${NOTES[own][horizon]}`;
    detail = (
      <>
        <p className="assume-head">Hypothetical assumptions</p>
        <ul>
          <li>{assumptions.perDay} challenging moments per day, each with one tempting distraction.</li>
          <li>
            Taken on right away: 50% your reported profile ({pctOf(prof.start)}) + 50% the simulation’s tendency
            {prof.swing > 0.1 ? ', plus a weekly energy rhythm because the pattern depends on tiredness' : ''}.
          </li>
          <li>
            Once started, a distraction is continued through {pctOf(prof.focus)} of the time. Anything set aside or interrupted
            is returned to {pctOf(prof.ret)} of the time.
          </li>
          <li>Each completed moment makes the next effort count slightly less; each set-aside moment, slightly more.</li>
        </ul>
      </>
    );
  } else {
    sketch = <YearsSketch main={years.main.points} high={years.high.points} low={years.low.points} />;
    represent = `The pencil line is a made-up “follow-through index” summarizing how often the modeled pattern completes a challenging moment. ${NOTES[own][horizon]}`;
    detail = (
      <>
        <p>
          The faint lines show the same model if every moment were taken on and finished, or if every moment were set aside.
          This scenario’s line sits between them.
        </p>
        <p className="assume-head">What this is not</p>
        <ul>
          <li>It is not a measurement of aMCC activity, brain growth, brain volume or willpower.</li>
          <li>It does not estimate dementia or Alzheimer’s risk, or anything about future health.</li>
          <li>It does not predict what anyone will do. Real lives change; this model does not.</li>
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
        <span className="label">Your behavioral scenario · {sc.title}</span>
        <h1 className="h1">{sc.whatIf}</h1>
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
            <BrainSketch mode={horizon === '10m' ? 'moment' : horizon === '10mo' ? 'months' : 'years'} caption={sc.hand} />
          </figure>
          <div className="nb-text">
            <p className="nb-title">{tab.title}</p>
            <figure className="nb-viz">{sketch}</figure>
            <p className="nb-represent">{represent}</p>
            <div className={`pattern-check trend-${look.trend}`} role="status">
              <span className="label">
                What could happen · {tab.label}
              </span>
              <p className="pattern-check-title">
                <span className="pattern-check-icon" aria-hidden>
                  {look.trend === 'up' ? '↑' : look.trend === 'down' ? '↓' : '–'}
                </span>
                {look.title}
              </p>
              <p className="small">{look.body}</p>
            </div>
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
        <p className="fine">Hypothetical behavioral scenario · not a biological prediction.</p>
      </div>
    </section>
  );
}
