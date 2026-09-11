/**
 * Inverse-scramble solver: when the scramble that produced a state is known
 * (e.g. the user scrambled inside the app), the exact solution is simply the
 * optimized inverse. This is a legitimate, exact solving strategy — and it is
 * always labeled honestly as such.
 */
import type { Move } from '../cube/types'
import { formatAlgorithm, invertAlgorithm, moveMetrics, optimizeMoves } from '../cube/index'
import type { SolutionResult } from './types'

export function solveByInvertingScramble(scramble: readonly Move[]): SolutionResult {
  const started = performance.now()
  const moves = optimizeMoves(invertAlgorithm(scramble))
  const metrics = moveMetrics(moves)
  return {
    moves,
    algorithm: formatAlgorithm(moves),
    htm: metrics.htm,
    qtm: metrics.qtm,
    solverId: 'inverse-scramble',
    method: 'Inverse of known scramble (exact reversal)',
    isOptimal: false,
    durationMs: performance.now() - started,
  }
}
