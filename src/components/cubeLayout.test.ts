import { describe, expect, it } from 'vitest'
import { MOVE_PERMS } from '../cube/moves'
import type { Face, Move } from '../cube/types'
import { animatedDestination, faceletToVec3, vec3ToFacelet } from './cubeLayout'

describe('3D layout math', () => {
  it('facelet mapping round-trips', () => {
    for (let i = 0; i < 54; i++) {
      const { pos, normal } = faceletToVec3(i)
      expect(vec3ToFacelet(pos, normal)).toBe(i)
    }
  })

  it('animated destinations agree with the engine move tables (all 18 moves)', () => {
    const faces: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']
    const keys = ['', '2', "'"]
    for (const face of faces) {
      for (let t = 1; t <= 3; t++) {
        const move: Move = { face, turns: t as 1 | 2 | 3 }
        const perm = MOVE_PERMS[`${face}${keys[t - 1]}`] as readonly number[]
        // Engine: new[j] = old[perm[j]] — the sticker at perm[j] moves to j.
        for (let j = 0; j < 54; j++) {
          const from = perm[j] as number
          expect(animatedDestination(from, move), `${face}${keys[t - 1]} moves ${from}->${j}`).toBe(j)
        }
      }
    }
  })
})
