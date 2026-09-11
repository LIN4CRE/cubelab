/**
 * Singmaster notation: parsing, formatting, inversion and optimization.
 *
 * Supported: U R F D L B with optional `2` and/or `'` suffixes, grouping
 * parentheses (ignored, for readability), and arbitrary whitespace.
 * Unsupported tokens (slice/wide moves M E S r, rotations x y z) produce a
 * clear NotationError instead of being silently misinterpreted.
 */
import type { Face, Move } from './types'
import { FACE_AXIS, isFace } from './types'

export class NotationError extends Error {
  readonly position: number
  constructor(message: string, position = -1) {
    super(message)
    this.name = 'NotationError'
    this.position = position
  }
}

export function formatMove(move: Move): string {
  return move.turns === 1 ? move.face : move.turns === 2 ? `${move.face}2` : `${move.face}'`
}

export function formatAlgorithm(moves: readonly Move[]): string {
  return moves.map(formatMove).join(' ')
}

/**
 * Parse a Singmaster algorithm string into moves.
 * @throws NotationError on invalid input.
 */
export function parseAlgorithm(input: string): Move[] {
  const moves: Move[] = []
  // Normalize unicode apostrophes/quotes to ASCII apostrophe.
  const text = input.replace(/[’‘`´]/g, "'")
  let i = 0
  const fail = (message: string): never => {
    throw new NotationError(`${message} (at character ${i + 1} in "${input.trim()}")`, i)
  }
  while (i < text.length) {
    const ch = text[i] as string
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '(' || ch === ')') {
      i++
      continue
    }
    if (ch === '.' || ch === ',') {
      // Tolerate stray separators people paste from guides.
      i++
      continue
    }
    if (isFace(ch)) {
      const face = ch as Face
      i++
      let turns: 1 | 2 | 3 = 1
      let sawTwo = false
      let sawPrime = false
      // Accept suffixes in any order: 2, ', 2', '2
      while (i < text.length) {
        const s = text[i] as string
        if (s === '2' && !sawTwo) {
          sawTwo = true
          i++
        } else if (s === "'" && !sawPrime) {
          sawPrime = true
          i++
        } else {
          break
        }
      }
      if (sawTwo) turns = 2
      else if (sawPrime) turns = 3
      moves.push({ face, turns })
      continue
    }
    if (ch === '2' || ch === "'") {
      fail(`Stray "${ch}" without a face letter before it`)
    }
    if ('MESmes'.includes(ch)) {
      fail(
        `Slice move "${ch}" is not supported — this trainer uses face turns only (U R F D L B)`,
      )
    }
    if ('xyz'.includes(ch) || 'XYZ'.includes(ch)) {
      fail(
        `Cube rotation "${ch}" is not supported — rotate the 3D view instead, or rewrite without rotations`,
      )
    }
    if ('urfdlb'.includes(ch)) {
      fail(
        `Wide move "${ch}" is not supported — use face turns only (did you mean "${ch.toUpperCase()}")?`,
      )
    }
    fail(`Unexpected character "${ch}" — expected a face letter U, R, F, D, L or B`)
  }
  return moves
}

/** True if the string parses cleanly into at least zero moves. */
export function isValidAlgorithm(input: string): boolean {
  try {
    parseAlgorithm(input)
    return true
  } catch {
    return false
  }
}

export function invertMove(move: Move): Move {
  return {
    face: move.face,
    turns: move.turns === 2 ? 2 : move.turns === 1 ? 3 : 1,
  }
}

/** Inverse algorithm: undoing these moves returns the cube to its prior state. */
export function invertAlgorithm(moves: readonly Move[]): Move[] {
  return moves
    .slice()
    .reverse()
    .map((m) => invertMove(m))
}

/**
 * Reduce redundant moves without changing the net effect:
 * - merge consecutive turns of the same face (R R → R2, R R' → cancel)
 * - cancel matching turns separated by one turn of the opposite face
 *   (R L R' → L) since opposite faces commute
 */
export function optimizeMoves(moves: readonly Move[]): Move[] {
  // Pass 1: merge consecutive same-face turns.
  const merged: Move[] = []
  for (const m of moves) {
    const last = merged[merged.length - 1]
    if (last && last.face === m.face) {
      const total = (last.turns + m.turns) % 4
      merged.pop()
      if (total !== 0) merged.push({ face: m.face, turns: total as 1 | 2 | 3 })
    } else {
      merged.push({ ...m })
    }
  }
  // Pass 2: cancel across a commuting opposite-face turn (repeat to fixpoint).
  let changed = true
  let current = merged
  while (changed) {
    changed = false
    const out: Move[] = []
    let i = 0
    while (i < current.length) {
      const a = current[i] as Move
      const b = current[i + 1] as Move | undefined
      const c = current[i + 2] as Move | undefined
      if (b && c && a.face === c.face && FACE_AXIS[a.face] === FACE_AXIS[b.face] && a.face !== b.face) {
        const total = (a.turns + c.turns) % 4
        out.push(b)
        if (total !== 0) out.push({ face: a.face, turns: total as 1 | 2 | 3 })
        i += 3
        changed = true
      } else {
        out.push(a)
        i += 1
      }
    }
    current = out
  }
  return current
}

export interface MoveMetrics {
  /** Half-turn metric: every move counts 1. */
  htm: number
  /** Quarter-turn metric: double turns count 2. */
  qtm: number
  /** Number of single quarter turns (R, R'). */
  quarterTurns: number
  /** Number of double turns (R2). */
  doubleTurns: number
  /** Number of clockwise turns. */
  clockwise: number
  /** Number of counter-clockwise (prime) turns. */
  counterClockwise: number
}

export function moveMetrics(moves: readonly Move[]): MoveMetrics {
  let qtm = 0
  let quarterTurns = 0
  let doubleTurns = 0
  let clockwise = 0
  let counterClockwise = 0
  for (const m of moves) {
    if (m.turns === 2) {
      qtm += 2
      doubleTurns += 1
    } else {
      qtm += 1
      quarterTurns += 1
      if (m.turns === 1) clockwise += 1
      else counterClockwise += 1
    }
  }
  return { htm: moves.length, qtm, quarterTurns, doubleTurns, clockwise, counterClockwise }
}
