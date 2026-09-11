/**
 * Core cube types.
 *
 * Facelet indexing follows the standard Kociemba layout (verified against the
 * min2phase solver tables):
 *
 *   Faces: U = 0..8, R = 9..17, F = 18..26, D = 27..35, L = 36..44, B = 45..53
 *   Within a face, stickers are row-major 0..8 as seen facing that face:
 *     U viewed from above with B at the top, D viewed from below with F at top,
 *     side faces viewed directly with U at the top.
 *
 * Colors are stored as ids 0..5 matching faces U,R,F,D,L,B:
 *   0 = white (U), 1 = red (R), 2 = green (F),
 *   3 = yellow (D), 4 = orange (L), 5 = blue (B)
 * This is the standard Western color scheme.
 */

/** The six faces in Kociemba order. */
export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

export const FACES: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

/** Color id 0..5 (U,R,F,D,L,B). */
export type ColorId = 0 | 1 | 2 | 3 | 4 | 5

export const COLOR_IDS: readonly ColorId[] = [0, 1, 2, 3, 4, 5]

/** A single face turn. turns: 1 = clockwise 90°, 2 = 180°, 3 = counter-clockwise. */
export interface Move {
  readonly face: Face
  readonly turns: 1 | 2 | 3
}

export const FACE_TO_INDEX: Record<Face, number> = {
  U: 0,
  R: 1,
  F: 2,
  D: 3,
  L: 4,
  B: 5,
}

export const INDEX_TO_FACE: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

export const OPPOSITE_FACE: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  R: 'L',
  L: 'R',
  F: 'B',
  B: 'F',
}

/** Axis id: U/D = 0, R/L = 1, F/B = 2. */
export const FACE_AXIS: Record<Face, 0 | 1 | 2> = {
  U: 0,
  D: 0,
  R: 1,
  L: 1,
  F: 2,
  B: 2,
}

/** Human color names for beginner-friendly messages. */
export const COLOR_NAMES: Record<ColorId, string> = {
  0: 'white',
  1: 'red',
  2: 'green',
  3: 'yellow',
  4: 'orange',
  5: 'blue',
}

/** Face names for beginner-friendly messages. */
export const FACE_NAMES: Record<Face, string> = {
  U: 'top',
  R: 'right',
  F: 'front',
  D: 'bottom',
  L: 'left',
  B: 'back',
}

/** Corner positions in Kociemba order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB. */
export const CORNER_NAMES = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'] as const

/** Facelet indices for each corner (twist reference: U/D facelet first). */
export const CORNER_FACELETS: readonly (readonly [number, number, number])[] = [
  [8, 9, 20], // URF
  [6, 18, 38], // UFL
  [0, 36, 47], // ULB
  [2, 45, 11], // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
]

/** Edge positions in Kociemba order: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR. */
export const EDGE_NAMES = [
  'UR',
  'UF',
  'UL',
  'UB',
  'DR',
  'DF',
  'DL',
  'DB',
  'FR',
  'FL',
  'BL',
  'BR',
] as const

/** Facelet indices for each edge (flip reference: U/D/F/B facelet first). */
export const EDGE_FACELETS: readonly (readonly [number, number])[] = [
  [5, 10], // UR
  [7, 19], // UF
  [3, 37], // UL
  [1, 46], // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
]

export function isFace(value: string): value is Face {
  return value === 'U' || value === 'R' || value === 'F' || value === 'D' || value === 'L' || value === 'B'
}

export function faceOfFacelet(index: number): Face {
  return INDEX_TO_FACE[Math.floor(index / 9)] ?? 'U'
}
