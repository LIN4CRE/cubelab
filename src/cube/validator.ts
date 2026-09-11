/**
 * Cube validation: detects sticker-count mistakes and physically impossible
 * configurations (bad centers, duplicated pieces, twisted corners, flipped
 * edges, parity errors) with beginner-friendly explanations and the exact
 * facelets to highlight in the UI.
 */
import { colorToFaceMap, faceletsToCubies } from './cube'
import type { ColorId } from './types'
import { COLOR_IDS, COLOR_NAMES, CORNER_FACELETS, EDGE_FACELETS } from './types'

export type ValidationCode =
  | 'ok'
  | 'bad-length'
  | 'bad-color'
  | 'duplicate-center'
  | 'color-count'
  | 'duplicate-corner'
  | 'duplicate-edge'
  | 'unknown-corner'
  | 'unknown-edge'
  | 'twisted-corner'
  | 'flipped-edge'
  | 'parity'

export interface ValidationIssue {
  code: ValidationCode
  /** Short technical title. */
  title: string
  /** Beginner-friendly explanation of what is wrong and how to fix it. */
  message: string
  /** Facelet indices to highlight. */
  facelets: number[]
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

function parityOf(permutation: readonly number[]): 0 | 1 {
  // Parity via inversion count.
  let inversions = 0
  for (let i = 0; i < permutation.length; i++) {
    for (let j = i + 1; j < permutation.length; j++) {
      if ((permutation[i] as number) > (permutation[j] as number)) inversions++
    }
  }
  return (inversions % 2) as 0 | 1
}

export function validateCube(facelets: readonly number[]): ValidationResult {
  const issues: ValidationIssue[] = []
  const fail = (issue: ValidationIssue): ValidationResult => {
    issues.push(issue)
    return { valid: false, issues }
  }

  if (facelets.length !== 54) {
    return fail({
      code: 'bad-length',
      title: 'Incomplete cube',
      message: `This cube only has ${facelets.length} stickers entered — a real cube has 54 (9 on each of the 6 faces). Fill in every sticker and try again.`,
      facelets: [],
    })
  }
  for (let i = 0; i < 54; i++) {
    const c = facelets[i] as number
    if (!Number.isInteger(c) || c < 0 || c > 5) {
      return fail({
        code: 'bad-color',
        title: 'Unknown sticker color',
        message: 'One sticker has a color the app does not recognize. Re-enter that sticker with one of the six cube colors.',
        facelets: [i],
      })
    }
  }

  // 1. Centers must all be different — they define the color scheme.
  const centers = [4, 13, 22, 31, 40, 49]
  const seen = new Map<number, number>()
  for (const c of centers) {
    const color = facelets[c] as number
    if (seen.has(color)) {
      return fail({
        code: 'duplicate-center',
        title: 'Two centers share a color',
        message: `Two face centers are both ${COLOR_NAMES[color as ColorId]}. On a real cube every center has its own color — the centers never move, so check which face you entered wrong.`,
        facelets: [seen.get(color) as number, c],
      })
    }
    seen.set(color, c)
  }

  // 2. Exactly 9 stickers of each color.
  const counts = [0, 0, 0, 0, 0, 0]
  for (const c of facelets) counts[c as number]++
  const bad = COLOR_IDS.filter((c) => counts[c] !== 9)
  if (bad.length > 0) {
    const parts = bad.map(
      (c) => `${COLOR_NAMES[c]} appears ${counts[c]} time${counts[c] === 1 ? '' : 's'} (needs exactly 9)`,
    )
    // Highlight stickers of the most-offending color that sit outside their own face.
    const worst = bad.reduce((a, b) => (Math.abs(counts[a] - 9) >= Math.abs(counts[b] - 9) ? a : b))
    const map = colorToFaceMap(facelets)
    const highlight: number[] = []
    for (let i = 0; i < 54; i++) {
      if (facelets[i] !== worst) continue
      const homeFace = map ? map[worst] : worst
      if (Math.floor(i / 9) !== homeFace) highlight.push(i)
    }
    return fail({
      code: 'color-count',
      title: 'Wrong number of stickers',
      message: `Sticker count is off: ${parts.join('; ')}. Every color appears exactly 9 times on a real cube. The highlighted ${COLOR_NAMES[worst]} sticker${highlight.length === 1 ? ' is' : 's are'} the most likely mistake${highlight.length === 1 ? '' : 's'} — compare them with your physical cube.`,
      facelets: highlight.slice(0, 9),
    })
  }

  // 3. Cubie-level checks.
  const cubies = faceletsToCubies(facelets)
  if (!cubies) {
    return fail({
      code: 'duplicate-center',
      title: 'Invalid color scheme',
      message: 'The centers do not form a valid color scheme. Each of the six centers must be a different color.',
      facelets: centers,
    })
  }

  // 3a. Every corner/edge piece must be a real piece (colors must match a physical cubie).
  const badCorners = cubies.corners.filter((c) => c.cubie === -1).map((c) => c.position)
  if (badCorners.length > 0) {
    const faceletList = badCorners.flatMap((p) => [...(CORNER_FACELETS[p] as readonly number[])])
    return fail({
      code: 'unknown-corner',
      title: 'Impossible corner',
      message:
        'A highlighted corner combines three colors that never meet on a real cube. Corners are fixed pieces — find that corner on your physical cube and copy its three stickers exactly.',
      facelets: faceletList,
    })
  }
  const badEdges = cubies.edges.filter((e) => e.cubie === -1).map((e) => e.position)
  if (badEdges.length > 0) {
    const faceletList = badEdges.flatMap((p) => [...(EDGE_FACELETS[p] as readonly number[])])
    return fail({
      code: 'unknown-edge',
      title: 'Impossible edge',
      message:
        'A highlighted edge combines two colors that never sit together on a real cube. Check that edge on your physical cube and copy its two stickers exactly.',
      facelets: faceletList,
    })
  }

  // 3b. No duplicated pieces.
  const cornerSeen = new Map<number, number>()
  for (const c of cubies.corners) {
    if (cornerSeen.has(c.cubie)) {
      const other = cornerSeen.get(c.cubie) as number
      return fail({
        code: 'duplicate-corner',
        title: 'Same corner twice',
        message:
          'Two highlighted corners show the same three stickers. Every corner piece is unique — one of them is entered wrong, so compare both with your physical cube.',
        facelets: [
          ...(CORNER_FACELETS[c.position] as readonly number[]),
          ...(CORNER_FACELETS[other] as readonly number[]),
        ],
      })
    }
    cornerSeen.set(c.cubie, c.position)
  }
  const edgeSeen = new Map<number, number>()
  for (const e of cubies.edges) {
    if (edgeSeen.has(e.cubie)) {
      const other = edgeSeen.get(e.cubie) as number
      return fail({
        code: 'duplicate-edge',
        title: 'Same edge twice',
        message:
          'Two highlighted edges show the same two stickers. Every edge piece is unique — one of them is entered wrong, so compare both with your physical cube.',
        facelets: [
          ...(EDGE_FACELETS[e.position] as readonly number[]),
          ...(EDGE_FACELETS[other] as readonly number[]),
        ],
      })
    }
    edgeSeen.set(e.cubie, e.position)
  }

  // 3c. Corner twist must sum to a multiple of 3.
  const twistSum = cubies.corners.reduce((s, c) => s + c.orientation, 0)
  if (twistSum % 3 !== 0) {
    const twisted = cubies.corners.filter((c) => c.orientation !== 0)
    const faceletList =
      twisted.length > 0 && twisted.length <= 4
        ? twisted.flatMap((c) => [...(CORNER_FACELETS[c.position] as readonly number[])])
        : cubies.corners.flatMap((c) => [...(CORNER_FACELETS[c.position] as readonly number[])])
    return fail({
      code: 'twisted-corner',
      title: 'Twisted corner',
      message:
        'This cube has a twisted corner — the corner orientations cannot occur on a real cube (someone may have rotated a corner piece by hand, or a sticker was entered wrong). Check the highlighted corners: a single corner can never be twisted on its own.',
      facelets: faceletList,
    })
  }

  // 3d. Edge flip parity must be even.
  const flipSum = cubies.edges.reduce((s, e) => s + e.orientation, 0)
  if (flipSum % 2 !== 0) {
    const flipped = cubies.edges.filter((e) => e.orientation !== 0)
    const faceletList =
      flipped.length > 0 && flipped.length <= 4
        ? flipped.flatMap((e) => [...(EDGE_FACELETS[e.position] as readonly number[])])
        : cubies.edges.flatMap((e) => [...(EDGE_FACELETS[e.position] as readonly number[])])
    return fail({
      code: 'flipped-edge',
      title: 'Flipped edge',
      message:
        'This cube has a flipped edge — the edge orientations cannot occur on a real cube. A single edge can never be flipped on its own, so check the highlighted edges against your physical cube.',
      facelets: faceletList,
    })
  }

  // 3e. Corner parity must equal edge parity.
  const cornerPerm = cubies.corners.map((c) => c.cubie)
  const edgePerm = cubies.edges.map((e) => e.cubie)
  if (parityOf(cornerPerm) !== parityOf(edgePerm)) {
    const misplacedCorners = cubies.corners.filter((c) => c.cubie !== c.position)
    const misplacedEdges = cubies.edges.filter((e) => e.cubie !== e.position)
    const faceletList = [
      ...misplacedCorners.flatMap((c) => [...(CORNER_FACELETS[c.position] as readonly number[])]),
      ...misplacedEdges.flatMap((e) => [...(EDGE_FACELETS[e.position] as readonly number[])]),
    ].slice(0, 24)
    return fail({
      code: 'parity',
      title: 'Impossible swap (parity)',
      message:
        'Two pieces appear to be swapped — for example a single pair of edges or corners exchanged. On a real cube pieces can only be swapped in pairs, never a lone pair by itself. Check the highlighted pieces: most likely two similar stickers were mixed up.',
      facelets: faceletList,
    })
  }

  return { valid: true, issues: [] }
}

/** Convenience: true when the cube can exist (and therefore be solved). */
export function isSolvable(facelets: readonly number[]): boolean {
  return validateCube(facelets).valid
}
