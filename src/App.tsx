import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LabCategory } from './data/categoryLab';
import { labQuestions } from './data/categoryLab';
import type { Answers, ScenarioId, Today } from './data/journey';
import { EMPTY_ANSWERS, SAMPLE_ANSWERS, SCENARIOS, STEPS, inputsFromAnswers, profileFromAnswers, scenarioFor } from './data/journey';
import type { ModelInputs } from './model/effortModel';
import { runModel } from './model/effortModel';
import type { Choices } from './model/categoryModel';
import { FACTOR_KEYS, evaluate, factorsFrom } from './model/categoryModel';
import type { Horizon } from './model/trajectory';
import Analysis from './screens/Analysis';
import Ask from './screens/Ask';
import CategoryPick from './screens/CategoryPick';
import type { LabRun } from './screens/CategoryPick';
import Explore from './screens/Explore';
import Finale from './screens/Finale';
import Result from './screens/Result';
import Start from './screens/Start';
import Timeline from './screens/Timeline';
import type { Assumptions } from './screens/Timeline';

const loadScene = () => import('./three/BrainScene');
const BrainScene = lazy(loadScene);
const prewarm = () => void loadScene().then(() => import('./three/anatomy')).then((m) => m.prewarmAnatomy());

type Stage = 'start' | 'ask' | 'sim' | 'time' | 'end' | 'explore' | 'pick' | 'labAsk' | 'analysis';
const LAB_STAGES: Stage[] = ['sim', 'explore'];

const DEFAULT_ASSUMPTIONS: Assumptions = { perDay: 3, adaptation: 5, decay: 5 };
const TRANSITION_MS = 360;
/** `?s=engaging|returning|focused|lighter|mixed` picks the sample answers used by `?demo=…`. */
function demoAnswers(): Answers {
  const s = new URLSearchParams(window.location.search).get('s') as ScenarioId | null;
  return SAMPLE_ANSWERS[s && s in SAMPLE_ANSWERS ? s : 'returning'];
}
const DEMO_CHOICES: Choices = { duration: 1, intensity: 2, value: 2, delay: 2, certainty: 1, energy: 2 };
const DEMO_STAGES: Stage[] = ['ask', 'sim', 'time', 'end', 'explore', 'pick', 'analysis'];

/** `?demo=sim|time|end|explore|pick|analysis` jumps straight to a screen with sample answers. */
function readDemo(): Stage | null {
  const d = new URLSearchParams(window.location.search).get('demo');
  return d && DEMO_STAGES.includes(d as Stage) ? (d as Stage) : null;
}

const FACTOR_COMPLETE = (c: Partial<Choices>): c is Choices =>
  FACTOR_KEYS.every((k) => typeof c[k] === 'number');

export default function App() {
  const demo = useMemo(readDemo, []);
  const [stage, setStage] = useState<Stage>(demo ?? 'start');
  const [leaving, setLeaving] = useState<'all' | 'panel' | null>(null);
  const [askIndex, setAskIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => (demo ? demoAnswers() : EMPTY_ANSWERS));
  const [inputs, setInputs] = useState<ModelInputs>(() => inputsFromAnswers(demo ? demoAnswers() : EMPTY_ANSWERS));
  const [animateResult, setAnimateResult] = useState(demo === 'sim');
  const [horizon, setHorizon] = useState<Horizon>(() => {
    const h = new URLSearchParams(window.location.search).get('h');
    return demo && (h === '10mo' || h === '10y') ? h : '10m';
  });
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [highlight, setHighlight] = useState(false);
  // technical category simulation
  const [labDomain, setLabDomain] = useState<LabCategory>('work');
  const [labIndex, setLabIndex] = useState(0);
  const [labChoices, setLabChoices] = useState<Partial<Choices>>(demo === 'analysis' ? DEMO_CHOICES : {});
  const [labRuns, setLabRuns] = useState<LabRun[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const inLab = LAB_STAGES.includes(stage);
  const labSteps = useMemo(() => labQuestions(labDomain), [labDomain]);
  const firstResult = useMemo(() => runModel(inputsFromAnswers(answers)), [answers]);
  const answerInputs = useMemo(() => inputsFromAnswers(answers), [answers]);
  const scenario = useMemo(() => scenarioFor(answers), [answers]);
  const answerProfile = useMemo(() => profileFromAnswers(answers), [answers]);
  const result = useMemo(() => runModel(inputs), [inputs]);

  useEffect(() => {
    if (demo) prewarm();
  }, [demo]);

  // light up the aMCC shortly after the head appears
  useEffect(() => {
    if (!inLab || highlight) return;
    const t = window.setTimeout(() => setHighlight(true), 1200);
    return () => window.clearTimeout(t);
  }, [inLab, highlight]);

  const go = useCallback(
    (next: Stage, mutate?: () => void) => {
      const both = LAB_STAGES.includes(next) && LAB_STAGES.includes(stage);
      setLeaving(both ? 'panel' : 'all');
      window.setTimeout(() => {
        mutate?.();
        setStage(next);
        setLeaving(null);
        window.scrollTo({ top: 0 });
        panelRef.current?.scrollTo({ top: 0 });
      }, TRANSITION_MS);
    },
    [stage],
  );

  const pickToday = useCallback((t: Today) => setAnswers((a) => ({ ...a, today: t })), []);

  const begin = useCallback(() => {
    prewarm(); // fetch the 3D chunk and build the anatomy while the user answers
    go('ask', () => setAskIndex(0));
  }, [go]);

  const answer = (id: string) => {
    const next = { ...answers, [STEPS[askIndex].key]: id } as Answers;
    if (askIndex < STEPS.length - 1) {
      go('ask', () => {
        setAnswers(next);
        setAskIndex(askIndex + 1);
      });
      return;
    }
    go('sim', () => {
      setAnswers(next);
      setInputs(inputsFromAnswers(next));
      setAnimateResult(true);
    });
  };

  const pickCategory = useCallback(
    (d: LabCategory) =>
      go('labAsk', () => {
        setLabDomain(d);
        setLabIndex(0);
        setLabChoices({});
      }),
    [go],
  );

  const labAnswer = (id: string) => {
    const key = labSteps[labIndex].key;
    const next = { ...labChoices, [key]: Number(id) };
    if (labIndex < labSteps.length - 1) {
      go('labAsk', () => {
        setLabChoices(next);
        setLabIndex(labIndex + 1);
      });
      return;
    }
    go('analysis', () => {
      setLabChoices(next);
      setLabRuns((runs) => [...runs, { domain: labDomain, P: evaluate(factorsFrom(next as Choices)).P }]);
    });
  };

  const replay = () =>
    go('start', () => {
      setAnswers(EMPTY_ANSWERS);
      setInputs(inputsFromAnswers(EMPTY_ANSWERS));
      setAskIndex(0);
      setHorizon('10m');
      setAssumptions(DEFAULT_ASSUMPTIONS);
      setHighlight(false);
      setLabRuns([]);
      setLabChoices({});
      if (demo) window.history.replaceState(null, '', window.location.pathname);
    });

  const back = () => {
    if (stage === 'ask') return askIndex > 0 ? go('ask', () => setAskIndex(askIndex - 1)) : go('start');
    if (stage === 'sim') return go('ask', () => setAskIndex(STEPS.length - 1));
    if (stage === 'time') return go('sim', () => setAnimateResult(false));
    if (stage === 'end') return go('time');
    if (stage === 'explore') return go('end');
    if (stage === 'pick') return go('end');
    if (stage === 'labAsk') return labIndex > 0 ? go('labAsk', () => setLabIndex(labIndex - 1)) : go('pick');
    if (stage === 'analysis') return go('labAsk', () => setLabIndex(labSteps.length - 1));
  };

  return (
    <div className={`app ${inLab ? 'is-lab' : ''} stage-${stage}`}>
      <header className={`topbar ${stage === 'start' ? 'hidden' : ''}`}>
        <button className="wordmark" onClick={replay} title="Start over">
          The Resistance
        </button>
        {stage !== 'start' && (
          <div className="topbar-actions">
            <button className="link" onClick={back}>
              ← Back
            </button>
            <button className="link" onClick={replay}>
              Replay ↺
            </button>
          </div>
        )}
      </header>

      {!inLab && (
        <main className={`stage-plain ${leaving ? 'leaving' : ''}`} key={stage === 'ask' ? `ask-${askIndex}` : stage === 'labAsk' ? `lab-${labIndex}` : stage}>
          {stage === 'start' && <Start value={answers.today} onPick={pickToday} onContinue={begin} />}
          {stage === 'ask' && <Ask index={askIndex} offset={1} value={answers[STEPS[askIndex].key]} onAnswer={answer} />}
          {stage === 'time' && (
            <Timeline
              scenario={scenario.id}
              profile={answerProfile}
              result={result}
              assumptions={assumptions}
              horizon={horizon}
              setHorizon={setHorizon}
              onNext={() => go('end')}
            />
          )}
          {stage === 'end' && <Finale onExplore={() => go('explore')} onReplay={replay} onOtherCategory={() => go('pick')} />}
          {stage === 'pick' && <CategoryPick runs={labRuns} onPick={pickCategory} />}
          {stage === 'labAsk' && (
            <Ask
              index={labIndex}
              steps={labSteps}
              kicker="Six questions. Each answer becomes a number in the model."
              value={labSteps[labIndex].key in labChoices ? String(labChoices[labSteps[labIndex].key]) : null}
              onAnswer={labAnswer}
            />
          )}
          {stage === 'analysis' && FACTOR_COMPLETE(labChoices) && (
            <Analysis
              domain={labDomain}
              choices={labChoices}
              first={{ label: SCENARIOS[scenario.id].title, result: firstResult }}
              onAnother={() => go('pick')}
              onChangeAnswers={() => go('labAsk', () => setLabIndex(0))}
              onReplay={replay}
            />
          )}
        </main>
      )}

      {inLab && (
        <main className={`lab ${leaving === 'all' ? 'leaving' : ''}`}>
          <div className="lab-stage">
            <div className="iris">
              <Suspense fallback={<div className="scene-loading label">Preparing anatomy…</div>}>
                <BrainScene highlight={highlight} showLabel={highlight} />
              </Suspense>
            </div>
            <p className="stage-caption fine">
              Head: 3D scan by Lee Perry-Smith, Infinite Realities (CC BY 3.0). Brain illustrative, generated
              procedurally; not a depiction of neural activity.
            </p>
          </div>
          <div className="lab-panel" ref={panelRef}>
            <div className={`panel-anim ${leaving === 'panel' ? 'leaving' : ''}`} key={stage}>
              {stage === 'sim' && (
                <Result
                  answers={answers}
                  scenario={scenario}
                  profile={answerProfile}
                  inputs={inputs}
                  answerInputs={answerInputs}
                  setInputs={setInputs}
                  result={result}
                  animate={animateResult}
                  onAnimated={() => setAnimateResult(false)}
                  onChangeAnswers={() => go('ask', () => setAskIndex(0))}
                  onNext={() => go('time', () => setHorizon('10m'))}
                />
              )}
              {stage === 'explore' && (
                <Explore
                  inputs={inputs}
                  setInputs={setInputs}
                  result={result}
                  profile={answerProfile}
                  assumptions={assumptions}
                  setAssumptions={setAssumptions}
                  onReplay={replay}
                  onOtherCategory={() => go('pick')}
                />
              )}
            </div>
            <footer className="disclaimer fine">
              Illustrative educational model of self-reported behavior. Not a personality test or diagnosis, not a
              measurement of brain activity or willpower, and not a predictor of brain development, dementia or Alzheimer’s
              disease.
            </footer>
          </div>
        </main>
      )}
    </div>
  );
}
