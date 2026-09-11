/**
 * Scramble generator (WCA-style random-move scrambles).
 *
 * Guarantees:
 * - no two consecutive moves on the same face (never "R R'" style redundancy)
 * - no "R L R" style same-axis sandwich that could collapse
 * - configurable length, seeded RNG support for tests
 */
import type { Face, Move } from './types'
import { FACE_AXIS, FACES } from './types'

export type Rng = () => number

/** Deterministic RNG (mulberry32) for tests. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEFAULT_SCRAMBLE_LENGTH = 20

export function generateScramble(length = DEFAULT_SCRAMBLE_LENGTH, rng: Rng = Math.random): Move[] {
  const target = Math.max(1, Math.min(100, Math.floor(length)))
  const moves: Move[] = []
  let prevFace: Face | null = null
  let prevAxis: number | null = null
  let prevPrevAxis: number | null = null
  for (let i = 0; i < target; i++) {
    const candidates = FACES.filter((f) => {
      if (f === prevFace) return false
      // Avoid same-axis sandwiches like R L R (collapsible / confusing).
      if (
        prevAxis !== null &&
        prevPrevAxis !== null &&
        FACE_AXIS[f] === prevAxis &&
        prevAxis === prevPrevAxis
      ) {
        return false
      }
      return true
    })
    const pool = candidates.length > 0 ? candidates : FACES.filter((f) => f !== prevFace)
    const face = pool[Math.floor(rng() * pool.length)] as Face
    const roll = rng()
    const turns = (roll < 1 / 3 ? 1 : roll < 2 / 3 ? 2 : 3) as 1 | 2 | 3
    moves.push({ face, turns })
    prevPrevAxis = prevAxis
    prevAxis = FACE_AXIS[face]
    prevFace = face
  }
  return moves
}

/**
 * Structural check used by tests and the UI: the sequence must contain no
 * trivially redundant patterns.
 */
export function isCleanScramble(moves: readonly Move[]): boolean {
  for (let i = 1; i < moves.length; i++) {
    const a = moves[i - 1] as Move
    const b = moves[i] as Move
    if (a.face === b.face) return false
  }
  for (let i = 2; i < moves.length; i++) {
    const a = moves[i - 2] as Move
    const b = moves[i - 1] as Move
    const c = moves[i] as Move
    if (a.face === c.face && FACE_AXIS[a.face] === FACE_AXIS[b.face]) return false
  }
  return true
}
