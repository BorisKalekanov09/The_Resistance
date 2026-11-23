# The Resistance

An interactive exhibit about effort, decisions and the anterior midcingulate cortex (aMCC).
React + TypeScript + Vite + React Three Fiber. Runs entirely in the browser: no backend, no API keys.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Journey

The familiar opener (“How many times today did you tell yourself: I’ll do it later?”, shown back but not scored), then four short questions about how you usually approach difficult things (starting, choosing the harder option, distractions, how finishing feels) → the 3D head with the aMCC highlighted while the model runs → your reported pattern and one simulated action tendency, explained in plain language → “What if this pattern repeated over time?” as a pencil-sketch research notebook (10 minutes / 10 months / 10 years), with a switch to explore the other behavioral scenarios → optional “Explore more” with the interactive brain, two live experiments and the science notes.

Answers are used in three separate ways (`src/data/journey.ts`): a transparent behavioral profile (taking it on right away, coming back to it, staying with it despite distractions), a behavioral scenario chosen from that profile by a plain rule (taking on the challenge / coming back to it / holding focus / choosing the lighter path / a mixed pattern), and starting values for the effort-reward simulation (perceived effort, expected reward, sensitivity to effort), which users can change. The profile drives the hypothetical repetition model in `src/model/trajectory.ts`; the scenarios are not ranked, and nothing is translated into a neural measurement. The aMCC drawing never changes with the scenario. The questionnaire is not a personality test, a diagnosis or a measurement of willpower.

To jump straight to a screen while developing, add `?demo=ask|sim|time|end|explore` to the URL (sample answers are filled in; add `&s=engaging|returning|focused|lighter|mixed` to pick which). On the timeline, `&h=10mo` or `&h=10y` opens a specific horizon.

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
