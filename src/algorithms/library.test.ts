import { describe, expect, it } from 'vitest'
import {
  CubeState,
  cubiesToFacelets,
  faceletsToCubies,
  parseAlgorithm,
} from '../cube/index'
import { BEGINNER_METHOD } from './beginner'
import { INSERTS } from './inserts'
import { LIBRARY, byCategory, getAlgorithm, searchLibrary } from './library'
import { OLL } from './oll'
import { PLL } from './pll'

// ---------------------------------------------------------------------------
// Lock-in tests: every verified claim in the algorithm library is pinned here.
// If any of these fail, either the library was corrupted or the engine
// changed: both are release-blockers. Do not "fix" by updating expectations
// without re-verifying against independent references.
// ---------------------------------------------------------------------------

const after = (start: number[], alg: string): number[] =>
  new CubeState(start).afterMoves(parseAlgorithm(alg)).facelets
const SOLVED = CubeState.solved().facelets
const fp = (moves: string): string => after(SOLVED, moves).join('')
const same = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

const isValidPLL = (s: number[]): boolean => {
  const cub = faceletsToCubies(s)
  return (
    (cub?.corners.slice(4).every((c, i) => c.cubie === i + 4 && c.orientation === 0) &&
      cub?.edges.slice(4).every((e, i) => e.cubie === i + 4 && e.orientation === 0) &&
      cub?.corners.slice(0, 4).every((c) => c.orientation === 0) &&
      cub?.edges.slice(0, 4).every((e) => e.orientation === 0)) ??
    false
  )
}

/** Double-coset equivalence: A == U^i B U^j as facelet states for some i, j. */
const sameCaseDC = (aMoves: string, bMoves: string): boolean => {
  const a = after(SOLVED, aMoves)
  for (let i = 0; i < 4; i++) {
    const pre = 'U '.repeat(i).trim()
    for (let j = 0; j < 4; j++) {
      const post = 'U '.repeat(j).trim()
      if (same(a, after(SOLVED, `${pre} ${bMoves} ${post}`))) return true
    }
  }
  return false
}

describe('library lock-in: PLL exact states', () => {
  const EXPECTED: Record<string, string> = {
    'pll-T': '000000000542111111221222222333333333414444444155555555',
    'pll-Y': '000000000411111111225222222333333333154444444542555555',
    'pll-Jb': '000000000155111111522222222333333333211444444444555555',
    'pll-Ja': '000000000441111111115222222333333333222444444554555555',
    'pll-Na': '000000000144111111522222222333333333411444444255555555',
    'pll-Nb': '000000000441111111225222222333333333114444444552555555',
    'pll-H': '000000000141111111252222222333333333414444444525555555',
    'pll-Z': '000000000121111111212222222333333333454444444545555555',
    'pll-F': '000000000512111111251222222333333333444444444125555555',
    'pll-V': '000000000451111111225222222333333333144444444512555555',
    'pll-E': '000000000215111111124222222333333333542444444451555555',
    'pll-Ra': '000000000145111111512222222333333333221444444454555555',
    'pll-Rb': '000000000241111111424222222333333333155444444512555555',
    'pll-Ga': '000000000522111111251222222333333333414444444145555555',
    'pll-Gb': '000000000542111111211222222333333333454444444125555555',
    'pll-Gc': '000000000552111111241222222333333333414444444125555555',
    'pll-Gd': '000000000542111111251222222333333333424444444115555555',
    'pll-Aa': '000000000515111111221222222333333333144444444452555555',
    'pll-Ab': '000000000412111111225222222333333333544444444151555555',
    'pll-Ua': '000000000141111111212222222333333333424444444555555555',
    'pll-Ub': '000000000121111111242222222333333333414444444555555555',
  }
  it('all 21 PLLs pinned to exact states and valid', () => {
    expect(PLL).toHaveLength(21)
    for (const e of PLL) {
      expect(fp(e.moves)).toBe(EXPECTED[e.id])
      expect(isValidPLL(after(SOLVED, e.moves))).toBe(true)
    }
  })
  it('all 21 PLLs are distinct cases', () => {
    for (let i = 0; i < PLL.length; i++) {
      for (let j = i + 1; j < PLL.length; j++) {
        const a = PLL[i] as { id: string; moves: string }
        const b = PLL[j] as { id: string; moves: string }
        expect(sameCaseDC(a.moves, b.moves)).toBe(false)
      }
    }
  })
  it('E alternate is valid and the same case', () => {
    const e = getAlgorithm('pll-E')
    expect(e.alternateMoves).toBeDefined()
    const alt = after(SOLVED, e.alternateMoves as string)
    expect(isValidPLL(alt)).toBe(true)
    expect(sameCaseDC(e.moves, e.alternateMoves as string)).toBe(true)
    expect(fp(e.alternateMoves as string)).toBe(
      '000000000512111111421222222333333333245444444154555555',
    )
  })
  it('H is U-invariant (any angle works)', () => {
    const h = getAlgorithm('pll-H').moves
    expect(same(after(SOLVED, `U ${h} U'`), after(SOLVED, h))).toBe(true)
  })
})

describe('library lock-in: OLL/insert/trigger exact states', () => {
  it('singles and inserts pinned', () => {
    const EXPECTED: Record<string, string> = {
      'oll-edge-L': '120000110255111111204222222333333333040444444405555555',
      'oll-edge-line': '004002054000111111102222222333333333542444444511555555',
      'oll-sune': '200000105044111111024222222333333333055444444211555555',
      'oll-antisune': '102000004550111111520222222333333333211444444440555555',
      'oll-pi': '204000504512111111140222222333333333050444444021555555',
      'oll-U': '002000200510111111021222222333333333441444444455555555',
      'oll-H': '401000401255111111020222222333333333512444444040555555',
      'ins-FR-right': '000000224511511011110220222331333333223444444544555555',
      'ins-FR-front': '001001005022011111224224220332333333554444444311555555',
      'ins-FL-left': '000000122322111111044022222433333333445445440115555555',
      'ins-FL-front': '400400500155111111122122022233333333220440444443555555',
      'ins-middle-right': '220100100155011111042222222333333333405444444410555555',
      'ins-middle-left': '022004004501111111210222222333333333554440444041555555',
      'trig-sexy': '004002002110511011223220222331333333544444444511555555',
      'trig-sledge': '002002511300111111122220220332333333440444444455555555',
    }
    for (const [id, want] of Object.entries(EXPECTED)) {
      expect(fp(getAlgorithm(id).moves)).toBe(want)
    }
  })
  it('sexy and sledgehammer have order exactly 6', () => {
    for (const id of ['trig-sexy', 'trig-sledge']) {
      const m = getAlgorithm(id).moves
      let s = SOLVED
      for (let k = 1; k <= 6; k++) {
        s = after(s, m)
        expect(same(s, SOLVED)).toBe(k === 6)
      }
    }
  })
})

describe('library lock-in: OLL edge behavior', () => {
  const mkFlip = (flipped: number[]): number[] => {
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    for (const i of flipped) (edges[i] as { orientation: number }).orientation = 1
    return cubiesToFacelets(corners, edges)
  }
  const orientedU = (s: number[]): boolean =>
    faceletsToCubies(s)?.edges.slice(0, 4).every((e) => e.orientation === 0) ?? false
  const L = getAlgorithm('oll-edge-L').moves
  const LINE = getAlgorithm('oll-edge-line').moves

  it('L trigger solves only flipped {UR,UF}; line trigger only {UF,UB}', () => {
    const pairs = [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
      [0, 2],
      [1, 3],
    ]
    for (const pr of pairs) {
      expect(orientedU(after(mkFlip(pr), L))).toBe(pr[0] === 0 && pr[1] === 1)
      expect(orientedU(after(mkFlip(pr), LINE))).toBe(pr[0] === 1 && pr[1] === 3)
    }
  })
  it('dot chains complete to cross after alignment', () => {
    const dot = mkFlip([0, 1, 2, 3])
    // dot -> L trigger -> (align) -> line trigger -> cross
    const viaL = after(dot, L)
    expect([0, 1, 2, 3].some((k) => orientedU(after(viaL, `${'U '.repeat(k).trim()} ${LINE}`)))).toBe(true)
    // dot -> line trigger -> (align) -> L trigger -> cross
    const viaLine = after(dot, LINE)
    expect([0, 1, 2, 3].some((k) => orientedU(after(viaLine, `${'U '.repeat(k).trim()} ${L}`)))).toBe(true)
  })
})

describe('library lock-in: OLL corner behavior', () => {
  const mkTwist = (p: number[]): number[] => {
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    for (let i = 0; i < 4; i++) (corners[i] as { orientation: number }).orientation = p[i] as number
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    return cubiesToFacelets(corners, edges)
  }
  const isOriented = (s: number[]): boolean => {
    const cub = faceletsToCubies(s)
    return (
      (cub?.corners.slice(0, 4).every((cc) => cc.orientation === 0) &&
        cub?.edges.slice(0, 4).every((ee) => ee.orientation === 0) &&
        cub?.corners.slice(4).every((cc, i) => cc.cubie === i + 4 && cc.orientation === 0) &&
        cub?.edges.slice(4).every((ee, i) => ee.cubie === i + 4 && ee.orientation === 0)) ??
      false
    )
  }
  const rot = (p: number[], k: number): number[] => p.map((_, i) => p[((i - k) % 4 + 4) % 4] as number)
  const solves = (moves: string, p: number[]): boolean => isOriented(after(mkTwist(p), moves))

  it('singles solve exactly their pinned angle', () => {
    const CASES: Record<string, number[]> = {
      'oll-sune': [2, 0, 2, 2],
      'oll-antisune': [1, 1, 1, 0],
      'oll-pi': [2, 2, 1, 1],
      'oll-U': [2, 1, 0, 0],
      'oll-H': [1, 2, 1, 2],
    }
    for (const [id, pattern] of Object.entries(CASES)) {
      const moves = getAlgorithm(id).moves
      for (let k = 0; k < 4; k++) {
        const p = rot(pattern, k)
        const expected = p.join(',') === pattern.join(',') || (id === 'oll-H' && k % 2 === 0)
        expect(solves(moves, p)).toBe(expected)
      }
    }
  })
  it('T and bowtie combos solve their canonical patterns exclusively', () => {
    const T = getAlgorithm('oll-T').moves
    const BOW = getAlgorithm('oll-bowtie').moves
    expect(solves(T, [0, 0, 1, 2])).toBe(true)
    expect(solves(T, [0, 1, 0, 2])).toBe(false)
    expect(solves(BOW, [0, 1, 0, 2])).toBe(true)
    expect(solves(BOW, [0, 0, 1, 2])).toBe(false)
  })
  it('sune-only alternates solve their canonical patterns', () => {
    expect(solves(getAlgorithm('oll-pi').alternateMoves as string, [1, 1, 2, 2])).toBe(true)
    expect(solves(getAlgorithm('oll-U').alternateMoves as string, [0, 0, 2, 1])).toBe(true)
    expect(solves(getAlgorithm('oll-H').alternateMoves as string, [1, 2, 1, 2])).toBe(true)
  })
})

describe('library lock-in: beginner completeness', () => {
  type Cub = { cubie: number; orientation: number }
  const RUR = getAlgorithm('ins-FR-right').moves
  const FUF = getAlgorithm('ins-FR-front').moves
  const LUL = getAlgorithm('ins-FL-left').moves
  const FUF2 = getAlgorithm('ins-FL-front').moves
  const RIGHT = getAlgorithm('ins-middle-right').moves
  const LEFT = getAlgorithm('ins-middle-left').moves
  const SUNE = getAlgorithm('oll-sune').moves
  const AA = getAlgorithm('pll-Aa').moves

  // True beginner frame: white cubies 0-3 solve into D positions 4-7 (white down).
  // Back-slot inserts are test-only mirrors; students rotate the cube instead.
  const slots = [
    { cubie: 0, up: 0, down: 4, inserts: [RUR, FUF] },
    { cubie: 1, up: 1, down: 5, inserts: [LUL, FUF2] },
    { cubie: 2, up: 2, down: 6, inserts: ["B' U' B", "L U L'"] },
    { cubie: 3, up: 3, down: 7, inserts: ["R' U' R", "B U B'"] },
  ]
  const U_INDEX = [8, 6, 0, 2]

  it('white corners: all 48 U-states solvable (incl. white-top chain)', () => {
    for (const slot of slots) {
      for (let startPos = 0; startPos < 4; startPos++) {
        for (let ori = 0; ori < 3; ori++) {
          const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
          const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
          if (startPos === slot.cubie) {
            // Target home but twisted: compensate twist on a neighbouring U corner.
            corners[startPos] = { cubie: slot.cubie, orientation: ori }
            corners[(startPos + 1) % 4] = {
              cubie: (startPos + 1) % 4,
              orientation: (3 - ori) % 3,
            }
          } else {
            // 3-cycle: target -> startPos, displaced -> down slot, down cubie -> target home.
            corners[startPos] = { cubie: slot.cubie, orientation: ori }
            corners[slot.down] = { cubie: startPos, orientation: 0 }
            corners[slot.cubie] = { cubie: slot.down, orientation: 0 }
          }
          let state = cubiesToFacelets(corners, edges)
          const cubieAt = (s: number[]): number =>
            faceletsToCubies(s)?.corners.findIndex((c) => c.cubie === slot.cubie) ?? -1
          const align = (s: number[]): number[] => {
            let cur = s
            for (let au = 0; au < 4; au++) {
              if (cubieAt(cur) === slot.up) break
              cur = after(cur, 'U')
            }
            return cur
          }
          const solvedD = (s: number[]): boolean => {
            const cub = faceletsToCubies(s)
            if (!cub) return false
            if (cub.corners[slot.down]?.cubie !== slot.cubie || cub.corners[slot.down]?.orientation !== 0)
              return false
            for (let i = 4; i < 8; i++) {
              if (i === slot.down) continue
              if (cub.corners[i]?.cubie !== i || cub.corners[i]?.orientation !== 0) return false
            }
            return cub.edges.slice(4, 8).every((e, i) => e.cubie === i + 4 && e.orientation === 0) ?? false
          }
          // Taught method: align; white on side -> insert; white up -> pop out twice, then insert.
          state = align(state)
          if (state[U_INDEX[slot.up] as number] === 0) {
            state = after(state, slot.inserts[0] as string)
            state = align(state)
            state = after(state, slot.inserts[0] as string)
            state = align(state)
          }
          const ok = slot.inserts.some((ins) => solvedD(after(state, ins)))
          expect(ok).toBe(true)
        }
      }
    }
  })

  it('white corners: twisted-in-slot and wrong-slot states solvable', () => {
    for (const slot of slots) {
      // (a) Target twisted in its own slot (compensating twist keeps the state valid).
      for (const ori of [1, 2]) {
        const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
        corners[slot.down] = { cubie: slot.cubie, orientation: ori }
        corners[(slot.cubie + 2) % 4] = {
          cubie: (slot.cubie + 2) % 4,
          orientation: (3 - ori) % 3,
        }
        const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
        let state = cubiesToFacelets(corners, edges)
        state = after(state, slot.inserts[0] as string) // pop out
        const at = faceletsToCubies(state)?.corners.findIndex((c) => c.cubie === slot.cubie) ?? -1
        expect(at).toBeLessThan(4) // in U
      }
      // (b) Target sitting in another D slot: pop that slot, solve both in sequence.
      for (const other of slots) {
        if (other.cubie === slot.cubie) continue
        for (let ori = 0; ori < 3; ori++) {
          const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
          // 4-cycle of positions + compensating twist + edge swap = valid.
          corners[other.down] = { cubie: slot.cubie, orientation: ori }
          corners[slot.down] = { cubie: other.cubie, orientation: 0 }
          corners[slot.cubie] = { cubie: slot.down, orientation: 0 }
          corners[other.cubie] = { cubie: other.down, orientation: 0 }
          const spare = [0, 1, 2, 3].find((q) => q !== slot.cubie && q !== other.cubie) as number
          corners[spare] = { cubie: spare, orientation: (3 - ori) % 3 }
          const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
          const t = edges[1] as Cub
          edges[1] = edges[3] as Cub
          edges[3] = t
          let state = cubiesToFacelets(corners, edges)
          const cubieAt = (s: number[], cubie: number): number =>
            faceletsToCubies(s)?.corners.findIndex((c) => c.cubie === cubie) ?? -1
          const solveSlot = (s: number[], sl: (typeof slots)[number]): number[] => {
            // align + insert (+ popout chain for white-top)
            let cur = s
            for (let au = 0; au < 4; au++) {
              if (cubieAt(cur, sl.cubie) === sl.up) break
              cur = after(cur, 'U')
            }
            const isSolved = (d: number[]): boolean => {
              const cub = faceletsToCubies(d)
              return cub?.corners[sl.down]?.cubie === sl.cubie && cub?.corners[sl.down]?.orientation === 0
            }
            for (const ins of sl.inserts) {
              if (isSolved(after(cur, ins))) return after(cur, ins)
            }
            cur = after(cur, sl.inserts[0] as string)
            for (let au = 0; au < 4; au++) {
              if (cubieAt(cur, sl.cubie) === sl.up) break
              cur = after(cur, 'U')
            }
            cur = after(cur, sl.inserts[0] as string)
            for (let au = 0; au < 4; au++) {
              if (cubieAt(cur, sl.cubie) === sl.up) break
              cur = after(cur, 'U')
            }
            for (const ins of sl.inserts) {
              if (isSolved(after(cur, ins))) return after(cur, ins)
            }
            return cur
          }
          state = after(state, other.inserts[0] as string) // pop the slot it sits in
          expect(cubieAt(state, slot.cubie)).toBeLessThan(4)
          state = solveSlot(state, slot)
          const cub = faceletsToCubies(state)
          expect(cub?.corners[slot.down]?.cubie).toBe(slot.cubie)
          expect(cub?.corners[slot.down]?.orientation).toBe(0)
          state = solveSlot(state, other)
          const cub2 = faceletsToCubies(state)
          expect(cub2?.corners[other.down]?.cubie).toBe(other.cubie)
          expect(cub2?.corners[other.down]?.orientation).toBe(0)
          expect(cub2?.corners[slot.down]?.cubie).toBe(slot.cubie)
          expect(cub2?.corners[slot.down]?.orientation).toBe(0)
        }
      }
    }
  })


  it('middle layer: UF rules, F-up chains, popouts (D intact)', () => {
    const mkEdge = (target: number, slot: number, pos: number, ori: number) => {
      const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
      corners[0] = { cubie: 1, orientation: 0 }
      corners[1] = { cubie: 0, orientation: 0 }
      const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
      edges[pos] = { cubie: target, orientation: ori }
      edges[slot] = { cubie: pos, orientation: 0 }
      return cubiesToFacelets(corners, edges)
    }
    const check = (s: number[], target: number, slot: number): { solved: boolean; dOk: boolean } => {
      const cub = faceletsToCubies(s)
      return {
        solved: cub?.edges[slot]?.cubie === target && cub?.edges[slot]?.orientation === 0,
        dOk:
          (cub?.corners.slice(4).every((c, i) => c.cubie === i + 4 && c.orientation === 0) &&
            cub?.edges.slice(4, 8).every((e, i) => e.cubie === i + 4 && e.orientation === 0)) ??
          false,
      }
    }
    // UF with side colour up: single insert solves.
    expect(check(after(mkEdge(8, 8, 1, 1), RIGHT), 8, 8)).toEqual({ solved: true, dOk: true })
    expect(check(after(mkEdge(9, 9, 1, 1), LEFT), 9, 9)).toEqual({ solved: true, dOk: true })
    // F-up: three inserts with U2 before the third.
    expect(check(after(mkEdge(8, 8, 1, 0), `${RIGHT} ${RIGHT} U2 ${RIGHT}`), 8, 8)).toEqual({
      solved: true,
      dOk: true,
    })
    expect(check(after(mkEdge(9, 9, 1, 0), `${LEFT} ${LEFT} U2 ${LEFT}`), 9, 9)).toEqual({
      solved: true,
      dOk: true,
    })
    // Popouts: wrong edge and flipped edge leave the slot.
    const mkSlot = (slot: number, cubie: number, ori: number, other: number, otherCubie: number) => {
      const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
      corners[0] = { cubie: 1, orientation: 0 }
      corners[1] = { cubie: 0, orientation: 0 }
      const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
      edges[slot] = { cubie, orientation: ori }
      edges[other] = { cubie: otherCubie, orientation: 0 }
      return cubiesToFacelets(corners, edges)
    }
    expect(faceletsToCubies(after(mkSlot(8, 9, 0, 9, 8), RIGHT))?.edges[8]?.cubie).not.toBe(9)
    expect(faceletsToCubies(after(mkSlot(8, 8, 1, 1, 1), RIGHT))?.edges[8]?.cubie).not.toBe(8)
    expect(faceletsToCubies(after(mkSlot(9, 8, 0, 8, 9), LEFT))?.edges[9]?.cubie).not.toBe(8)
    expect(faceletsToCubies(after(mkSlot(9, 9, 1, 1, 1), LEFT))?.edges[9]?.cubie).not.toBe(9)
    // Inserts preserve D by themselves.
    for (const alg of [RIGHT, LEFT]) {
      expect(check(after(SOLVED, alg), 8, 8).dOk).toBe(true)
    }
  })

  it('sune edge positioning and Aa rule cover all even perms', () => {
    const evenPerms = (): number[][] => {
      const perms: number[][] = []
      const gen = (arr: number[], l: number): void => {
        if (l === arr.length) {
          let inv = 0
          for (let i = 0; i < 4; i++)
            for (let j = i + 1; j < 4; j++) if ((arr[i] as number) > (arr[j] as number)) inv++
          if (inv % 2 === 0) perms.push(arr.slice())
          return
        }
        for (let i = l; i < arr.length; i++) {
          const t = arr[l] as number
          arr[l] = arr[i] as number
          arr[i] = t
          gen(arr, l + 1)
          const t2 = arr[l] as number
          arr[l] = arr[i] as number
          arr[i] = t2
        }
      }
      gen([0, 1, 2, 3], 0)
      return perms
    }
    // Re-grip simulation: shift U positions, keep standard colour scheme.
    const shiftU = (corners: Cub[], edges: Cub[], t: number): { corners: Cub[]; edges: Cub[] } => {
      const nc = corners.map((c) => ({ ...c }))
      const ne = edges.map((e) => ({ ...e }))
      for (let i = 0; i < 4; i++) {
        nc[(i + t) % 4] = { ...(corners[i] as Cub) }
        ne[(i + t) % 4] = { ...(edges[i] as Cub) }
      }
      return { corners: nc, edges: ne }
    }
    const runRule = (p: number[], moves: string, isEdge: boolean): boolean => {
      let corners: Cub[] = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
      let edges: Cub[] = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
      for (let i = 0; i < 4; i++) {
        if (isEdge) (edges[i] as Cub).cubie = p[i] as number
        else (corners[i] as Cub).cubie = p[i] as number
      }
      let frame = 0
      const solvedInFrame = (): boolean => {
        for (let q = 0; q < 4; q++) {
          const home = (((q - frame) % 4) + 4) % 4
          const piece = isEdge ? edges[q] : corners[q]
          if (piece?.cubie !== home || piece?.orientation !== 0) return false
        }
        return true
      }
      for (let round = 0; round < 3 && !solvedInFrame(); round++) {
        let solvedPos = -1
        for (let q = 0; q < 4; q++) {
          const home = (((q - frame) % 4) + 4) % 4
          const piece = isEdge ? edges[q] : corners[q]
          if (piece?.cubie === home && piece?.orientation === 0) {
            solvedPos = q
            break
          }
        }
        if (solvedPos >= 0) {
          const t = (1 - solvedPos + 8) % 4
          const s = shiftU(corners, edges, t)
          corners = s.corners
          edges = s.edges
          frame = (frame + t) % 4
        }
        const out = faceletsToCubies(after(cubiesToFacelets(corners, edges), moves))
        if (!out) throw new Error('decode failed')
        corners = out.corners.map((c) => ({ ...c }))
        edges = out.edges.map((e) => ({ ...e }))
      }
      return solvedInFrame()
    }
    for (const p of evenPerms()) {
      expect(runRule(p, SUNE, true)).toBe(true)
      expect(runRule(p, AA, false)).toBe(true)
    }
    // 0-solved states become exactly-1-solved after one application.
    const countSolved = (p: number[], moves: string, isEdge: boolean): number => {
      const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
      const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
      for (let i = 0; i < 4; i++) {
        if (isEdge) (edges[i] as Cub).cubie = p[i] as number
        else (corners[i] as Cub).cubie = p[i] as number
      }
      const out = faceletsToCubies(after(cubiesToFacelets(corners, edges), moves))
      let n = 0
      for (let q = 0; q < 4; q++) {
        const piece = isEdge ? out?.edges[q] : out?.corners[q]
        if (piece?.cubie === q && piece?.orientation === 0) n++
      }
      return n
    }
    for (const p of evenPerms()) {
      const fixed = p.filter((cubie, pos) => cubie === pos).length
      if (fixed === 0) {
        expect(countSolved(p, SUNE, true)).toBe(1)
        expect(countSolved(p, AA, false)).toBe(1)
      }
    }
  })
})

describe('library lock-in: U-rule edge positioning', () => {
  const UA = "R2 U R U R' U' R' U' R' U R'"
  const UH = 'R2 U2 R U2 R2 U2 R2 U2 R U2 R2'
  const UZ = "U R' U' R U' R U R U' R' U R U R2 U' R' U"
  const evenPerms = (): number[][] => {
    const out: number[][] = []
    const gen = (arr: number[], l: number): void => {
      if (l === arr.length) {
        let inv = 0
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if ((arr[i] as number) > (arr[j] as number)) inv++
        if (inv % 2 === 0) out.push(arr.slice())
        return
      }
      for (let i = l; i < arr.length; i++) {
        const t = arr[l] as number
        arr[l] = arr[i] as number
        arr[i] = t
        gen(arr, l + 1)
        const t2 = arr[l] as number
        arr[l] = arr[i] as number
        arr[i] = t2
      }
    }
    gen([0, 1, 2, 3], 0)
    return out
  }
  const edgeState = (p: number[]): number[] => {
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    for (let i = 0; i < 4; i++) (edges[i] as { cubie: number }).cubie = p[i] as number
    return cubiesToFacelets(corners, edges)
  }
  const edgesSolved = (s: number[]): boolean => {
    const cub = faceletsToCubies(s)
    return cub?.edges.slice(0, 4).every((e, i) => e.cubie === i && e.orientation === 0) ?? false
  }
  // U-sandwich as a move sequence "U^a Alg U^-a" fixes U^-a(q) for an alg fixing q.
  // Ua fixes UB (3): to fix f, a = (3 - f) mod 4.
  const sandwich = (alg: string, a: number): string => {
    const pre = 'U '.repeat(a).trim()
    const post = "U' ".repeat(a).trim()
    return `${pre} ${alg} ${post}`.trim()
  }

  it('U-rule covers all 12 even edge perms (Ua 1-2x; H or Z for 0-solved)', () => {
    for (const p of evenPerms()) {
      const start = edgeState(p)
      let ok = false
      const fixed = p.filter((cubie, pos) => cubie === pos).length
      const fixedIdx = p.findIndex((cubie, pos) => cubie === pos)
      if (fixed === 4) ok = true
      else if (fixedIdx === -1) {
        if (edgesSolved(after(start, UH))) ok = true
        else for (let a = 0; a < 4 && !ok; a++) ok = edgesSolved(after(start, sandwich(UZ, a)))
      } else {
        const conj = sandwich(UA, (3 - fixedIdx + 8) % 4)
        const once = after(start, conj)
        ok = edgesSolved(once) || edgesSolved(after(once, conj))
      }
      expect(ok, `U-rule must solve edge perm [${p}]`).toBe(true)
    }
  })
})

describe('library lock-in: corner PLL parity', () => {
  const AA = getAlgorithm('pll-Aa').moves
  const T = getAlgorithm('pll-T').moves
  const allPerms = (): number[][] => {
    const out: number[][] = []
    const gen = (arr: number[], l: number): void => {
      if (l === arr.length) {
        out.push(arr.slice())
        return
      }
      for (let i = l; i < arr.length; i++) {
        const t = arr[l] as number
        arr[l] = arr[i] as number
        arr[i] = t
        gen(arr, l + 1)
        const t2 = arr[l] as number
        arr[l] = arr[i] as number
        arr[i] = t2
      }
    }
    gen([0, 1, 2, 3], 0)
    return out
  }
  const cornerState = (p: number[]): number[] => {
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    for (let i = 0; i < 4; i++) (corners[i] as { cubie: number }).cubie = p[i] as number
    return cubiesToFacelets(corners, edges)
  }
  const permOf = (s: number[]): number[] =>
    [0, 1, 2, 3].map((q) => faceletsToCubies(s)?.corners[q]?.cubie as number)
  const cornersSolved = (s: number[]): boolean => permOf(s).every((c, i) => c === i)
  const sandwich = (alg: string, a: number): string => {
    const pre = 'U '.repeat(a).trim()
    const post = "U' ".repeat(a).trim()
    return `${pre} ${alg} ${post}`.trim()
  }

  it('Aa-rule plus T parity fix covers all 24 corner perms', () => {
    for (const p of allPerms()) {
      let state = cornerState(p)
      for (let step = 0; step < 4 && !cornersSolved(state); step++) {
        const q = permOf(state)
        const fixed = q.filter((c, i) => c === i)
        if (fixed.length === 4) break
        if (fixed.length === 1) {
          const conj = sandwich(AA, (((1 - (fixed[0] as number)) % 4) + 4) % 4)
          state = after(state, conj)
          if (!cornersSolved(state)) state = after(state, conj)
        } else if (fixed.length === 0) {
          const involution = q.every((c, i) => (q[c as number] as number) === i)
          state = after(state, involution ? AA : T)
        } else {
          state = after(state, T)
        }
      }
      expect(cornersSolved(state), `parity rule must solve corner perm [${p}]`).toBe(true)
    }
  })
})

describe('library lock-in: integrity', () => {
  it('ids unique, moves parse, categories valid', () => {
    expect(LIBRARY).toHaveLength(21 + 9 + 8)
    expect(new Set(LIBRARY.map((e) => e.id)).size).toBe(LIBRARY.length)
    for (const e of LIBRARY) {
      expect(parseAlgorithm(e.moves).length).toBeGreaterThan(0)
      if (e.alternateMoves) expect(parseAlgorithm(e.alternateMoves).length).toBeGreaterThan(0)
      expect(['pll', 'oll', 'beginner', 'trigger']).toContain(e.category)
      for (const ref of e.seeAlso ?? []) expect(() => getAlgorithm(ref)).not.toThrow()
    }
    expect(byCategory('pll')).toHaveLength(21)
    expect(OLL).toHaveLength(9)
    expect(INSERTS).toHaveLength(8)
  })
  it('search finds entries', () => {
    expect(searchLibrary('')).toHaveLength(LIBRARY.length)
    expect(searchLibrary('sune').map((e) => e.id)).toContain('oll-sune')
    expect(searchLibrary('pll-')).toHaveLength(21)
    expect(searchLibrary("R' F R' B2")).toHaveLength(1)
    expect(searchLibrary('nonexistent-xyz')).toHaveLength(0)
  })
  it('beginner method references resolve', () => {
    expect(BEGINNER_METHOD).toHaveLength(7)
    for (const step of BEGINNER_METHOD) {
      for (const rule of step.rules) {
        for (const id of rule.uses) expect(() => getAlgorithm(id)).not.toThrow()
        for (const m of rule.action.matchAll(/\[([a-z0-9-]+)\]/g)) {
          expect(() => getAlgorithm(m[1] as string)).not.toThrow()
        }
      }
    }
  })
})
