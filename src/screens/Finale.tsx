interface Props {
  onExplore: () => void;
  onReplay: () => void;
  onOtherCategory: () => void;
}

/** Screen 6 — an invitation to go deeper; the main experience is complete without it. */
export default function Finale({ onExplore, onReplay, onOtherCategory }: Props) {
  return (
    <section className="screen finale">
      <div className="intro-mark" aria-hidden>
        <svg viewBox="0 0 400 400">
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse key={i} cx="200" cy="200" rx={60 + i * 17} ry={44 + i * 13} className="contour" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
          <circle cx="226" cy="176" r="4" className="contour-dot" />
        </svg>
      </div>
      <div className="start-inner">
        <h1 className="display reveal-1">But what actually happens inside your brain?</h1>
        <p className="lede reveal-2">
          Meet the brain region researchers link to effort and persistence — and see what science does, and does not, know.
        </p>
        <div className="start-cta reveal-3">
          <button className="btn btn-primary btn-lg" onClick={onExplore}>
            Explore more
          </button>
          <button className="btn btn-outline btn-lg" onClick={onOtherCategory}>
            Test another category →
          </button>
          <button className="link" onClick={onReplay}>
            Replay from the start ↺
          </button>
        </div>
      </div>
    </section>
  );
}
