import { describe, expect, it } from 'vitest'
import { CubeState, randomFacelets } from '../cube/index'
import { rotateX2, rotateY2 } from '../cube/rotations'
import { solveBeginner } from './beginnerSolver'
import { initCrossTable } from './crossTable'

/** The solver re-grips to white-down/green-front; tests verify in that frame. */
const oriented = (facelets: number[]): number[] => rotateY2(rotateX2(facelets))

describe('beginner solver end to end', () => {
  it('builds the cross table', () => {
    const size = initCrossTable()
    // 12P4 position patterns x 2^4 orientations = 11880 x 16.
    expect(size).toBe(190080)
  })

  it('solves an already-solved cube with no moves', () => {
    const sol = solveBeginner(CubeState.solved().facelets)
    expect(sol.steps).toHaveLength(7)
    expect(sol.totalMoves).toHaveLength(0)
  })

  it('solves random cubes completely', () => {
    for (let trial = 0; trial < 60; trial++) {
      const start = randomFacelets()
      const sol = solveBeginner(start)
      expect(sol.steps).toHaveLength(7)
      expect(sol.holding).toContain('white on the bottom')
      const end = new CubeState(oriented(start)).afterMoves(sol.totalMoves)
      expect(end.isSolved(), `trial ${trial} must end solved`).toBe(true)
      // Sanity: beginner solutions are long but bounded.
      expect(sol.totalMoves.length).toBeLessThan(400)
      // Cross is optimal: never more than 8 moves.
      expect(sol.steps[0]?.moves.length ?? 99).toBeLessThanOrEqual(8)
    }
  }, 120000)

  it('cross stage alone builds a correct cross on D', () => {
    for (let trial = 0; trial < 20; trial++) {
      const start = randomFacelets()
      const sol = solveBeginner(start)
      const afterCross = new CubeState(oriented(start)).afterMoves(sol.steps[0]?.moves ?? [])
      const cub = afterCross.toCubies()
      expect(cub).not.toBeNull()
      for (let c = 0; c < 4; c++) {
        expect(cub?.edges[c + 4]?.cubie).toBe(c + 4)
        expect(cub?.edges[c + 4]?.orientation).toBe(0)
      }
    }
  }, 120000)
})
