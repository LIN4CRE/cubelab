import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// Base path for deployment. GitHub Pages project sites live under /<repo>/;
// local dev and previews use '/'. Set CUBELAB_BASE=/cubelab/ when building.
const base = process.env.CUBELAB_BASE ?? './'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache the whole build (app shell + solver worker + engine) so the
        // solver works fully offline after first load.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: "CubeLab — Rubik's Cube Solver & Trainer",
        short_name: 'CubeLab',
        description:
          "Free offline-first 3×3 solver, beginner guide, algorithm library, drills, timer and stats.",
        theme_color: '#070b16',
        background_color: '#05070f',
        display: 'standalone',
        orientation: 'any',
        scope: '.',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // The lazy three.js chunk is ~135 kB gzipped; that is expected for 3D.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 60000,
    pool: 'forks',
  },
})
