/**
 * Random-state generation: builds uniformly random *valid* cube states at the
 * cubie level (random permutation + orientation with parity matched), then
 * converts to facelets. Used for random-state scrambles and solver tests.
 */
import type { Rng } from './scramble'
import { CORNER_FACELETS, EDGE_FACELETS } from './types'

export interface PlacedCorner {
  cubie: number
  orientation: number
}

export interface PlacedEdge {
  cubie: number
  orientation: number
}

function shuffledRange(n: number, rng: Rng): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i] as number
    arr[i] = arr[j] as number
    arr[j] = tmp
  }
  return arr
}

function parityOf(permutation: readonly number[]): 0 | 1 {
  let inversions = 0
  for (let i = 0; i < permutation.length; i++) {
    for (let j = i + 1; j < permutation.length; j++) {
      if ((permutation[i] as number) > (permutation[j] as number)) inversions++
    }
  }
  return (inversions % 2) as 0 | 1
}

/** Random valid cubie placement (parity-matched, orientation sums legal). */
export function randomCubieState(rng: Rng = Math.random): {
  corners: PlacedCorner[]
  edges: PlacedEdge[]
} {
  const cornerPerm = shuffledRange(8, rng)
  const edgePerm = shuffledRange(12, rng)
  // Match permutation parity by swapping two edges if needed.
  if (parityOf(cornerPerm) !== parityOf(edgePerm)) {
    const tmp = edgePerm[0] as number
    edgePerm[0] = edgePerm[1] as number
    edgePerm[1] = tmp
  }
  const corners: PlacedCorner[] = cornerPerm.map((cubie, position) => {
    void position
    return { cubie, orientation: 0 }
  })
  let twistSum = 0
  for (let i = 0; i < 7; i++) {
    const o = Math.floor(rng() * 3)
    ;(corners[i] as PlacedCorner).orientation = o
    twistSum += o
  }
  ;(corners[7] as PlacedCorner).orientation = (3 - (twistSum % 3)) % 3

  const edges: PlacedEdge[] = edgePerm.map((cubie) => ({ cubie, orientation: 0 }))
  let flipSum = 0
  for (let i = 0; i < 11; i++) {
    const o = rng() < 0.5 ? 0 : 1
    ;(edges[i] as PlacedEdge).orientation = o
    flipSum += o
  }
  ;(edges[11] as PlacedEdge).orientation = flipSum % 2

  return { corners, edges }
}

/**
 * Convert a cubie placement back to facelets. Orientation conventions mirror
 * faceletsToCubies exactly (see cube.ts), verified by roundtrip tests.
 */
export function cubiesToFacelets(
  corners: readonly PlacedCorner[],
  edges: readonly PlacedEdge[],
): number[] {
  const facelets = new Array<number>(54).fill(-1)
  // Centers.
  for (let f = 0; f < 6; f++) facelets[f * 9 + 4] = f

  const cornerHomeFace = (cubie: number, k: number): number =>
    Math.floor((CORNER_FACELETS[cubie] as readonly number[])[k] as number / 9)
  const edgeHomeFace = (cubie: number, k: number): number =>
    Math.floor((EDGE_FACELETS[cubie] as readonly number[])[k] as number / 9)

  for (let pos = 0; pos < 8; pos++) {
    const { cubie, orientation } = corners[pos] as PlacedCorner
    const twist = (3 - (orientation % 3)) % 3
    const slots = CORNER_FACELETS[pos] as readonly number[]
    for (let n = 0; n < 3; n++) {
      facelets[slots[n] as number] = cornerHomeFace(cubie, (twist + n) % 3)
    }
  }
  for (let pos = 0; pos < 12; pos++) {
    const { cubie, orientation } = edges[pos] as PlacedEdge
    const slots = EDGE_FACELETS[pos] as readonly number[]
    facelets[slots[0] as number] = edgeHomeFace(cubie, orientation % 2)
    facelets[slots[1] as number] = edgeHomeFace(cubie, 1 - (orientation % 2))
  }
  return facelets
}

/** Uniformly random valid cube state as facelets. */
export function randomFacelets(rng: Rng = Math.random): number[] {
  const { corners, edges } = randomCubieState(rng)
  return cubiesToFacelets(corners, edges)
}
