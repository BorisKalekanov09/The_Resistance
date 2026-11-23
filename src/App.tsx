import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Answers, Frequency } from './data/journey';
import { EMPTY_ANSWERS, STEPS, followThrough, inputsFromAnswers } from './data/journey';
import type { ModelInputs } from './model/effortModel';
import { runModel } from './model/effortModel';
import type { Horizon } from './model/trajectory';
import Ask from './screens/Ask';
import Explore from './screens/Explore';
import Finale from './screens/Finale';
import Result from './screens/Result';
import Start from './screens/Start';
import Timeline from './screens/Timeline';
import type { Assumptions } from './screens/Timeline';

const loadScene = () => import('./three/BrainScene');
const BrainScene = lazy(loadScene);
const prewarm = () => void loadScene().then(() => import('./three/anatomy')).then((m) => m.prewarmAnatomy());

type Stage = 'start' | 'ask' | 'sim' | 'time' | 'end' | 'explore';
const LAB_STAGES: Stage[] = ['sim', 'explore'];

const DEFAULT_ASSUMPTIONS: Assumptions = { perDay: 3, adaptation: 5, decay: 5 };
const TRANSITION_MS = 360;
const DEMO_ANSWERS: Answers = { frequency: 'few', domain: 'study', reason: 'unmotivated', feeling: 'guilty' };

/** `?demo=sim|time|end|explore` jumps straight to a screen with sample answers. */
function readDemo(): Stage | null {
  const d = new URLSearchParams(window.location.search).get('demo');
  return d && ['ask', 'sim', 'time', 'end', 'explore'].includes(d) ? (d as Stage) : null;
}

export default function App() {
  const demo = useMemo(readDemo, []);
  const [stage, setStage] = useState<Stage>(demo ?? 'start');
  const [leaving, setLeaving] = useState<'all' | 'panel' | null>(null);
  const [askIndex, setAskIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(demo ? DEMO_ANSWERS : EMPTY_ANSWERS);
  const [inputs, setInputs] = useState<ModelInputs>(() => inputsFromAnswers(demo ? DEMO_ANSWERS : EMPTY_ANSWERS));
  const [animateResult, setAnimateResult] = useState(demo === 'sim');
  const [horizon, setHorizon] = useState<Horizon>(() => {
    const h = new URLSearchParams(window.location.search).get('h');
    return demo && (h === '10mo' || h === '10y') ? h : '10m';
  });
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [highlight, setHighlight] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const inLab = LAB_STAGES.includes(stage);
  const answerInputs = useMemo(() => inputsFromAnswers(answers), [answers]);
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

  const pickFrequency = useCallback((f: Frequency) => setAnswers((a) => ({ ...a, frequency: f })), []);

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

  const replay = () =>
    go('start', () => {
      setAnswers(EMPTY_ANSWERS);
      setInputs(inputsFromAnswers(EMPTY_ANSWERS));
      setAskIndex(0);
      setHorizon('10m');
      setAssumptions(DEFAULT_ASSUMPTIONS);
      setHighlight(false);
      if (demo) window.history.replaceState(null, '', window.location.pathname);
    });

  const back = () => {
    if (stage === 'ask') return askIndex > 0 ? go('ask', () => setAskIndex(askIndex - 1)) : go('start');
    if (stage === 'sim') return go('ask', () => setAskIndex(STEPS.length - 1));
    if (stage === 'time') return go('sim', () => setAnimateResult(false));
    if (stage === 'end') return go('time');
    if (stage === 'explore') return go('end');
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
        <main className={`stage-plain ${leaving ? 'leaving' : ''}`} key={stage === 'ask' ? `ask-${askIndex}` : stage}>
          {stage === 'start' && <Start value={answers.frequency} onPick={pickFrequency} onContinue={begin} />}
          {stage === 'ask' && <Ask index={askIndex} value={answers[STEPS[askIndex].key]} onAnswer={answer} />}
          {stage === 'time' && (
            <Timeline
              answers={answers}
              result={result}
              assumptions={assumptions}
              horizon={horizon}
              setHorizon={setHorizon}
              onNext={() => go('end')}
            />
          )}
          {stage === 'end' && <Finale onExplore={() => go('explore')} onReplay={replay} />}
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
                  pFollow={followThrough(answers)}
                  assumptions={assumptions}
                  setAssumptions={setAssumptions}
                  onReplay={replay}
                />
              )}
            </div>
            <footer className="disclaimer fine">
              Illustrative educational model. Not a measurement of brain activity, willpower or future behavior, and not a
              predictor of brain development, dementia or Alzheimer’s disease.
            </footer>
          </div>
        </main>
      )}
    </div>
  );
}
