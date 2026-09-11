/**
 * Kociemba two-phase solver adapter (near-optimal, ≤ 21 moves).
 *
 * The heavy search runs in a Web Worker (see solver.worker.ts) so the UI
 * stays responsive. This module is the main-thread fallback plus the shared
 * result-parsing logic used by both paths.
 *
 * Engine: min2phase.js (Chen Shuang's Kociemba two-phase implementation,
 * MIT-licensed) — solves via facelet string, returns Singmaster notation.
 */
import type { Move } from '../cube/types'
import { CubeState, formatAlgorithm, moveMetrics, parseAlgorithm } from '../cube/index'
import type { SolutionResult, SolveErrorCode } from './types'
import { SolveError } from './types'

type Min2PhaseModule = typeof import('min2phase.js') & {
  default?: {
    solve: (facelets: string) => string
    randomCube: () => string
    fromScramble: (scramble: string) => string
    initFull: () => void
  }
}

let cachedEngine: {
  solve: (facelets: string) => string
  randomCube: () => string
  fromScramble: (scramble: string) => string
  initFull: () => void
} | null = null
let readyPromise: Promise<void> | null = null

function unwrapEngine(mod: Min2PhaseModule) {
  // CJS interop: the engine may arrive as default export or namespace.
  const candidate = (mod as { default?: unknown }).default ?? (mod as unknown)
  const engine = candidate as {
    solve?: (facelets: string) => string
    randomCube?: () => string
    fromScramble?: (scramble: string) => string
    initFull?: () => void
  }
  if (typeof engine.solve !== 'function' || typeof engine.initFull !== 'function') {
    throw new SolveError(
      'solver-unavailable',
      'The solving engine failed to load. Check your connection and reload the app.',
    )
  }
  return engine as {
    solve: (facelets: string) => string
    randomCube: () => string
    fromScramble: (scramble: string) => string
    initFull: () => void
  }
}

/** Load the engine and build pruning tables (idempotent). */
export function ensureSolverReady(): Promise<void> {
  if (cachedEngine) return Promise.resolve()
  if (!readyPromise) {
    readyPromise = (async () => {
      let mod: Min2PhaseModule
      try {
        mod = (await import('min2phase.js')) as Min2PhaseModule
      } catch {
        readyPromise = null
        throw new SolveError(
          'solver-unavailable',
          'The solving engine could not be loaded. The app works offline after the first load — please reload once with a connection.',
        )
      }
      const engine = unwrapEngine(mod)
      // initFull blocks ~100-400ms building pruning tables; yield first so
      // callers can paint a loading state.
      await new Promise((resolve) => setTimeout(resolve, 0))
      engine.initFull()
      cachedEngine = engine
    })()
  }
  return readyPromise
}

export function isSolverReady(): boolean {
  return cachedEngine !== null
}

const MIN2PHASE_ERRORS: Record<string, { code: SolveErrorCode; message: string }> = {
  'Error 1': {
    code: 'invalid-cube',
    message: 'The solver rejected this cube: sticker colors are miscounted. Re-check your input.',
  },
  'Error 2': {
    code: 'duplicate-piece',
    message: 'The solver found a duplicated edge piece. Two edges show the same stickers.',
  },
  'Error 3': {
    code: 'flipped-edge',
    message: 'The solver found a flipped edge — this configuration cannot exist on a real cube.',
  },
  'Error 4': {
    code: 'duplicate-piece',
    message: 'The solver found a duplicated corner piece. Two corners show the same stickers.',
  },
  'Error 5': {
    code: 'twisted-corner',
    message: 'The solver found a twisted corner — this configuration cannot exist on a real cube.',
  },
  'Error 6': {
    code: 'parity',
    message: 'The solver found a parity error — two pieces appear swapped, which is impossible on a real cube.',
  },
  'Error 7': {
    code: 'solver-failed',
    message: 'The solver could not find a solution within its search limits. Please try again.',
  },
  'Error 8': {
    code: 'solver-failed',
    message: 'The solver could not find a solution within its search limits. Please try again.',
  },
}

function toMoves(algorithm: string): Move[] {
  const trimmed = algorithm.trim()
  if (trimmed === '') return []
  return parseAlgorithm(trimmed)
}

/** Synchronous solve — engine must be ready (worker path or warmed fallback). */
export function solveFaceletsSync(facelets: readonly number[]): { moves: Move[]; algorithm: string } {
  if (!cachedEngine) {
    throw new SolveError('solver-unavailable', 'Solving engine is not initialized yet.')
  }
  const faceletString = new CubeState(facelets).toFaceletString()
  const raw = cachedEngine.solve(faceletString)
  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (normalized.startsWith('Error')) {
    const key = normalized.split(' ').slice(0, 2).join(' ')
    const mapped = MIN2PHASE_ERRORS[key] ?? MIN2PHASE_ERRORS[normalized]
    if (mapped) throw new SolveError(mapped.code, mapped.message)
    throw new SolveError('solver-failed', `The solver reported an error (${normalized}). Please try again.`)
  }
  const moves = toMoves(normalized)
  return { moves, algorithm: formatAlgorithm(moves) }
}

/** Exposed for engine cross-check tests (independent cubie implementation). */
export async function min2phaseFromScramble(scramble: string): Promise<string> {
  await ensureSolverReady()
  if (!cachedEngine) throw new SolveError('solver-unavailable', 'Engine not ready')
  return cachedEngine.fromScramble(scramble)
}

/** Main-thread solve with timing (used as worker fallback). */
export async function solveWithKociemba(facelets: readonly number[]): Promise<SolutionResult> {
  const started = performance.now()
  await ensureSolverReady()
  const { moves, algorithm } = solveFaceletsSync(facelets)
  const metrics = moveMetrics(moves)
  return {
    moves,
    algorithm,
    htm: metrics.htm,
    qtm: metrics.qtm,
    solverId: 'kociemba',
    method: 'Kociemba two-phase (near-optimal, ≤ 21 moves)',
    isOptimal: false,
    durationMs: performance.now() - started,
  }
}
