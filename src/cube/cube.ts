/**
 * CubeState: accurate 3×3×3 facelet model with move application,
 * cubie conversion (for validation) and solver interchange.
 */
import { applyMoveToFacelets } from './moves'
import { formatAlgorithm, invertAlgorithm, optimizeMoves, parseAlgorithm } from './notation'
import type { ColorId, Face, Move } from './types'
import { CORNER_FACELETS, EDGE_FACELETS, FACES, INDEX_TO_FACE } from './types'

export interface CornerCubie {
  /** Which corner piece (0..7, URF=0 ... DRB=7). -1 if unidentifiable. */
  cubie: number
  /** Twist 0..2. */
  orientation: number
  /** Position index 0..7. */
  position: number
}

export interface EdgeCubie {
  /** Which edge piece (0..11). -1 if unidentifiable. */
  cubie: number
  /** Flip 0..1. */
  orientation: number
  /** Position index 0..11. */
  position: number
}

export interface CubieState {
  corners: CornerCubie[]
  edges: EdgeCubie[]
}

/**
 * Map a color id to the face it belongs to, using the cube's own centers.
 * Returns null when centers are duplicated (cube has no valid color scheme).
 */
export function colorToFaceMap(facelets: readonly number[]): number[] | null {
  const map = new Array<number>(6).fill(-1)
  for (let f = 0; f < 6; f++) {
    const color = facelets[f * 9 + 4] as number
    if (color < 0 || color > 5) return null
    if (map[color] !== -1) return null // duplicate center color
    map[color] = f
  }
  return map
}

/**
 * Convert facelets to corner/edge cubies with orientations.
 * Returns null when the color scheme itself is invalid (bad centers).
 */
export function faceletsToCubies(facelets: readonly number[]): CubieState | null {
  const map = colorToFaceMap(facelets)
  if (!map) return null
  // Face identity of each cubie in solved state, as sorted color triples/pairs.
  // Corner cubie j (solved position j) carries the faces of position j.
  const cornerFaceOf = (pos: number): [number, number, number] => {
    const idx = CORNER_FACELETS[pos] as readonly [number, number, number]
    return [Math.floor(idx[0] / 9), Math.floor(idx[1] / 9), Math.floor(idx[2] / 9)]
  }
  const edgeFaceOf = (pos: number): [number, number] => {
    const idx = EDGE_FACELETS[pos] as readonly [number, number]
    return [Math.floor(idx[0] / 9), Math.floor(idx[1] / 9)]
  }

  const corners: CornerCubie[] = []
  for (let pos = 0; pos < 8; pos++) {
    const idx = CORNER_FACELETS[pos] as readonly [number, number, number]
    const cols = [map[facelets[idx[0]] as number], map[facelets[idx[1]] as number], map[facelets[idx[2]] as number]]
    // Orientation: twist of the U/D reference facelet (index 0 of the triple).
    let orientation = 0
    let cubie = -1
    for (let j = 0; j < 8; j++) {
      const ref = cornerFaceOf(j)
      for (let twist = 0; twist < 3; twist++) {
        if (
          cols[0] === ref[twist % 3] &&
          cols[1] === ref[(twist + 1) % 3] &&
          cols[2] === ref[(twist + 2) % 3]
        ) {
          cubie = j
          orientation = (3 - twist) % 3
          break
        }
      }
      if (cubie !== -1) break
    }
    corners.push({ cubie, orientation, position: pos })
  }

  const edges: EdgeCubie[] = []
  for (let pos = 0; pos < 12; pos++) {
    const idx = EDGE_FACELETS[pos] as readonly [number, number]
    const cols = [map[facelets[idx[0]] as number], map[facelets[idx[1]] as number]]
    let orientation = 0
    let cubie = -1
    for (let j = 0; j < 12; j++) {
      const ref = edgeFaceOf(j)
      if (cols[0] === ref[0] && cols[1] === ref[1]) {
        cubie = j
        orientation = 0
        break
      }
      if (cols[0] === ref[1] && cols[1] === ref[0]) {
        cubie = j
        orientation = 1
        break
      }
    }
    edges.push({ cubie, orientation, position: pos })
  }

  return { corners, edges }
}

export class CubeState {
  readonly facelets: number[]

  constructor(facelets?: readonly number[]) {
    if (facelets) {
      if (facelets.length !== 54) throw new Error(`CubeState needs 54 facelets, got ${facelets.length}`)
      this.facelets = facelets.slice()
    } else {
      this.facelets = []
      for (let f = 0; f < 6; f++) {
        for (let k = 0; k < 9; k++) this.facelets.push(f)
      }
    }
  }

  static solved(): CubeState {
    return new CubeState()
  }

  clone(): CubeState {
    return new CubeState(this.facelets)
  }

  equals(other: CubeState): boolean {
    for (let i = 0; i < 54; i++) {
      if (this.facelets[i] !== other.facelets[i]) return false
    }
    return true
  }

  /** A cube is solved when every face shows a single color. */
  isSolved(): boolean {
    for (let f = 0; f < 6; f++) {
      const center = this.facelets[f * 9 + 4]
      for (let k = 0; k < 9; k++) {
        if (this.facelets[f * 9 + k] !== center) return false
      }
    }
    return true
  }

  /** Mutating single-move application (returns this for chaining). */
  doMove(move: Move): this {
    const next = applyMoveToFacelets(this.facelets, move)
    for (let i = 0; i < 54; i++) this.facelets[i] = next[i] as number
    return this
  }

  doMoves(moves: readonly Move[]): this {
    for (const m of moves) this.doMove(m)
    return this
  }

  doAlgorithm(algorithm: string): this {
    return this.doMoves(parseAlgorithm(algorithm))
  }

  /** Immutable variants. */
  afterMove(move: Move): CubeState {
    return new CubeState(applyMoveToFacelets(this.facelets, move))
  }

  afterMoves(moves: readonly Move[]): CubeState {
    return this.clone().doMoves(moves)
  }

  afterAlgorithm(algorithm: string): CubeState {
    return this.afterMoves(parseAlgorithm(algorithm))
  }

  toCubies(): CubieState | null {
    return faceletsToCubies(this.facelets)
  }

  /**
   * 54-character facelet string for the Kociemba solver (URFDLB letters in
   * U,R,F,D,L,B face order). The solver derives the color scheme from the
   * centers itself, so this works for any center arrangement.
   */
  toFaceletString(): string {
    let out = ''
    for (let i = 0; i < 54; i++) {
      const color = this.facelets[i] as number
      out += INDEX_TO_FACE[color] ?? '?'
    }
    return out
  }

  static fromFaceletString(input: string): CubeState {
    const text = input.trim().toUpperCase()
    if (text.length !== 54) {
      throw new Error(`Facelet string must be 54 characters, got ${text.length}`)
    }
    const facelets: number[] = []
    for (const ch of text) {
      const idx = FACES.indexOf(ch as Face)
      if (idx === -1) throw new Error(`Invalid facelet character "${ch}" — expected U, R, F, D, L or B`)
      facelets.push(idx)
    }
    return new CubeState(facelets)
  }

  /** Serialize for storage / worker transfer. */
  toJSON(): number[] {
    return this.facelets.slice()
  }

  static fromJSON(data: readonly number[]): CubeState {
    return new CubeState(data)
  }
}

/** Convenience: apply an algorithm string to a facelet array, returning a new array. */
export function applyAlgorithmToFacelets(facelets: readonly number[], algorithm: string): number[] {
  return new CubeState(facelets).doAlgorithm(algorithm).facelets
}

export { formatAlgorithm, invertAlgorithm, optimizeMoves, parseAlgorithm }
export type { ColorId, Face, Move }
