<div align="center">
  <img src="docs/banner.png" alt="CubeLab — Rubik's Cube Solver & Speedcubing Trainer" width="100%" style="border-radius: 12px; margin-bottom: 16px;" />

  # 🎲 CubeLab — 3D Rubik's Cube Solver & Speedcubing Trainer

  **A free, offline-first 3×3 speedcubing laboratory: interactive 3D WebGL cube, Kociemba ≤21-move optimal solver, camera face scanning, verified algorithm library, drill engine, and WCA hold-to-start timer.**<br>
  Runs 100% client-side with zero telemetry — your solve data never leaves your device.<br>
  Part of the curated [linacre.site](https://www.linacre.site/) open-source ecosystem.

  [![Live Web App](https://img.shields.io/badge/Live_Web_App-Interactive_3D_Lab-10b981?style=for-the-badge&logo=google-chrome&logoColor=white)](https://lin4cre.github.io/cubelab/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
  [![React 19](https://img.shields.io/badge/React-19-61dafb.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
  [![Three.js](https://img.shields.io/badge/Three.js-0.186-049ef4.svg?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8.svg?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Vitest](https://img.shields.io/badge/Tests-73%20Passed-22c55e.svg?style=flat-square&logo=vitest&logoColor=white)](src/)
  [![PWA](https://img.shields.io/badge/PWA-100%25%20Offline%20Ready-purple?style=flat-square)](#offline-pwa)
</div>

---

## 🌐 Launch the 3D Studio Directly in Your Browser

👉 **[lin4cre.github.io/cubelab](https://lin4cre.github.io/cubelab/)**

- **Two-Phase Optimal Solver:** Computes sub-second solutions under 21 moves via Web Worker (Kociemba algorithm) or step-by-step layer-by-layer beginner explanations.
- **Interactive 3D WebGL Playback:** Scrub forward and backward through move solutions with speed sliders and smooth rotational physics.
- **Camera Scanning & Net Painter:** Point your webcam or phone camera at each facelet, or paint colors on an unfolded 2D net with automatic parity and edge validation.
- **Verified Algorithm Library:** 2-Look OLL, full PLL, and F2L inserts with interactive move diagrams and mistake-highlighting practice drills.
- **WCA-Calibrated Timer:** Hold spacebar or touch screen to arm, release to time, tracking Ao5, Ao12, session averages, and solve distribution histograms.

---

## 🚀 Building & Testing Locally

```bash
git clone https://github.com/LIN4CRE/cubelab.git
cd cubelab
npm install
npm test           # Runs 73 unit tests across engine & solvers
npm run build      # Builds optimized PWA bundle
```

---

## 📄 License

MIT © [David Linacre](https://github.com/LIN4CRE) · [linacre.site](https://www.linacre.site/)
