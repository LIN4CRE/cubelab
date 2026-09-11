import { beforeAll, describe, expect, it } from 'vitest'
import {
  CubeState,
  formatAlgorithm,
  generateScramble,
  invertAlgorithm,
  parseAlgorithm,
  randomFacelets,
  seededRng,
  validateCube,
} from '../cube/index'
import { solveByInvertingScramble } from './inverseScramble'
import { ensureSolverReady, min2phaseFromScramble, solveWithKociemba } from './kociemba'
import { SolveError } from './types'

beforeAll(async () => {
  await ensureSolverReady()
}, 60000)

describe('engine cross-check (own move tables vs min2phase cubie model)', () => {
  it('matches min2phase.fromScramble on single moves', async () => {
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
      for (const suffix of ['', '2', "'"]) {
        const alg = `${face}${suffix}`
        const mine = CubeState.solved().afterAlgorithm(alg).toFaceletString()
        const theirs = await min2phaseFromScramble(alg)
        expect(mine).toBe(theirs)
      }
    }
  })

  it('matches min2phase.fromScramble on hundreds of random scrambles', async () => {
    for (let seed = 0; seed < 150; seed++) {
      const scramble = formatAlgorithm(generateScramble(25, seededRng(seed)))
      const mine = CubeState.solved().afterAlgorithm(scramble).toFaceletString()
      const theirs = await min2phaseFromScramble(scramble)
      expect(mine).toBe(theirs)
    }
  })

  it('matches on famous algorithms', async () => {
    const algs = [
      "R U R' U'",
      "R' F R F'",
      "R U R' U R U2 R'",
      "R U R' U' R' F R2 U' R' U' R U R' F'",
      'F R U R U2 R2 U2 R U R U R2 U2',
      "U R U' L' U R' U' L",
    ]
    for (const alg of algs) {
      const mine = CubeState.solved().afterAlgorithm(alg).toFaceletString()
      const theirs = await min2phaseFromScramble(alg)
      expect(mine).toBe(theirs)
    }
  })
})

describe('Kociemba solver correctness', () => {
  it('solves random-move scrambles (solution + scramble = solved)', async () => {
    for (let seed = 0; seed < 60; seed++) {
      const scramble = generateScramble(20, seededRng(5000 + seed))
      const cube = CubeState.solved().afterMoves(scramble)
      expect(validateCube(cube.facelets).valid).toBe(true)
      const solution = await solveWithKociemba(cube.facelets)
      expect(solution.isOptimal).toBe(false)
      expect(solution.htm).toBeLessThanOrEqual(21)
      expect(solution.htm).toBeGreaterThan(0)
      const solved = cube.afterMoves(solution.moves)
      expect(solved.isSolved()).toBe(true)
    }
  }, 120000)

  it('solves uniformly random states', async () => {
    for (let seed = 0; seed < 25; seed++) {
      const facelets = randomFacelets(seededRng(9000 + seed))
      expect(validateCube(facelets).valid).toBe(true)
      const solution = await solveWithKociemba(facelets)
      expect(solution.htm).toBeLessThanOrEqual(21)
      const solved = new CubeState(facelets).afterMoves(solution.moves)
      expect(solved.isSolved()).toBe(true)
    }
  }, 120000)

  it('returns an empty solution for a solved cube', async () => {
    const solution = await solveWithKociemba(CubeState.solved().facelets)
    expect(solution.moves).toEqual([])
    expect(solution.htm).toBe(0)
  })

  it('rejects impossible cubes with specific errors', async () => {
    // Twisted corner.
    const twisted = CubeState.solved().facelets
    const [a, b, c] = [twisted[8], twisted[9], twisted[20]]
    twisted[8] = c as number
    twisted[9] = a as number
    twisted[20] = b as number
    await expect(solveWithKociemba(twisted)).rejects.toBeInstanceOf(SolveError)

    // Flipped edge.
    const flipped = CubeState.solved().facelets
    const tmp = flipped[7]
    flipped[7] = flipped[19] as number
    flipped[19] = tmp as number
    await expect(solveWithKociemba(flipped)).rejects.toBeInstanceOf(SolveError)
  })
})

describe('inverse-scramble solver', () => {
  it('solves by exact reversal', () => {
    for (let seed = 0; seed < 30; seed++) {
      const scramble = generateScramble(20, seededRng(seed))
      const cube = CubeState.solved().afterMoves(scramble)
      const solution = solveByInvertingScramble(scramble)
      expect(solution.solverId).toBe('inverse-scramble')
      expect(cube.afterMoves(solution.moves).isSolved()).toBe(true)
      expect(solution.moves).toEqual(invertAlgorithm(scramble))
    }
  })

  it('never claims optimality', () => {
    const solution = solveByInvertingScramble(parseAlgorithm('R U'))
    expect(solution.isOptimal).toBe(false)
  })
})
