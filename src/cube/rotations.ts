/**
 * Whole-cube rotations as facelet permutations (for virtual re-grips).
 * Face turns alone can never move centres; these helpers reorient the cube
 * the way a human turning it in their hands would.
 */
import { CORNER_FACELETS, EDGE_FACELETS, faceOfFacelet } from './types'

/** Rotate 180 degrees about the R-L axis: U<->D, F<->B, R/L in place. */
export function rotateX2(facelets: readonly number[]): number[] {
  if (facelets.length !== 54) throw new Error('Need 54 facelets')
  const faceMap: Record<string, string> = { U: 'D', D: 'U', F: 'B', B: 'F', R: 'R', L: 'L' }
  // Cubie position images under x2 (about R-L axis).
  const cornerImage = [7, 6, 5, 4, 3, 2, 1, 0]
  const edgeImage = [4, 7, 6, 5, 0, 3, 2, 1, 11, 10, 9, 8]
  const out = new Array<number>(54).fill(-1)
  const place = (srcIdx: number[], dstIdx: readonly number[]): void => {
    for (const i of srcIdx) {
      const f = faceOfFacelet(i)
      const want = faceMap[f] as string
      const j = dstIdx.find((k) => faceOfFacelet(k) === want)
      if (j === undefined) throw new Error(`x2 sticker map failed for ${i}`)
      out[j] = facelets[i] as number
    }
  }
  for (let p = 0; p < 8; p++) {
    place(
      [...(CORNER_FACELETS[p] as readonly number[])],
      CORNER_FACELETS[cornerImage[p] as number] as readonly number[],
    )
  }
  for (let p = 0; p < 12; p++) {
    place(
      [...(EDGE_FACELETS[p] as readonly number[])],
      EDGE_FACELETS[edgeImage[p] as number] as readonly number[],
    )
  }
  // Centres: U<->D, F<->B, R/L fixed.
  out[31] = facelets[4] as number
  out[4] = facelets[31] as number
  out[49] = facelets[22] as number
  out[22] = facelets[49] as number
  out[13] = facelets[13] as number
  out[40] = facelets[40] as number
  if (out.some((v) => v === -1)) throw new Error('x2 left facelets unmapped')
  return out
}

/** Rotate 180 degrees about the U-D axis: F<->B, R<->L, U/D in place. */
export function rotateY2(facelets: readonly number[]): number[] {
  if (facelets.length !== 54) throw new Error('Need 54 facelets')
  const faceMap: Record<string, string> = { U: 'U', D: 'D', F: 'B', B: 'F', R: 'L', L: 'R' }
  const cornerImage = [2, 3, 0, 1, 6, 7, 4, 5]
  const edgeImage = [2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9]
  const out = new Array<number>(54).fill(-1)
  const place = (srcIdx: number[], dstIdx: readonly number[]): void => {
    for (const i of srcIdx) {
      const f = faceOfFacelet(i)
      const want = faceMap[f] as string
      const j = dstIdx.find((k) => faceOfFacelet(k) === want)
      if (j === undefined) throw new Error(`y2 sticker map failed for ${i}`)
      out[j] = facelets[i] as number
    }
  }
  for (let p = 0; p < 8; p++) {
    place(
      [...(CORNER_FACELETS[p] as readonly number[])],
      CORNER_FACELETS[cornerImage[p] as number] as readonly number[],
    )
  }
  for (let p = 0; p < 12; p++) {
    place(
      [...(EDGE_FACELETS[p] as readonly number[])],
      EDGE_FACELETS[edgeImage[p] as number] as readonly number[],
    )
  }
  out[4] = facelets[4] as number
  out[31] = facelets[31] as number
  out[49] = facelets[22] as number
  out[22] = facelets[49] as number
  out[40] = facelets[13] as number
  out[13] = facelets[40] as number
  if (out.some((v) => v === -1)) throw new Error('y2 left facelets unmapped')
  return out
}
