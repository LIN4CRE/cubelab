![CubeLab banner](docs/banner.png)

# CubeLab — Rubik's Cube Solver & Trainer

A free, offline-first 3×3 web app: paint or scan your cube, get a solution with an
animated 3D walkthrough, learn the beginner method, drill verified algorithms, and time
your solves — no account, no server, your data never leaves the device.

**Live demo:** https://DLinacre.github.io/cubelab/

## Features

- **Solver** — enter a cube by painting a 2D net, pasting a scramble, applying moves,
  scanning faces with the camera (with a mandatory verify-and-fix step), or shuffling
  randomly. Real validation with beginner-friendly errors, then a Kociemba-class
  ≤21-move solution or a stage-by-stage beginner solution, replayed on an animated 3D
  cube with play/pause/step/scrub and speed control.
- **Beginner guide** — searchable, step-by-step method with links into the library.
- **Algorithm library** — every entry empirically verified against the engine
  (2-look OLL/ESLL set, full PLL, F2L inserts). Search, filter by category, case/effect
  diagrams, 3D demo, one-click drill.
- **Drills** — algorithm practice with per-move mistake detection, hints, streaks and
  flawless-run tracking.
- **Timer** — hold-to-start speedcubing timer (Space / touch), WCA-style scrambles,
  +2/DNF penalties, Ao5/Ao12/Ao50, session history.
- **Stats** — single/Ao5 progress chart, time histogram, personal bests — all from your
  real solve history.
- **Offline PWA** — installable, works fully offline after the first visit.
- **Local-first** — everything persists in `localStorage`; export/import/delete any time.

## Getting started

Requires Node.js 20+.

```sh
npm ci
npm run dev        # local development
npm test           # vitest suite (73 tests)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

The production build for GitHub Pages needs the repo base path:

```sh
CUBELAB_BASE=/cubelab/ npm run build
```

## Architecture

```
src/
  cube/        Pure engine: facelet/cubie model, moves, notation, validator,
               scramble generator, random-state sampler. Zero dependencies.
  solver/      Kociemba two-phase engine (min2phase, Web Worker + main-thread
               fallback), beginner-method solver, cross table, worker client.
  algorithms/  Verified library (PLL, OLL, F2L inserts), beginner curriculum,
               case/effect state derivation.
  app/         Zustand store (persisted), WCA stats helpers.
  components/  React UI: 3D viewer (three.js), net editor, camera scan,
               solve/guide/library/drill/timer/stats/settings panels.
```

Correctness rules: the 3D animation math is proven against the engine's move tables by
test; every library algorithm is verified by applying it to real cube states in CI.
See `src/components/cubeLayout.test.ts` and `src/algorithms/library.test.ts`.

## Credits

- Two-phase solver: [min2phase.js](https://github.com/cs0x7f/min2phase.js) by cs0x7f
  (MIT/GPL-3.0), an implementation of Herbert Kociemba's two-phase algorithm.
- Rendering: [three.js](https://threejs.org) (MIT) · State: [zustand](https://github.com/pmndrs/zustand) (MIT).
- Beginner method follows the classic cross → corners → middle layer → top cross →
  top face → corners → edges progression.

Not affiliated with Rubik's®. The word "cubelab" artwork in `docs/` and `public/icons/`
is original to this project.

## License

MIT — see [LICENSE](LICENSE).
