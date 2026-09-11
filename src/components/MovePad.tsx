/** 18-button Singmaster move pad (6 faces × clockwise/double/counter). */
import type { Face, Move } from '../cube/types'

const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_LABEL: Record<Face, string> = {
  U: 'top',
  R: 'right',
  F: 'front',
  D: 'bottom',
  L: 'left',
  B: 'back',
}

export default function MovePad({ onMove, disabled }: { onMove: (m: Move) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Move buttons">
      {FACES.map((face) => (
        <div key={face} className="flex flex-col gap-1" role="group" aria-label={`${FACE_LABEL[face]} face turns`}>
          <MoveBtn face={face} turns={1} onMove={onMove} disabled={disabled} />
          <MoveBtn face={face} turns={2} onMove={onMove} disabled={disabled} />
          <MoveBtn face={face} turns={3} onMove={onMove} disabled={disabled} />
        </div>
      ))}
    </div>
  )
}

function MoveBtn({
  face,
  turns,
  onMove,
  disabled,
}: {
  face: Face
  turns: 1 | 2 | 3
  onMove: (m: Move) => void
  disabled?: boolean
}) {
  const label = turns === 1 ? face : turns === 2 ? `${face}2` : `${face}'`
  const spoken =
    turns === 1
      ? `${FACE_LABEL[face]} clockwise`
      : turns === 2
        ? `${FACE_LABEL[face]} 180 degrees`
        : `${FACE_LABEL[face]} counter-clockwise`
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onMove({ face, turns })}
      aria-label={spoken}
      className="rounded-lg border border-edge bg-panel-2 py-1.5 font-mono text-sm text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  )
}
