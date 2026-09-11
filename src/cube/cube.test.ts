import { describe, expect, it } from 'vitest'
import { CubeState, faceletsToCubies } from './cube'
import { FACES } from './types'
import type { Move } from './types'
import { formatAlgorithm, invertAlgorithm, optimizeMoves, parseAlgorithm } from './notation'
import { generateScramble, isCleanScramble, seededRng } from './scramble'
import { validateCube } from './validator'
import { cubiesToFacelets, randomCubieState, randomFacelets } from './randomState'

function orderOf(algorithm: string): number {
  const moves = parseAlgorithm(algorithm)
  const cube = CubeState.solved()
  for (let k = 1; k <= 24; k++) {
    cube.doMoves(moves)
    if (cube.isSolved()) return k
  }
  return -1
}

describe('CubeState basics', () => {
  it('starts solved with the standard color scheme', () => {
    const cube = CubeState.solved()
    expect(cube.isSolved()).toBe(true)
    expect(cube.facelets).toHaveLength(54)
    for (let f = 0; f < 6; f++) {
      for (let k = 0; k < 9; k++) expect(cube.facelets[f * 9 + k]).toBe(f)
    }
  })

  it('four quarter turns of any face return to the original state', () => {
    for (const face of FACES) {
      const cube = CubeState.solved()
      const move: Move = { face, turns: 1 }
      cube.doMove(move).doMove(move).doMove(move).doMove(move)
      expect(cube.isSolved()).toBe(true)
    }
  })

  it('every move multiplied by its inverse is identity', () => {
    const base = CubeState.solved().doAlgorithm('R U F D L B R2 U2 F2')
    for (const face of FACES) {
      for (const turns of [1, 2, 3] as const) {
        const cube = base.clone()
        cube.doMove({ face, turns })
        cube.doMove({ face, turns: turns === 2 ? 2 : turns === 1 ? 3 : 1 })
        expect(cube.equals(base)).toBe(true)
      }
    }
  })

  it('double turn applied twice is identity', () => {
    for (const face of FACES) {
      const cube = CubeState.solved().doAlgorithm('F R U B L D')
      const before = cube.clone()
      cube.doMove({ face, turns: 2 }).doMove({ face, turns: 2 })
      expect(cube.equals(before)).toBe(true)
    }
  })

  it('has well-known algorithm orders (sexy=6, sledge=6, T=2)', () => {
    expect(orderOf("R U R' U'")).toBe(6)
    expect(orderOf("R' F R F'")).toBe(6)
    expect(orderOf("R U R' U' R' F R2 U' R' U' R U R' F'")).toBe(2)
  })

  it('moves the URF corner to UFL under U (direction sanity)', () => {
    const cubies = faceletsToCubies(CubeState.solved().doAlgorithm('U').facelets)
    expect(cubies).not.toBeNull()
    // Corner piece 0 (URF) must now sit at position 1 (UFL).
    expect(cubies?.corners[1]?.cubie).toBe(0)
    expect(cubies?.corners[1]?.orientation).toBe(0)
  })

  it('moves the URF corner to UBR under R (direction sanity)', () => {
    const cubies = faceletsToCubies(CubeState.solved().doAlgorithm('R').facelets)
    expect(cubies?.corners[3]?.cubie).toBe(0)
  })

  it('round-trips facelet strings', () => {
    const cube = CubeState.solved().doAlgorithm("R U R' U' F2 D L' B")
    const str = cube.toFaceletString()
    expect(str).toHaveLength(54)
    expect(CubeState.fromFaceletString(str).equals(cube)).toBe(true)
  })

  it('clone() is independent', () => {
    const a = CubeState.solved()
    const b = a.clone()
    b.doAlgorithm('R')
    expect(a.isSolved()).toBe(true)
    expect(b.isSolved()).toBe(false)
  })
})

describe('notation', () => {
  it('parses all suffix forms', () => {
    expect(parseAlgorithm('R')).toEqual([{ face: 'R', turns: 1 }])
    expect(parseAlgorithm('R2')).toEqual([{ face: 'R', turns: 2 }])
    expect(parseAlgorithm("R'")).toEqual([{ face: 'R', turns: 3 }])
    expect(parseAlgorithm("R2'")).toEqual([{ face: 'R', turns: 2 }])
    expect(parseAlgorithm('R\u2019')).toEqual([{ face: 'R', turns: 3 }]) // unicode apostrophe
  })

  it('ignores parentheses and extra whitespace', () => {
    expect(formatAlgorithm(parseAlgorithm("(R U R' U')  (R U R' U')"))).toBe("R U R' U' R U R' U'")
    expect(parseAlgorithm('')).toEqual([])
    expect(parseAlgorithm('   ')).toEqual([])
  })

  it('round-trips format/parse', () => {
    const alg = "R U R' U' R' F R2 U' R' U' R U R' F'"
    expect(formatAlgorithm(parseAlgorithm(alg))).toBe(alg)
  })

  it('rejects unsupported tokens with helpful errors', () => {
    expect(() => parseAlgorithm('R M R')).toThrow(/Slice move/)
    expect(() => parseAlgorithm('x R U')).toThrow(/rotation/i)
    expect(() => parseAlgorithm('r U')).toThrow(/Wide move/)
    expect(() => parseAlgorithm('R Q')).toThrow(/Unexpected character/)
    expect(() => parseAlgorithm("R 2'")).toThrow(/Stray/)
  })

  it('inverts algorithms (alg + inverse = solved)', () => {
    const moves = parseAlgorithm("R U R' U' F2 D L' B D2")
    const cube = CubeState.solved().afterMoves(moves).afterMoves(invertAlgorithm(moves))
    expect(cube.isSolved()).toBe(true)
  })

  it('optimizes redundant sequences', () => {
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm("R R'")))).toBe('')
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm('R R')))).toBe('R2')
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm('R R R')))).toBe("R'")
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm('R R R R')))).toBe('')
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm("U2 U2 R")))).toBe('R')
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm("R U U' F")))).toBe('R F')
    expect(formatAlgorithm(optimizeMoves(parseAlgorithm("R L R'")))).toBe('L')
  })

  it('optimization preserves cube effect and is idempotent', () => {
    const rng = seededRng(7)
    for (let t = 0; t < 60; t++) {
      const spam = generateScramble(15, rng)
      // Inject redundancy.
      const redundant: Move[] = []
      for (const m of spam) {
        redundant.push(m)
        if (rng() < 0.4) redundant.push(m)
      }
      const once = optimizeMoves(redundant)
      const twice = optimizeMoves(once)
      expect(twice).toEqual(once)
      const a = CubeState.solved().afterMoves(redundant)
      const b = CubeState.solved().afterMoves(once)
      expect(a.equals(b)).toBe(true)
    }
  })
})

describe('scramble generator', () => {
  it('generates clean scrambles of the requested length', () => {
    for (const len of [1, 10, 20, 25, 40]) {
      const moves = generateScramble(len, seededRng(len * 131))
      expect(moves).toHaveLength(len)
      expect(isCleanScramble(moves)).toBe(true)
    }
  })

  it('never emits redundant patterns across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(isCleanScramble(generateScramble(25, seededRng(seed)))).toBe(true)
    }
  })

  it('is deterministic with a seeded rng', () => {
    expect(formatAlgorithm(generateScramble(20, seededRng(42)))).toBe(
      formatAlgorithm(generateScramble(20, seededRng(42))),
    )
  })

  it('produces valid, non-trivial states', () => {
    for (let seed = 0; seed < 30; seed++) {
      const cube = CubeState.solved().afterMoves(generateScramble(20, seededRng(1000 + seed)))
      expect(cube.isSolved()).toBe(false)
      expect(validateCube(cube.facelets).valid).toBe(true)
    }
  })
})

describe('random cubie states', () => {
  it('round-trips cubies -> facelets -> cubies', () => {
    for (let seed = 0; seed < 40; seed++) {
      const rng = seededRng(seed)
      const { corners, edges } = randomCubieState(rng)
      const facelets = cubiesToFacelets(corners, edges)
      const back = faceletsToCubies(facelets)
      expect(back).not.toBeNull()
      for (let i = 0; i < 8; i++) {
        expect(back?.corners[i]?.cubie).toBe(corners[i]?.cubie)
        expect(back?.corners[i]?.orientation).toBe(corners[i]?.orientation)
      }
      for (let i = 0; i < 12; i++) {
        expect(back?.edges[i]?.cubie).toBe(edges[i]?.cubie)
        expect(back?.edges[i]?.orientation).toBe(edges[i]?.orientation)
      }
    }
  })

  it('generates valid cubes', () => {
    for (let seed = 0; seed < 40; seed++) {
      expect(validateCube(randomFacelets(seededRng(seed))).valid).toBe(true)
    }
  })
})

describe('validator', () => {
  it('accepts the solved cube and real scrambles', () => {
    expect(validateCube(CubeState.solved().facelets).valid).toBe(true)
    for (let seed = 0; seed < 30; seed++) {
      const facelets = CubeState.solved().afterMoves(generateScramble(25, seededRng(seed))).facelets
      expect(validateCube(facelets)).toEqual({ valid: true, issues: [] })
    }
  })

  it('detects duplicate centers', () => {
    const facelets = CubeState.solved().facelets
    facelets[13] = 0 // R center painted white
    const result = validateCube(facelets)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('duplicate-center')
    expect(result.issues[0]?.facelets).toContain(13)
  })

  it('detects wrong sticker counts', () => {
    const facelets = CubeState.solved().facelets
    facelets[0] = 1 // one white sticker painted red
    const result = validateCube(facelets)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('color-count')
  })

  it('detects a twisted corner (in-place rotation)', () => {
    const facelets = CubeState.solved().facelets
    // Cycle the three stickers of the URF corner in place.
    const [a, b, c] = [facelets[8], facelets[9], facelets[20]]
    facelets[8] = c as number
    facelets[9] = a as number
    facelets[20] = b as number
    const result = validateCube(facelets)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('twisted-corner')
    expect(result.issues[0]?.facelets.length).toBeGreaterThan(0)
  })

  it('detects a flipped edge (in-place swap)', () => {
    const facelets = CubeState.solved().facelets
    const tmp = facelets[7]
    facelets[7] = facelets[19] as number
    facelets[19] = tmp as number
    const result = validateCube(facelets)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('flipped-edge')
  })

  it('detects swapped edges (parity)', () => {
    // UF and UB edge pieces exchanged, everything else solved.
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const tmp = edges[1] as { cubie: number; orientation: number }
    edges[1] = edges[3] as { cubie: number; orientation: number }
    edges[3] = tmp
    const result = validateCube(cubiesToFacelets(corners, edges))
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('parity')
  })

  it('detects swapped corners (parity)', () => {
    // URF and DRB corner pieces exchanged, everything else solved.
    const corners = Array.from({ length: 8 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const edges = Array.from({ length: 12 }, (_, cubie) => ({ cubie, orientation: 0 }))
    const tmp = corners[0] as { cubie: number; orientation: number }
    corners[0] = corners[7] as { cubie: number; orientation: number }
    corners[7] = tmp
    const result = validateCube(cubiesToFacelets(corners, edges))
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('parity')
  })

  it('detects impossible color combinations', () => {
    const facelets = CubeState.solved().facelets
    // Swap two stickers between adjacent corners: URF <-> UFL.
    const tmp = facelets[9]
    facelets[9] = facelets[18] as number
    facelets[18] = tmp as number
    const result = validateCube(facelets)
    expect(result.valid).toBe(false)
    expect(['unknown-corner', 'unknown-edge']).toContain(result.issues[0]?.code)
  })

  it('explains problems in beginner-friendly language', () => {
    const facelets = CubeState.solved().facelets
    const tmp = facelets[7]
    facelets[7] = facelets[19] as number
    facelets[19] = tmp as number
    const message = validateCube(facelets).issues[0]?.message ?? ''
    expect(message.length).toBeGreaterThan(40)
    expect(message).toMatch(/flipped/i)
  })
})
