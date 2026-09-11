/**
 * Pure 3D layout math for the cube viewer (no three.js dependency so the
 * mapping can be unit-tested against the engine's move tables).
 *
 * World axes: x = right, y = up, z = toward viewer (front).
 * Facelet layout follows src/cube/types.ts: U viewed from above with B at
 * the top, D viewed from below with F at top, sides viewed directly.
 */
import type { Face, Move } from '../cube/types'

export type Vec3 = readonly [number, number, number]

/** 3D cubie coordinate + outward sticker normal for a facelet index. */
export function faceletToVec3(index: number): { pos: Vec3; normal: Vec3 } {
  const face = Math.floor(index / 9)
  const k = index % 9
  const row = Math.floor(k / 3)
  const col = k % 3
  switch (face) {
    case 0: // U
      return { pos: [col - 1, 1, row - 1], normal: [0, 1, 0] }
    case 1: // R
      return { pos: [1, 1 - row, 1 - col], normal: [1, 0, 0] }
    case 2: // F
      return { pos: [col - 1, 1 - row, 1], normal: [0, 0, 1] }
    case 3: // D
      return { pos: [col - 1, -1, 1 - row], normal: [0, -1, 0] }
    case 4: // L
      return { pos: [-1, 1 - row, col - 1], normal: [-1, 0, 0] }
    default: // B
      return { pos: [1 - col, 1 - row, -1], normal: [0, 0, -1] }
  }
}

/** Inverse of faceletToVec3: facelet index at (pos, normal). */
export function vec3ToFacelet(pos: Vec3, normal: Vec3): number {
  const [x, y, z] = pos
  const [nx, ny, nz] = normal
  if (ny === 1) return (z + 1) * 3 + (x + 1) // U face block starts at 0
  if (ny === -1) return 3 * 9 + (1 - z) * 3 + (x + 1)
  if (nx === 1) return 1 * 9 + (1 - y) * 3 + (1 - z)
  if (nx === -1) return 4 * 9 + (1 - y) * 3 + (z + 1)
  if (nz === 1) return 2 * 9 + (1 - y) * 3 + (x + 1)
  return 5 * 9 + (1 - y) * 3 + (1 - x)
}

/** Axis index (0=x,1=y,2=z) and layer (-1/+1) turned by a face. */
export function faceAxisLayer(face: Face): { axis: 0 | 1 | 2; layer: 1 | -1 } {
  switch (face) {
    case 'R': return { axis: 0, layer: 1 }
    case 'L': return { axis: 0, layer: -1 }
    case 'U': return { axis: 1, layer: 1 }
    case 'D': return { axis: 1, layer: -1 }
    case 'F': return { axis: 2, layer: 1 }
    case 'B': return { axis: 2, layer: -1 }
  }
}

/**
 * Signed quarter-turns about the positive axis for a clockwise (Singmaster)
 * turn of the face: U/R/F clockwise seen from the positive axis = -1,
 * D/L/B clockwise seen from the negative axis = +1.
 */
export function faceQuarterSign(face: Face): 1 | -1 {
  return face === 'U' || face === 'R' || face === 'F' ? -1 : 1
}

/** Rotate a vector by +90° about axis (right-hand rule). */
export function rotateQuarter(v: Vec3, axis: 0 | 1 | 2): Vec3 {
  const [x, y, z] = v
  if (axis === 0) return [x, -z, y]
  if (axis === 1) return [z, y, -x]
  return [-y, x, z]
}

/**
 * Where the sticker at facelet `index` ends up (as a facelet index) after
 * `move`, according to the 3D rotation. Must agree with MOVE_PERMS
 * (see cubeLayout.test.ts).
 */
export function animatedDestination(index: number, move: Move): number {
  const { pos, normal } = faceletToVec3(index)
  const { axis, layer } = faceAxisLayer(move.face)
  if (pos[axis] !== layer) return index
  let steps = faceQuarterSign(move.face) * move.turns
  let p: Vec3 = pos
  let n: Vec3 = normal
  while (steps > 0) {
    p = rotateQuarter(p, axis)
    n = rotateQuarter(n, axis)
    steps--
  }
  while (steps < 0) {
    // -90° = three +90° steps.
    for (let k = 0; k < 3; k++) {
      p = rotateQuarter(p, axis)
      n = rotateQuarter(n, axis)
    }
    steps++
  }
  return vec3ToFacelet(p, n)
}

/** CSS colors for sticker ids 0..5 (matches the 3D materials). */
export const STICKER_CSS = ['#f2f4f8', '#e53935', '#43a047', '#fdd835', '#fb8c00', '#1e88e5'] as const
