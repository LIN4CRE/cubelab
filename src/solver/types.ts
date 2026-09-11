/** Solver-agnostic types. Every solver implements the same contract. */
import type { Move } from '../cube/types'

export type SolverId = 'kociemba' | 'inverse-scramble'

export interface SolutionResult {
  /** Solution moves in order. */
  moves: Move[]
  /** Solution as Singmaster notation. */
  algorithm: string
  /** Half-turn metric (move count). */
  htm: number
  /** Quarter-turn metric. */
  qtm: number
  /** Which solver produced this. */
  solverId: SolverId
  /** Human-readable method name, e.g. "Kociemba two-phase". */
  method: string
  /**
   * Always false: we never claim optimality. Kociemba solutions are
   * near-optimal (guaranteed ≤ 21 moves here) but not proven optimal.
   */
  isOptimal: false
  /** Wall-clock solve time in milliseconds. */
  durationMs: number
}

export type SolveErrorCode =
  | 'invalid-cube'
  | 'invalid-input'
  | 'unreadable'
  | 'internal'
  | 'twisted-corner'
  | 'flipped-edge'
  | 'parity'
  | 'duplicate-piece'
  | 'solver-failed'
  | 'solver-unavailable'
  | 'timeout'

export class SolveError extends Error {
  readonly code: SolveErrorCode
  constructor(code: SolveErrorCode, message: string) {
    super(message)
    this.name = 'SolveError'
    this.code = code
  }
}

export interface Solver {
  readonly id: SolverId
  readonly method: string
  solve(facelets: readonly number[]): Promise<SolutionResult>
}
