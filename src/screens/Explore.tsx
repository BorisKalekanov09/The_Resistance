import { useMemo, useState } from 'react';
import type { Profile } from '../data/journey';
import type { ModelInputs, ModelResult } from '../model/effortModel';
import { SIGMOID_K, interpret } from '../model/effortModel';
import type { Horizon, TrajectoryParams } from '../model/trajectory';
import { ALWAYS, HORIZONS, NEVER, equilibrium, sessionPlan, simulateTrajectory, withProfile } from '../model/trajectory';
import { PencilDefs, SessionSketch } from '../ui/Sketches';
import AnimatedNumber from '../ui/AnimatedNumber';
import SigmoidPlot from '../ui/SigmoidPlot';
import Slider from '../ui/Slider';
import Tag from '../ui/Tag';
import TrajectoryChart from '../ui/TrajectoryChart';
import type { ChartSeries } from '../ui/TrajectoryChart';
import ScienceNotes from './Science';
import type { Assumptions } from './Timeline';

interface Props {
  inputs: ModelInputs;
  setInputs: (i: ModelInputs) => void;
  result: ModelResult;
  profile: Profile;
  assumptions: Assumptions;
  setAssumptions: (a: Assumptions) => void;
  onReplay: () => void;
  onOtherCategory: () => void;
}

const f2 = (n: number) => n.toFixed(2);

/** The optional deeper layer: the brain region, two live experiments, and the evidence. */

export default function Explore({ inputs, setInputs, result, profile, assumptions, setAssumptions, onReplay, onOtherCategory }: Props) {
  const [horizon, setHorizon] = useState<Horizon>('10mo');
  const spec = HORIZONS[horizon];
  const params: TrajectoryParams = useMemo(
    () => ({ R: result.R, E: result.E, C0: result.C, profile, ...assumptions }),
    [result, profile, assumptions],
  );
  const session = useMemo(() => sessionPlan(params), [params]);
  const { series, eq } = useMemo(() => {
    if (horizon === '10m') return { series: [] as ChartSeries[], eq: 0.5 };
    const series: ChartSeries[] = [
      { id: 'hi', label: 'If every moment were taken on', points: simulateTrajectory(withProfile(params, ALWAYS), horizon).points, variant: 'ref-high' },
      { id: 'lo', label: 'If every moment were set aside', points: simulateTrajectory(withProfile(params, NEVER), horizon).points, variant: 'ref-low' },
      { id: 'main', label: 'Your modeled scenario', points: simulateTrajectory(params, horizon).points, variant: 'main' },
    ];
    return { series, eq: equilibrium(params) };
  }, [params, horizon]);

  const setIn = (k: keyof ModelInputs) => (v: number) => setInputs({ ...inputs, [k]: v });
  const setAs = (k: keyof Assumptions) => (v: number) => setAssumptions({ ...assumptions, [k]: v });

  return (
    <div className="panel-inner explore">
      <header className="panel-head reveal-1">
        <span className="label">Inside the brain</span>
        <h2 className="h2">
          Meet the <span className="accent">anterior midcingulate cortex</span>.
        </h2>
        <p className="body">
          Deep in the middle of the brain, above the band that joins the two hemispheres, sits the aMCC. It is a busy hub,
          often active when a task demands effort, when something conflicts with a goal, or when we need to keep going.
        </p>
        <p className="body muted">
          It is not a “willpower centre”. Persistence comes from many regions working together. Drag the head to look
          around; the highlighted strip is the aMCC.
        </p>
      </header>

      <section className="exp reveal-2">
        <div className="exp-head">
          <span className="mono small muted">Experiment 01</span>
          <Tag kind="model" />
        </div>
        <h3 className="h3">Tip the balance.</h3>
        <p className="body muted">
          Effort-based decisions are often described as a trade-off: a reward, discounted by the effort needed to get it.
          Move the sliders and watch the tendency change.
        </p>
        <div className="exp-readout">
          <span className="big-number small-big">
            <AnimatedNumber value={result.tendency * 100} duration={500} />
            <span className="pct">%</span>
          </span>
          <p className="small">{interpret(result)}</p>
        </div>
        <div className="sliders">
          <Slider label="Perceived effort" value={inputs.effort} onChange={setIn('effort')} minLabel="light" maxLabel="heavy" />
          <Slider label="Expected reward" value={inputs.reward} onChange={setIn('reward')} minLabel="small" maxLabel="large" />
          <Slider label="Weight of effort" value={inputs.sensitivity} onChange={setIn('sensitivity')} minLabel="barely counts" maxLabel="counts a lot" />
        </div>
        <SigmoidPlot current={result} history={[]} k={SIGMOID_K} />
        <details className="fold">
          <summary>The equation</summary>
          <div className="fold-body">
            <div className="equation mono">
              <div>
                <span className="muted">V</span> = R − (E × C) = {f2(result.R)} − ({f2(result.E)} × {f2(result.C)}) ={' '}
                <b>
                  {result.value >= 0 ? '+' : ''}
                  {f2(result.value)}
                </b>
              </div>
              <div>
                <span className="muted">P</span> = 1 / (1 + e<sup>−{SIGMOID_K}·V</sup>) = <b>{f2(result.tendency)}</b>
              </div>
            </div>
            <p className="fine">
              V is the value of acting now; the S-shaped curve turns it into a tendency between 0 and 100%. A simple
              teaching model inspired by effort-discounting research — not an equation the brain uses.
            </p>
          </div>
        </details>
      </section>

      <section className="exp reveal-3">
        <div className="exp-head">
          <span className="mono small muted">Experiment 02</span>
          <Tag kind="hypothetical" />
        </div>
        <h3 className="h3">Change the parameters and explore.</h3>
        <p className="body muted">
          The timeline combines your reported pattern with assumptions about repetition. Change the rules and explore
          another outcome — the curve depends as much on choices we made as on your answers.
        </p>
        <div className="horizon" role="tablist" aria-label="Time horizon">
          {(['10m', '10mo', '10y'] as Horizon[]).map((h) => (
            <button key={h} role="tab" aria-selected={h === horizon} className={h === horizon ? 'on' : ''} onClick={() => setHorizon(h)}>
              {HORIZONS[h].label}
            </button>
          ))}
        </div>
        {horizon === '10m' ? (
          <div className="explore-session">
            <PencilDefs />
            <SessionSketch session={session} />
            <p className="small">
              {session.startAt === null
                ? 'In these ten minutes the easier alternative wins, so no time goes to the task.'
                : `${session.startAt === 0 ? 'Taken on right away' : `Taken on at minute ${session.startAt}`} · ${session.events.filter((e) => e.kind === 'resisted').length} distraction(s) continued through · about ${Math.round(session.minutes)} of 10 minutes on the task.`}
            </p>
            <p className="fine">
              Chance of taking it on right away: {Math.round(session.s * 100)}% (half your reported pattern, half the
              effort-reward tendency above). Move any slider and watch the session redraw.
            </p>
          </div>
        ) : (
          <TrajectoryChart series={series} span={spec.span} ticks={spec.ticks} fmtX={spec.fmt} equilibrium={eq} />
        )}
        <div className="legend" hidden={horizon === '10m'}>
          {series
            .slice()
            .reverse()
            .map((s) => (
              <span key={s.id} className={`lg ${s.variant}`}>
                <i />
                {s.label}
              </span>
            ))}
        </div>
        <p className="label">Rules of repetition</p>
        <div className="sliders">
          <Slider label="Moments per day" value={assumptions.perDay} min={1} max={10} step={1} format={(v) => v.toFixed(0)} onChange={setAs('perDay')} />
          <Slider label="Adaptation" hint="how much each completed moment lightens the next effort" value={assumptions.adaptation} min={1} max={10} onChange={setAs('adaptation')} minLabel="slow" maxLabel="fast" />
          <Slider label="Decay" hint="how much each set-aside moment weighs on the next" value={assumptions.decay} min={1} max={10} onChange={setAs('decay')} minLabel="slow" maxLabel="fast" />
        </div>
      </section>

      <section className="exp reveal-4">
        <div className="exp-head">
          <span className="mono small muted">What science knows</span>
        </div>
        <h3 className="h3">Effort, persistence, aging.</h3>
        <ScienceNotes />
      </section>

      <div className="closing">
        <p className="body muted">
          The model is a simplification. The question it points at — what makes the difficult thing feel worth doing — is
          real, and still being studied.
        </p>
        <div className="row-actions">
          <button className="btn btn-primary" onClick={onReplay}>
            Replay the experience ↺
          </button>
          <button className="btn btn-outline" onClick={onOtherCategory}>
            Test another category →
          </button>
        </div>
      </div>
    </div>
  );
}
