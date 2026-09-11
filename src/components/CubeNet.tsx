/**
 * 2D unfolded-cube editor / diagram. Real buttons (keyboard + screen-reader
 * operable) with arrow-key navigation across the net.
 */
import { useMemo, useRef } from 'react'
import { COLOR_NAMES, FACE_NAMES, type ColorId } from '../cube'
import { STICKER_CSS } from './cubeLayout'

interface CubeNetProps {
  facelets: readonly number[]
  /** When set, stickers are painted with this color on activation. */
  paintColor?: ColorId | null
  onPaint?: (index: number) => void
  highlight?: ReadonlySet<number>
  /** Compact diagram mode (smaller, no labels). */
  compact?: boolean
  label?: string
}

const FACES = ['U', 'L', 'F', 'R', 'B', 'D'] as const
// Net origin (grid row, col) per face in 3-sticker units.
const ORIGIN: Record<(typeof FACES)[number], [number, number]> = {
  U: [0, 1],
  L: [1, 0],
  F: [1, 1],
  R: [1, 2],
  B: [1, 3],
  D: [2, 1],
}
const FACE_INDEX: Record<(typeof FACES)[number], number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }

export default function CubeNet({ facelets, paintColor, onPaint, highlight, compact, label }: CubeNetProps) {
  const btnRefs = useRef(new Map<number, HTMLButtonElement>())
  const editable = onPaint !== undefined

  const coordToIndex = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of FACES) {
      const [or, oc] = ORIGIN[f]
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          map.set(`${or * 3 + r},${oc * 3 + c}`, FACE_INDEX[f] * 9 + r * 3 + c)
        }
      }
    }
    return map
  }, [])

  const indexToCoord = useMemo(() => {
    const map = new Map<number, [number, number]>()
    for (const [key, idx] of coordToIndex) {
      const [r, c] = key.split(',').map(Number) as [number, number]
      map.set(idx, [r, c])
    }
    return map
  }, [coordToIndex])

  const moveFocus = (index: number, dr: number, dc: number): void => {
    const coord = indexToCoord.get(index)
    if (!coord) return
    let [r, c] = coord
    for (let step = 0; step < 12; step++) {
      r += dr
      c += dc
      const next = coordToIndex.get(`${r},${c}`)
      if (next !== undefined) {
        btnRefs.current.get(next)?.focus()
        return
      }
    }
  }

  return (
    <div
      role={editable ? 'group' : 'img'}
      aria-label={label ?? (editable ? 'Cube sticker editor' : 'Cube diagram')}
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
    >
      {FACES.map((f) => {
        const [or, oc] = ORIGIN[f]
        return (
          <div
            key={f}
            className="contents"
            role={editable ? undefined : 'presentation'}
            aria-label={editable ? undefined : `${FACE_NAMES[f as 'U']} face`}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
              const r = Math.floor(k / 3)
              const c = k % 3
              const idx = FACE_INDEX[f] * 9 + k
              const color = facelets[idx] as number
              const hot = highlight?.has(idx) ?? false
              return (
                <button
                  key={idx}
                  ref={(el) => {
                    if (el) btnRefs.current.set(idx, el)
                    else btnRefs.current.delete(idx)
                  }}
                  type="button"
                  disabled={!editable}
                  onClick={() => onPaint?.(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(idx, -1, 0) }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(idx, 1, 0) }
                    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(idx, 0, -1) }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus(idx, 0, 1) }
                  }}
                  className="aspect-square w-full rounded-[4px] border border-black/50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-300 disabled:cursor-default"
                  style={{
                    gridRow: or * 3 + r + 1,
                    gridColumn: oc * 3 + c + 1,
                    backgroundColor: STICKER_CSS[color] ?? '#000',
                    boxShadow: hot ? '0 0 0 2px #fb7185, 0 0 10px #fb7185' : undefined,
                    opacity: editable && paintColor !== undefined && paintColor !== null ? 1 : undefined,
                    ...(compact ? { borderRadius: 2 } : {}),
                  }}
                  aria-label={
                    editable
                      ? `${FACE_NAMES[f as 'U']} face sticker row ${r + 1} column ${c + 1}, currently ${COLOR_NAMES[color as ColorId]}${hot ? ', flagged as a problem' : ''}. Activate to paint ${paintColor === null || paintColor === undefined ? '' : COLOR_NAMES[paintColor]}.`
                      : undefined
                  }
                  title={editable ? `${COLOR_NAMES[color as ColorId]}${hot ? ' — flagged' : ''}` : COLOR_NAMES[color as ColorId]}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
