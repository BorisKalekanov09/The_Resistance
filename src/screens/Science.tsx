import { useState } from 'react';
import Tag from '../ui/Tag';
import type { TagKind } from '../ui/Tag';

interface Item {
  n: string;
  title: string;
  question: string;
  paragraphs: string[];
  tags: TagKind[];
  refs: string[];
}

const ITEMS: Item[] = [
  {
    n: '01',
    title: 'Effort',
    question: 'Why does the brain sometimes avoid difficult actions even when we know they are beneficial?',
    paragraphs: [
      'Effort behaves like a cost. In experiments, people and animals often discount a reward by the effort needed to get it — and choose the easier option when the reward is not worth it.',
      'Weighing costs against benefits involves distributed networks, including the cingulate cortex, parts of prefrontal cortex, the striatum and dopamine signalling. In rodents, disrupting the anterior cingulate shifts choices toward low-effort options.',
    ],
    tags: ['evidence'],
    refs: [
      'Walton et al., 2003 · J Neurosci',
      'Salamone & Correa, 2012 · Neuron',
      'Westbrook & Braver, 2015 · Cogn Affect Behav Neurosci',
    ],
  },
  {
    n: '02',
    title: 'Persistence',
    question: 'What brain systems are involved when we continue pursuing a goal despite difficulty?',
    paragraphs: [
      'The anterior midcingulate cortex is a highly connected hub, linked with prefrontal, motor, insular and subcortical regions. It is often active when tasks demand effort, when conflict arises, or when behaviour must be adjusted toward a goal.',
      'One influential idea is that it helps estimate whether investing control is worth it. But the aMCC is not a "willpower centre": persistence emerges from many interacting systems, and the same region takes part in pain, emotion and bodily regulation.',
    ],
    tags: ['evidence', 'speculative'],
    refs: [
      'Shenhav, Botvinick & Cohen, 2013 · Neuron',
      'Vogt, 2016 · Handb Clin Neurol',
      'Touroutoglou et al., 2020 · NeuroImage',
    ],
  },
  {
    n: '03',
    title: 'Aging',
    question: 'Could the ability to engage in challenging activities relate to cognitive resilience as we age?',
    paragraphs: [
      'This is an open scientific question. Research on cognitive reserve suggests that education and mentally demanding activities are associated with better resilience to age-related change — mostly in observational studies, which cannot establish cause.',
      'Studies of "superagers" — older adults with unusually youthful memory — have reported preserved cortical thickness in regions including the midcingulate cortex. These are correlations in small groups. There is no evidence that persistence or effortful choices prevent Alzheimer’s disease or dementia.',
    ],
    tags: ['evidence', 'speculative'],
    refs: [
      'Stern, 2012 · Lancet Neurol',
      'Sun et al., 2016 · J Neurosci',
      'Livingston et al., 2024 · Lancet Commission',
    ],
  },
];

/** The evidence notes: what research says, with its limits. */
export default function ScienceNotes() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="accordion">
      {ITEMS.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.n} className={`acc ${isOpen ? 'open' : ''}`}>
            <button className="acc-head" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
              <span className="mono acc-n">{it.n}</span>
              <span className="acc-title">{it.title}</span>
              <span className="acc-icon" aria-hidden />
            </button>
            <div className="acc-body">
              <div className="acc-inner">
                <p className="acc-q">{it.question}</p>
                {it.paragraphs.map((p, j) => (
                  <p key={j} className="body">
                    {p}
                  </p>
                ))}
                <div className="acc-foot">
                  <div className="acc-tags">
                    {it.tags.map((t) => (
                      <Tag key={t} kind={t} />
                    ))}
                  </div>
                  <ul className="refs">
                    {it.refs.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
