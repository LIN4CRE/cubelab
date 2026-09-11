/**
 * Beginner-method solver: solves any valid cube by following the 7-step
 * taught method (BEGINNER_METHOD), emitting the exact moves plus a
 * beginner-friendly note for every decision. Where the student re-grips the
 * whole cube, the solver uses the equivalent U-sandwich (proven in
 * library.test.ts). Back slots use solver-internal mirrors (students rotate
 * the cube instead); all mirrors are pinned by the end-to-end test.
 *
 * The solver is fully colour-dynamic: it reads the cube's own centres and
 * solves D-colour-down / U-colour-up, so it works for any valid colour
 * scheme. solveBeginner virtually re-grips (y2x2) to the standard beginner
 * holding (white down, green front) before solving.
 *
 * New code must keep this solver green: it is the executable proof that the
 * taught method is complete.
 */
import { COLOR_NAMES, CORNER_FACELETS, CubeState, parseAlgorithm } from '../cube/index'
import type { CubieState } from '../cube/index'
import { rotateX2, rotateY2 } from '../cube/rotations'
import type { Move } from '../cube/types'
import { getAlgorithm } from '../algorithms/index'
import { SolveError } from './types'
import { solveCross } from './crossTable'

export interface BeginnerStageSolution {
  step: number
  title: string
  moves: Move[]
  notes: string[]
}

export interface BeginnerSolution {
  steps: BeginnerStageSolution[]
  totalMoves: Move[]
  /** How to hold the cube for the move labels to match (e.g. white bottom, green front). */
  holding: string
}

const RUR = getAlgorithm('ins-FR-right').moves // R U R'
const FUF = getAlgorithm('ins-FR-front').moves // F' U' F
const LUL = getAlgorithm('ins-FL-left').moves // L' U' L
const FUF2 = getAlgorithm('ins-FL-front').moves // F U F'
const RIGHT = getAlgorithm('ins-middle-right').moves
const LEFT = getAlgorithm('ins-middle-left').moves
const L_TRIG = getAlgorithm('oll-edge-L').moves
const LINE_TRIG = getAlgorithm('oll-edge-line').moves
const SUNE = getAlgorithm('oll-sune').moves
const ANTISUNE = getAlgorithm('oll-antisune').moves
const PI = getAlgorithm('oll-pi').moves
const OLL_U = getAlgorithm('oll-U').moves
const OLL_H = getAlgorithm('oll-H').moves
const AA = getAlgorithm('pll-Aa').moves
const T_PERM = getAlgorithm('pll-T').moves
const UA = getAlgorithm('pll-Ua').moves
const PLL_H = getAlgorithm('pll-H').moves
const PLL_Z = getAlgorithm('pll-Z').moves

interface Scheme {
  down: number
  up: number
  front: number
  right: number
  left: number
  back: number
  downName: string
  upName: string
}

function readScheme(facelets: readonly number[]): Scheme {
  const down = facelets[31] as number
  const up = facelets[4] as number
  const front = facelets[22] as number
  const right = facelets[13] as number
  const left = facelets[40] as number
  const back = facelets[49] as number
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  return {
    down, up, front, right, left, back,
    downName: cap(COLOR_NAMES[down as 0] ?? '?'),
    upName: cap(COLOR_NAMES[up as 0] ?? '?'),
  }
}

// D-colour corner slots: relative cubie S+4 solves into D position S+4 (home).
// Popouts/inserts are positional; side stickers hold the D colour when twisted.
const CORNER_SLOTS = [
  {
    cubie: 4, up: 0, down: 4, name: 'front-right', popout: RUR,
    sides: [
      { sticker: 1 as const, alg: RUR, label: 'right' },
      { sticker: 2 as const, alg: FUF, label: 'front' },
    ],
  },
  {
    cubie: 5, up: 1, down: 5, name: 'front-left', popout: LUL,
    sides: [
      { sticker: 2 as const, alg: LUL, label: 'left' },
      { sticker: 1 as const, alg: FUF2, label: 'front' },
    ],
  },
  {
    cubie: 6, up: 2, down: 6, name: 'back-left', popout: "B' U' B",
    sides: [
      { sticker: 1 as const, alg: 'L U L\'', label: 'left' },
      { sticker: 2 as const, alg: "B' U' B", label: 'back' },
    ],
  },
  {
    cubie: 7, up: 3, down: 7, name: 'back-right', popout: "R' U' R",
    sides: [
      { sticker: 2 as const, alg: "R' U' R", label: 'right' },
      { sticker: 1 as const, alg: "B U B'", label: 'back' },
    ],
  },
] as const

const MIDDLE_SLOTS = [
  { target: 8, slot: 8, name: 'front-right', popout: RIGHT },
  { target: 9, slot: 9, name: 'front-left', popout: LEFT },
  { target: 11, slot: 11, name: 'back-right', popout: "U' R' U R U B U' B'" },
  { target: 10, slot: 10, name: 'back-left', popout: "U L U' L' U' B' U B" },
] as const

class Builder {
  state: CubeState
  steps: BeginnerStageSolution[] = []
  readonly scheme: Scheme
  private current: BeginnerStageSolution | null = null

  constructor(facelets: readonly number[]) {
    this.state = new CubeState(facelets)
    this.scheme = readScheme(facelets) // centres never move under face turns
  }

  cubies(): CubieState {
    const cub = this.state.toCubies()
    if (!cub) throw new SolveError('unreadable', 'Cannot read cube state (bad centres?)')
    return cub
  }

  beginStep(step: number, title: string): void {
    this.current = { step, title, moves: [], notes: [] }
    this.steps.push(this.current)
  }

  /** Apply an algorithm string to the live state, recording moves + note. */
  do(alg: string, note: string): void {
    if (!this.current) throw new Error('beginStep first')
    const moves = parseAlgorithm(alg)
    this.state.doMoves(moves)
    this.current.moves.push(...moves)
    this.current.notes.push(note)
  }

  note(text: string): void {
    if (!this.current) throw new Error('beginStep first')
    this.current.notes.push(text)
  }
}

/** U-turns (as a string) mapping U-position p onto U-position q. */
function uAlign(p: number, q: number): string {
  const k = (((q - p) % 4) + 4) % 4
  return 'U '.repeat(k).trim()
}

function sandwich(alg: string, a: number): string {
  const pre = 'U '.repeat(a).trim()
  const post = "U' ".repeat(a).trim()
  return `${pre} ${alg} ${post}`.trim()
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function solveCorners(b: Builder): void {
  const down = b.scheme.down
  const downName = b.scheme.downName.toLowerCase()
  b.beginStep(2, `${b.scheme.downName} corners`)
  for (let iter = 0; iter < 40; iter++) {
    const cub = b.cubies()
    const slot = CORNER_SLOTS.find(
      (s) => cub.corners[s.down]?.cubie !== s.cubie || cub.corners[s.down]?.orientation !== 0,
    )
    if (!slot) {
      b.note(`All four ${downName} corners in place. First layer done.`)
      return
    }
    const pos = cub.corners.findIndex((c) => c.cubie === slot.cubie)
    if (pos >= 4) {
      // Pop the slot it SITS IN (the target's own insert may not touch it).
      const occupant = CORNER_SLOTS[pos - 4]
      if (!occupant) throw new SolveError('internal', `Corner lost at ${pos} (invalid?)`)
      b.do(occupant.popout, `${cap(slot.name)} corner stuck in ${occupant.name}: pop (${occupant.popout}).`)
      continue
    }
    const align = uAlign(pos, slot.up)
    if (align) b.do(align, `Move the ${slot.name} corner above its slot (${align}).`)
    const facelets = CORNER_FACELETS[slot.up] as readonly [number, number, number]
    if (b.state.facelets[facelets[0]] === down) {
      b.do(slot.popout, `${cap(downName)} faces up: pop out (${slot.popout}).`)
      const cub2 = b.cubies()
      const pos2 = cub2.corners.findIndex((c) => c.cubie === slot.cubie)
      const align2 = uAlign(pos2, slot.up)
      if (align2) b.do(align2, `Back above the slot (${align2}).`)
      b.do(slot.popout, `Pop out again (${slot.popout}) — ${downName} is now on the side.`)
      const cub3 = b.cubies()
      const pos3 = cub3.corners.findIndex((c) => c.cubie === slot.cubie)
      const align3 = uAlign(pos3, slot.up)
      if (align3) b.do(align3, `Above the slot (${align3}).`)
    }
    const side = slot.sides.find((s) => b.state.facelets[facelets[s.sticker]] === down)
    if (!side) throw new SolveError('internal', `${cap(downName)} not found on ${slot.name} corner (invalid?)`)
    b.do(side.alg, `${cap(downName)} on the ${side.label}: insert (${side.alg}).`)
    const check = b.cubies()
    if (check.corners[slot.down]?.cubie !== slot.cubie || check.corners[slot.down]?.orientation !== 0) {
      throw new SolveError('internal', `Corner insert failed at ${slot.name} (invalid?)`)
    }
  }
  throw new SolveError('internal', `${cap(downName)} corners did not converge (invalid?)`)
}

function solveMiddle(b: Builder): void {
  const { front, right, left, back } = b.scheme
  b.beginStep(3, 'Middle layer')
  const popoutForSlot = (slotPos: number): string => {
    const found = MIDDLE_SLOTS.find((s) => s.slot === slotPos)
    if (!found) throw new SolveError('internal', `No popout for slot ${slotPos}`)
    return found.popout
  }
  for (let iter = 0; iter < 40; iter++) {
    const cub = b.cubies()
    const slot = MIDDLE_SLOTS.find(
      (s) => cub.edges[s.slot]?.cubie !== s.target || cub.edges[s.slot]?.orientation !== 0,
    )
    if (!slot) {
      b.note('All four middle edges placed. First two layers done.')
      return
    }
    const pos = cub.edges.findIndex((e) => e.cubie === slot.target)
    if (pos >= 8) {
      b.do(popoutForSlot(pos), `Pop the ${slot.name} edge out of the middle (${popoutForSlot(pos)}).`)
      continue
    }
    if (pos >= 4) {
      // Unreachable: D holds the cross (preserved by all inserts).
      throw new SolveError('internal', `Middle edge in the cross at ${pos} (invalid?)`)
    }
    const isFront = slot.slot === 8 || slot.slot === 9
    const target: [number, number] = isFront ? [1, 7] : [3, 1] // [align target, U sticker]
    const align = uAlign(pos, target[0])
    if (align) b.do(align, `Bring the ${slot.name} edge to the ${isFront ? 'front' : 'back'}-top (${align}).`)
    const upColor = b.state.facelets[target[1]]
    if (slot.slot === 8) {
      if (upColor === right) b.do(RIGHT, `Top matches right: insert (${RIGHT}).`)
      else if (upColor === front) b.do(`${RIGHT} ${RIGHT} U2 ${RIGHT}`, `Front colour on top: triple insert with U2.`)
      else throw new SolveError('internal', 'Unexpected top colour on FR edge (invalid?)')
    } else if (slot.slot === 9) {
      if (upColor === left) b.do(LEFT, `Top matches left: insert (${LEFT}).`)
      else if (upColor === front) b.do(`${LEFT} ${LEFT} U2 ${LEFT}`, `Front colour on top: triple insert with U2.`)
      else throw new SolveError('internal', 'Unexpected top colour on FL edge (invalid?)')
    } else if (slot.slot === 11) {
      if (upColor === right) b.do(slot.popout, `Top matches right: insert (${slot.popout}).`)
      else if (upColor === back) b.do(`${slot.popout} ${slot.popout} U2 ${slot.popout}`, `Back colour on top: triple insert with U2.`)
      else throw new SolveError('internal', 'Unexpected top colour on BR edge (invalid?)')
    } else {
      if (upColor === left) b.do(slot.popout, `Top matches left: insert (${slot.popout}).`)
      else if (upColor === back) b.do(`${slot.popout} ${slot.popout} U2 ${slot.popout}`, `Back colour on top: triple insert with U2.`)
      else throw new SolveError('internal', 'Unexpected top colour on BL edge (invalid?)')
    }
    const check = b.cubies()
    if (check.edges[slot.slot]?.cubie !== slot.target || check.edges[slot.slot]?.orientation !== 0) {
      throw new SolveError('internal', `Middle insert failed at ${slot.name} (invalid?)`)
    }
  }
  throw new SolveError('internal', 'Middle layer did not converge (invalid?)')
}

function solveEOLL(b: Builder): void {
  b.beginStep(4, `${b.scheme.upName} cross`)
  const upName = b.scheme.upName.toLowerCase()
  for (let iter = 0; iter < 6; iter++) {
    const cub = b.cubies()
    const oriented: number[] = []
    for (let p = 0; p < 4; p++) if (cub.edges[p]?.orientation === 0) oriented.push(p)
    if (oriented.length === 4) {
      b.note(`${cap(upName)} cross done.`)
      return
    }
    if (oriented.length === 0) {
      b.do(L_TRIG, `Dot: do the L trigger (${L_TRIG}).`)
      continue
    }
    if (oriented.length !== 2) throw new SolveError('internal', 'Impossible edge pattern (invalid?)')
    const [a, c] = oriented as [number, number]
    const adjacent = (a + 1) % 4 === c || (c + 1) % 4 === a
    if (adjacent) {
      // Canonical L: oriented {UL, UB} = {2, 3} (flipped {UR, UF}).
      let k = 0
      while (!(((a + k) % 4 === 2 && (c + k) % 4 === 3) || ((a + k) % 4 === 3 && (c + k) % 4 === 2))) k++
      if (k) b.do('U '.repeat(k).trim(), `Hold the L with ${upName} arms left and back (${'U '.repeat(k).trim()}).`)
      b.do(L_TRIG, `L-shape: (${L_TRIG}).`)
    } else {
      // Canonical line: oriented {UR, UL} = {0, 2} (flipped {UF, UB}).
      let k = 0
      while (!(((a + k) % 4 === 0 && (c + k) % 4 === 2) || ((a + k) % 4 === 2 && (c + k) % 4 === 0))) k++
      if (k) b.do('U '.repeat(k).trim(), `Hold the line left-right (${'U '.repeat(k).trim()}).`)
      b.do(LINE_TRIG, `Line: (${LINE_TRIG}).`)
    }
  }
  throw new SolveError('internal', `${b.scheme.upName} cross did not converge (invalid?)`)
}

/** Canonical OCLL patterns (twist vectors) and their solvers. */
const OCLL: Array<{ pattern: number[]; solve: string; name: string }> = [
  { pattern: [2, 0, 2, 2], solve: SUNE, name: 'Sune' },
  { pattern: [1, 1, 1, 0], solve: ANTISUNE, name: 'Anti-Sune' },
  { pattern: [2, 2, 1, 1], solve: PI, name: 'Pi' },
  { pattern: [2, 1, 0, 0], solve: OLL_U, name: 'Headlights' },
  { pattern: [1, 2, 1, 2], solve: OLL_H, name: 'H' },
  { pattern: [0, 0, 1, 2], solve: `${ANTISUNE} U ${SUNE}`, name: 'Chameleon (T)' },
  { pattern: [0, 1, 0, 2], solve: `${SUNE} U2 ${ANTISUNE}`, name: 'Bowtie' },
]

function solveOCLL(b: Builder): void {
  b.beginStep(5, `Orient ${b.scheme.upName.toLowerCase()} corners`)
  for (let iter = 0; iter < 6; iter++) {
    const cub = b.cubies()
    const v = [0, 1, 2, 3].map((p) => cub.corners[p]?.orientation ?? -1)
    if (v.every((o) => o === 0)) {
      b.note('Whole top face done.')
      return
    }
    let matched = false
    for (let k = 0; k < 4 && !matched; k++) {
      const rotated = [0, 1, 2, 3].map((q) => v[(((q - k) % 4) + 4) % 4] as number)
      const entry = OCLL.find((e) => e.pattern.every((o, i) => o === rotated[i]))
      if (entry) {
        if (k) b.do('U '.repeat(k).trim(), `Match the ${entry.name} diagram (${'U '.repeat(k).trim()}).`)
        b.do(entry.solve, `${entry.name}: (${entry.solve}).`)
        matched = true
      }
    }
    if (!matched) throw new SolveError('internal', `Unknown corner pattern [${v}] (invalid?)`)
  }
  throw new SolveError('internal', 'Corner orientation did not converge (invalid?)')
}

function solveCornersPLL(b: Builder): void {
  b.beginStep(6, 'Position top corners')
  for (let iter = 0; iter < 8; iter++) {
    const cub = b.cubies()
    for (let p = 0; p < 4; p++) {
      if (cub.corners[p]?.orientation !== 0) throw new SolveError('internal', 'Corner twisted in PLL (invalid?)')
    }
    // U-colour cubies 0-3 solve home (cubie == pos).
    const fixed = [0, 1, 2, 3].filter((p) => cub.corners[p]?.cubie === p)
    if (fixed.length === 4) {
      b.note('Corners in place.')
      return
    }
    if (fixed.length === 2) {
      // Single swap (odd parity): T flips corner+edge parity to even.
      b.do(T_PERM, `Two corners swapped (parity): T once (${T_PERM}).`)
      continue
    }
    if (fixed.length === 0) {
      const q = [0, 1, 2, 3].map((qq) => cub.corners[qq]?.cubie as number)
      const involution = q.every((c, i) => (q[c] as number) === i)
      if (!involution) {
        // 4-cycle (odd parity): T flips to even.
        b.do(T_PERM, `Corners cycle (parity): T once (${T_PERM}).`)
        continue
      }
      b.do(AA, `No corner in place: Aa once (${AA}).`)
      continue
    }
    // Aa fixes UFL (1); sequence U^a Aa U^-a fixes (1 - a) mod 4.
    const f = fixed[0] as number
    const a = (((1 - f) % 4) + 4) % 4
    const conj = sandwich(AA, a)
    b.do(conj, `Solved corner to front-left: Aa (${conj}).`)
    const check = b.cubies()
    const solvedNow = [0, 1, 2, 3].every((p) => check.corners[p]?.cubie === p)
    if (!solvedNow) b.do(conj, `Aa again (${conj}).`)
  }
  throw new SolveError('internal', 'Corner position did not converge (invalid?)')
}

function solveEdgesPLL(b: Builder): void {
  b.beginStep(7, 'Position top edges')
  for (let iter = 0; iter < 8; iter++) {
    const cub = b.cubies()
    for (let p = 0; p < 4; p++) {
      if (cub.edges[p]?.orientation !== 0) throw new SolveError('internal', 'Edge flipped in PLL (invalid?)')
    }
    // U-colour cubies 0-3 solve home (cubie == pos).
    const fixed = [0, 1, 2, 3].filter((p) => cub.edges[p]?.cubie === p)
    if (fixed.length === 4) {
      b.note('Cube solved!')
      return
    }
    if (fixed.length === 1) {
      // Ua fixes UB (3); sequence fixes (3 - a) mod 4.
      const f = fixed[0] as number
      const a = (((3 - f) % 4) + 4) % 4
      const conj = sandwich(UA, a)
      b.do(conj, `Solved edge to the back: Ua (${conj}).`)
      const check = b.cubies()
      const solvedNow = [0, 1, 2, 3].every((p) => check.edges[p]?.cubie === p)
      if (!solvedNow) b.do(conj, `Ua again (${conj}).`)
      continue
    }
    // 0 solved: H (opposite) or Z (adjacent) — try H, then Z at each angle.
    const hState = b.state.afterAlgorithm(PLL_H)
    const hCub = hState.toCubies()
    const hSolved = hCub !== null && [0, 1, 2, 3].every((p) => hCub.edges[p]?.cubie === p)
    if (hSolved) {
      b.do(PLL_H, `Opposite edges swapped: H (${PLL_H}).`)
      continue
    }
    let zed = -1
    for (let a = 0; a < 4; a++) {
      const trial = b.state.afterAlgorithm(sandwich(PLL_Z, a)).toCubies()
      if (trial && [0, 1, 2, 3].every((p) => trial.edges[p]?.cubie === p)) {
        zed = a
        break
      }
    }
    if (zed < 0) throw new SolveError('internal', 'Unrecognized edge permutation (invalid?)')
    b.do(sandwich(PLL_Z, zed), `Adjacent edges swapped: Z (${sandwich(PLL_Z, zed)}).`)
  }
  throw new SolveError('internal', 'Edge position did not converge (invalid?)')
}

/**
 * Dynamic beginner solve (internal). Solves D-colour-down / U-colour-up for
 * the input's own centres. See solveBeginner.
 */
function solveDynamic(facelets: readonly number[]): BeginnerSolution {
  const b = new Builder(facelets)
  b.beginStep(1, `${b.scheme.downName} cross`)
  const cross = solveCross(facelets)
  if (cross.length > 0) {
    b.state.doMoves(cross)
    const first = b.steps[0] as BeginnerStageSolution
    first.moves.push(...cross)
    first.notes.push(`Optimal ${cross.length}-move cross.`)
  } else {
    b.note('Cross already solved.')
  }
  solveCorners(b)
  solveMiddle(b)
  solveEOLL(b)
  solveOCLL(b)
  solveCornersPLL(b)
  solveEdgesPLL(b)
  if (!b.state.isSolved()) throw new SolveError('internal', 'Beginner solver finished unsolved (invalid?)')
  const totalMoves = b.steps.flatMap((s) => s.moves)
  return { steps: b.steps, totalMoves, holding: '' }
}

/**
 * Solve a cube with the beginner method. Virtually re-grips to the standard
 * beginner holding (white down, green front) so the taught method applies
 * directly; the returned moves use that holding's labels. Throws SolveError
 * on invalid input.
 */
export function solveBeginner(facelets: readonly number[]): BeginnerSolution {
  if (facelets.length !== 54) throw new SolveError('invalid-input', 'Need 54 facelets')
  if (new CubeState(facelets).isSolved()) {
    const b = new Builder(facelets)
    const dn = b.scheme.downName
    const un = b.scheme.upName.toLowerCase()
    const titles = [`${dn} cross`, `${dn} corners`, 'Middle layer', `${b.scheme.upName} cross`, `Orient ${un} corners`, 'Position top corners', 'Position top edges']
    titles.forEach((title, i) => {
      b.beginStep(i + 1, title)
      b.note('Already solved.')
    })
    return { steps: b.steps, totalMoves: [], holding: 'Already solved — any holding works.' }
  }
  const oriented = rotateY2(rotateX2(facelets))
  const inner = solveDynamic(oriented)
  // The moves must solve the ORIENTED cube; verify, never trust.
  if (!new CubeState(oriented).afterMoves(inner.totalMoves).isSolved()) {
    throw new SolveError('internal', 'Beginner solution does not solve (invalid?)')
  }
  const scheme = readScheme(oriented)
  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
  const downName = cap(COLOR_NAMES[scheme.down as 0] ?? '?')
  const frontName = (COLOR_NAMES[scheme.front as 0] ?? '?').toLowerCase()
  return {
    ...inner,
    holding: `Hold ${downName.toLowerCase()} on the bottom, ${frontName} in front.`,
  }
}
