/**
 * Main-thread client for the solver worker, with transparent fallback to
 * main-thread solving when workers are unavailable (very old browsers,
 * restrictive CSP) or fail to start.
 */
import type { Face, Move } from '../cube/types'
import { formatAlgorithm, invertAlgorithm, parseAlgorithm } from '../cube/notation'
import { randomFacelets } from '../cube/randomState'
import { solveFaceletsSync, solveWithKociemba, ensureSolverReady } from './kociemba'
import type { SolutionResult } from './types'
import { SolveError } from './types'

interface Pending {
  resolve: (value: SolutionResult | RandomStateResult) => void
  reject: (err: unknown) => void
  timeout: ReturnType<typeof setTimeout>
  kind: 'solution' | 'random-state'
}

export interface RandomStateResult {
  facelets: number[]
  scramble: string
}

type WorkerConstructor = new () => Worker

let worker: Worker | null = null
let workerFailed = false
let nextId = 1
const pending = new Map<number, Pending>()

async function getWorker(): Promise<Worker | null> {
  if (worker) return worker
  if (workerFailed) return null
  if (typeof Worker === 'undefined') {
    workerFailed = true
    return null
  }
  try {
    const mod = await import('./solver.worker.ts?worker')
    const _ctor = (mod as { default: WorkerConstructor }).default
    const w = new _ctor()
    w.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        id: number
        type: string
        algorithm?: string
        moves?: { face: string; turns: number }[]
        htm?: number
        qtm?: number
        durationMs?: number
        facelets?: number[]
        scramble?: string
        code?: string
        message?: string
      }
      const entry = pending.get(data.id)
      if (!entry) return
      pending.delete(data.id)
      clearTimeout(entry.timeout)
      if (data.type === 'error') {
        entry.reject(
          new SolveError(
            (data.code as SolveError['code']) ?? 'solver-failed',
            data.message ?? 'Solver worker failed.',
          ),
        )
        return
      }
      if (data.type === 'solution' && entry.kind === 'solution') {
        const moves: Move[] = (data.moves ?? []).map((m) => ({
          face: m.face as Face,
          turns: m.turns as 1 | 2 | 3,
        }))
        entry.resolve({
          moves,
          algorithm: data.algorithm ?? formatAlgorithm(moves),
          htm: data.htm ?? moves.length,
          qtm: data.qtm ?? moves.length,
          solverId: 'kociemba',
          method: 'Kociemba two-phase (near-optimal, ≤ 21 moves)',
          isOptimal: false,
          durationMs: data.durationMs ?? 0,
        } satisfies SolutionResult)
        return
      }
      if (data.type === 'random-state' && entry.kind === 'random-state') {
        entry.resolve({
          facelets: data.facelets ?? [],
          scramble: data.scramble ?? '',
        } satisfies RandomStateResult)
        return
      }
      entry.reject(new SolveError('solver-failed', 'Unexpected response from solver worker.'))
    }
    w.onerror = () => {
      workerFailed = true
      try {
        w.terminate()
      } catch {
        /* ignore */
      }
      if (worker === w) worker = null
      for (const [, entry] of pending) {
        clearTimeout(entry.timeout)
        entry.reject(new SolveError('solver-unavailable', 'Solver worker crashed.'))
      }
      pending.clear()
    }
    worker = w
    return w
  } catch {
    workerFailed = true
    return null
  }
}

function callWorker(
  message: { type: 'solve' | 'random-state' | 'init'; facelets?: number[] },
  kind: 'solution' | 'random-state' | 'ready',
  timeoutMs: number,
): Promise<SolutionResult | RandomStateResult | null> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const w = await getWorker()
      if (!w) {
        reject(new SolveError('solver-unavailable', 'Web Workers are unavailable.'))
        return
      }
      const id = nextId++
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new SolveError('timeout', 'The solver took too long to respond. Please try again.'))
      }, timeoutMs)
      pending.set(id, {
        resolve: resolve as Pending['resolve'],
        reject,
        timeout,
        kind: kind === 'ready' ? 'solution' : kind,
      })
      w.postMessage({ ...message, id })
    })()
  })
}

/** Warm up the worker during idle time so the first solve feels instant. */
export function preloadSolver(): void {
  const kick = () => {
    void callWorker({ type: 'init' }, 'ready', 30000).catch(() => {
      /* Warmed lazily on first solve instead; failure is non-fatal. */
    })
  }
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(window as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(kick)
  } else {
    setTimeout(kick, 1500)
  }
}

/**
 * Solve cube facelets, preferring the worker and falling back to the main
 * thread when workers are unavailable. Validation errors from the engine are
 * propagated as-is (both paths run the same engine).
 */
export async function solveCube(
  facelets: readonly number[],
  opts: { timeoutMs?: number } = {},
): Promise<SolutionResult> {
  const timeoutMs = opts.timeoutMs ?? 30000
  const snapshot = facelets.slice()
  try {
    const result = await callWorker({ type: 'solve', facelets: snapshot }, 'solution', timeoutMs)
    return result as SolutionResult
  } catch (err) {
    if (err instanceof SolveError && err.code !== 'solver-unavailable' && err.code !== 'timeout') {
      throw err
    }
    // Worker path failed environmentally — fall back to main thread.
    return solveWithKociemba(snapshot)
  }
}

/** True random-state scramble: random cube + inverted optimal-ish solution. */
export async function randomStateScramble(
  opts: { timeoutMs?: number } = {},
): Promise<RandomStateResult> {
  const timeoutMs = opts.timeoutMs ?? 30000
  try {
    const result = await callWorker({ type: 'random-state' }, 'random-state', timeoutMs)
    return result as RandomStateResult
  } catch (err) {
    if (err instanceof SolveError && err.code !== 'solver-unavailable' && err.code !== 'timeout') {
      throw err
    }
    // Main-thread fallback: solve a locally generated random state.
    await ensureSolverReady()
    const facelets = randomFacelets()
    const { moves } = solveFaceletsSync(facelets)
    return { facelets, scramble: formatAlgorithm(invertAlgorithm(parseAlgorithm(formatAlgorithm(moves)))) }
  }
}

export function solverRunsInWorker(): boolean {
  return worker !== null && !workerFailed
}
