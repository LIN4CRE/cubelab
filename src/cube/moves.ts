/**
 * Face-turn permutation tables.
 *
 * Each move is a permutation `perm` of the 54 facelets where
 *   newFacelets[i] = oldFacelets[perm[i]]
 *
 * Base tables below are clockwise quarter turns as seen facing the face
 * (standard Singmaster notation). Double and inverse turns are derived by
 * composing the base permutation with itself. Every table is verified by the
 * test-suite: 4x quarter turn = identity, and a cross-check of hundreds of
 * random scrambles against the independent min2phase cubie implementation.
 */
import type { Face, Move } from './types'
import { FACES } from './types'

/** [destIndices, srcIndices] pairs: dest[k] takes the sticker from src[k]. */
type AdjacentCycle = readonly (readonly [readonly number[], readonly number[]])[]

const ADJACENT: Record<Face, AdjacentCycle> = {
  U: [
    [
      [18, 19, 20],
      [9, 10, 11],
    ],
    [
      [9, 10, 11],
      [45, 46, 47],
    ],
    [
      [45, 46, 47],
      [36, 37, 38],
    ],
    [
      [36, 37, 38],
      [18, 19, 20],
    ],
  ],
  R: [
    [
      [2, 5, 8],
      [20, 23, 26],
    ],
    [
      [20, 23, 26],
      [29, 32, 35],
    ],
    [
      [29, 32, 35],
      [51, 48, 45],
    ],
    [
      [45, 48, 51],
      [8, 5, 2],
    ],
  ],
  F: [
    [
      [6, 7, 8],
      [44, 41, 38],
    ],
    [
      [9, 12, 15],
      [6, 7, 8],
    ],
    [
      [27, 28, 29],
      [15, 12, 9],
    ],
    [
      [38, 41, 44],
      [27, 28, 29],
    ],
  ],
  D: [
    [
      [24, 25, 26],
      [42, 43, 44],
    ],
    [
      [15, 16, 17],
      [24, 25, 26],
    ],
    [
      [51, 52, 53],
      [15, 16, 17],
    ],
    [
      [42, 43, 44],
      [51, 52, 53],
    ],
  ],
  L: [
    [
      [18, 21, 24],
      [0, 3, 6],
    ],
    [
      [27, 30, 33],
      [18, 21, 24],
    ],
    [
      [47, 50, 53],
      [33, 30, 27],
    ],
    [
      [0, 3, 6],
      [53, 50, 47],
    ],
  ],
  B: [
    [
      [0, 1, 2],
      [11, 14, 17],
    ],
    [
      [11, 14, 17],
      [35, 34, 33],
    ],
    [
      [33, 34, 35],
      [36, 39, 42],
    ],
    [
      [36, 39, 42],
      [2, 1, 0],
    ],
  ],
}

/** Clockwise rotation of a face's own 9 stickers (offsets within the face). */
const FACE_CW: ReadonlyArray<readonly [number, number]> = [
  [0, 6],
  [1, 3],
  [2, 0],
  [3, 7],
  [5, 1],
  [6, 8],
  [7, 5],
  [8, 2],
]

function identityPerm(): number[] {
  return Array.from({ length: 54 }, (_, i) => i)
}

function composePerm(a: readonly number[], b: readonly number[]): number[] {
  // Apply b first, then a: result[i] = b[a[i]]
  const out = new Array<number>(54)
  for (let i = 0; i < 54; i++) out[i] = b[a[i] as number] as number
  return out
}

function buildClockwisePerm(face: Face): number[] {
  const perm = identityPerm()
  const faceIndex = FACES.indexOf(face)
  const base = faceIndex * 9
  for (const [dest, src] of FACE_CW) {
    perm[base + dest] = base + src
  }
  for (const [dest, src] of ADJACENT[face]) {
    for (let k = 0; k < dest.length; k++) {
      perm[dest[k] as number] = src[k] as number
    }
  }
  return perm
}

/** Permutation for every (face, turns) combination. Key: "U", "U2", "U'", ... */
function buildAllPerms(): Record<string, readonly number[]> {
  const table: Record<string, readonly number[]> = {}
  for (const face of FACES) {
    const cw = buildClockwisePerm(face)
    const twice = composePerm(cw, cw)
    const thrice = composePerm(twice, cw)
    table[face] = Object.freeze(cw)
    table[`${face}2`] = Object.freeze(twice)
    table[`${face}'`] = Object.freeze(thrice)
  }
  return table
}

export const MOVE_PERMS: Record<string, readonly number[]> = buildAllPerms()

export function moveKey(move: Move): string {
  return move.turns === 1 ? move.face : move.turns === 2 ? `${move.face}2` : `${move.face}'`
}

export function permForMove(move: Move): readonly number[] {
  const perm = MOVE_PERMS[moveKey(move)]
  if (!perm) throw new Error(`Unknown move: ${moveKey(move)}`)
  return perm
}

/** Returns a new facelet array with the move applied (input is not mutated). */
export function applyPerm(facelets: readonly number[], perm: readonly number[]): number[] {
  const out = new Array<number>(54)
  for (let i = 0; i < 54; i++) out[i] = facelets[perm[i] as number] as number
  return out
}

export function applyMoveToFacelets(facelets: readonly number[], move: Move): number[] {
  return applyPerm(facelets, permForMove(move))
}

/**
 * Facelet indices whose sticker changes when the move is applied.
 * Used for move highlighting in the UI.
 */
export function affectedFacelets(move: Move): number[] {
  const perm = permForMove(move)
  const out: number[] = []
  for (let i = 0; i < 54; i++) {
    if (perm[i] !== i) out.push(i)
  }
  return out
}

/** The 9 facelet indices of the face being turned (for highlighting). */
export function faceFacelets(face: Face): number[] {
  const base = FACES.indexOf(face) * 9
  return Array.from({ length: 9 }, (_, k) => base + k)
}
