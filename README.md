# The Resistance

An interactive exhibit about effort, decisions and the anterior midcingulate cortex (aMCC).
React + TypeScript + Vite + React Three Fiber. Runs entirely in the browser: no backend, no API keys.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Journey

Personal question (“How many times today did you tell yourself: I’ll do it later?”) → three short questions, one per screen → the 3D head with the aMCC highlighted while the model runs → one simulated action tendency, explained in plain language → “What if this pattern repeated over time?” as a pencil-sketch research notebook (10 minutes / 10 months / 10 years) → optional “Explore more” with the interactive brain, two live experiments and the science notes.

Answers are kept as three separate results in `src/data/journey.ts`: a reported postponement pattern (Not once = 10, 1–3 times = 50, More than 3 times = 90), a descriptive emotional response (no number, not used by the model) and a decision context (the activity, which sets the simulation scenario). The effort-reward simulation has its own inputs (perceived effort, expected reward, sensitivity to effort); answers only set their starting values, explained to users under “How were the simulation inputs set?”. The questionnaire is not a validated psychological test.

To jump straight to a screen while developing, add `?demo=ask|sim|time|end|explore` to the URL (sample answers are filled in). On the timeline, `&h=10mo` or `&h=10y` opens a specific horizon.

## Models (illustrative, not validated)

- `src/model/effortModel.ts` computes `V = R − E·C` and `P = 1 / (1 + e^(−6V))`, with R = reward/10, E = effort/10 and C = sensitivity/5.
  Your choices set the starting effort sensitivity.
- `src/model/trajectory.ts` tracks a dimensionless persistence index that changes by its expected value at each modeled decision:
  `I += α·p·(1−I) − β·(1−p)·I`. Here `p` mixes 50/50 your actual choice rate with the effort model, and the index slightly lowers the modeled effort sensitivity.

Neither model measures brain activity or predicts behaviour, brain change, ageing, dementia or Alzheimer's disease.

## 3D anatomy

The brain is generated in code in `src/three/anatomy.ts`. The head is a real 3D scan loaded from `public/models/head.glb`.
- The cortex is made of shaped ellipsoid hemispheres folded with domain-warped simplex noise, plus Sylvian and central sulci.
- The cerebellum has folia and sits above a brainstem.
- The head is "Infinite, 3D Head Scan" by Lee Perry-Smith (Infinite Realities, based on a work at www.triplegangers.com), licensed under
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); see `public/models/head-LICENSE.txt`.
  `scripts/clean-head.mjs` derives `head.glb` from the three.js example copy (`examples/models/gltf/LeePerrySmith/LeePerrySmith.glb`).
  It welds the UV seams and strips interior geometry (mouth and eye pockets) that would show through a transparent material.
  At load time the scan is scaled to life size (about 23 cm from crown to chin), seated so the cranial vault encloses the brain, and given a baked cavity term used as soft ambient occlusion.
- The head is drawn with a semi-transparent porcelain shader (wrap lighting, fresnel rim, cavity occlusion) in two passes: faint inner faces, then the outer surface.
- The default view is a three-quarter profile with a gentle idle sway; dragging rotates freely. Add `?az=<degrees>` to pin the camera azimuth (0 = facing the camera).
- The aMCC marker's position is approximate and only illustrative.
