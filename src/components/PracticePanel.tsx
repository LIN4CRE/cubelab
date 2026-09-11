import { useEffect, useMemo, useState } from 'react'
import {
  LIBRARY,
  algorithmState,
  caseState,
  getAlgorithm,
  type AlgorithmEntry,
} from '../algorithms'
import { applyMoveToFacelets, formatMove, parseAlgorithm, type Move } from '../cube'
import { useApp } from '../app/store'
import CubeNet from './CubeNet'
import MovePad from './MovePad'

export default function PracticePanel() {
  const practiceId = useApp((s) => s.practiceAlgorithmId)
  const setPracticeAlgorithm = useApp((s) => s.setPracticeAlgorithm)
  const recordPractice = useApp((s) => s.recordPractice)
  const record = useApp((s) => s.practice[practiceId])

  const entry: AlgorithmEntry = useMemo(() => getAlgorithm(practiceId), [practiceId])
  // Parse via the engine so drill expectations always match notation rules.
  const expected: Move[] = useMemo(() => parseAlgorithm(entry.moves), [entry])
  const start = useMemo(() => caseState(entry), [entry])

  const [position, setPosition] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [lastError, setLastError] = useState<{ got: Move; want: Move } | null>(null)
  const [hint, setHint] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- intentional drill reset
    setPosition(0)
    setMistakes(0)
    setLastError(null)
    setHint(false)
    setDone(false)
  }, [practiceId])

  const live = useMemo(() => {
    let s = start
    for (let i = 0; i < position; i++) s = applyMoveToFacelets(s, expected[i] as Move)
    return s
  }, [start, expected, position])

  const press = (move: Move) => {
    if (done) return
    const want = expected[position] as Move
    if (move.face === want.face && move.turns === want.turns) {
      const next = position + 1
      setPosition(next)
      setLastError(null)
      setHint(false)
      if (next === expected.length) {
        setDone(true)
        recordPractice(practiceId, mistakes, true)
      }
    } else {
      setMistakes((m) => m + 1)
      setLastError({ got: move, want })
    }
  }

  const reset = () => {
    setPosition(0)
    setMistakes(0)
    setLastError(null)
    setHint(false)
    setDone(false)
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="drill-pick" className="text-sm font-semibold text-slate-200">
            Drill
          </label>
          <select
            id="drill-pick"
            className="input max-w-xs"
            value={practiceId}
            onChange={(e) => setPracticeAlgorithm(e.target.value)}
          >
            {LIBRARY.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.moves.length} moves)
              </option>
            ))}
          </select>
          {record && (
            <span className="text-xs text-slate-500">
              {record.completions} completions · best streak {record.bestStreak}
            </span>
          )}
        </div>

        <p className="mt-3 font-mono text-sm leading-8 text-slate-200" aria-live="polite">
          {expected.map((m, i) => (
            <span
              key={i}
              className={
                i < position
                  ? 'text-mint'
                  : i === position
                    ? 'rounded bg-cyan-400/20 px-1 text-cyan-200'
                    : 'text-slate-500'
              }
            >
              {formatMove(m)}{' '}
            </span>
          ))}
        </p>

        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            Move {Math.min(position + 1, expected.length)} / {expected.length}
          </span>
          <span className="text-slate-400">Mistakes: {mistakes}</span>
          <button type="button" className="chip" onClick={() => setHint(true)}>
            Hint
          </button>
          <button type="button" className="chip" onClick={reset}>
            Restart
          </button>
        </div>

        {hint && !done && (
          <p className="mt-2 text-sm text-cyan-200" role="status">
            Next move: <strong className="font-mono">{formatMove(expected[position] as Move)}</strong>
          </p>
        )}
        {lastError && (
          <p className="mt-2 text-sm text-rose" role="alert">
            That was {formatMove(lastError.got)} — the drill wants{' '}
            {formatMove(lastError.want)} here. The cube has not advanced.
          </p>
        )}
        {done && (
          <p className="mt-2 text-sm text-mint" role="status">
            {mistakes === 0 ? 'Flawless run — nice!' : `Finished with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Your cube (after correct moves)</h3>
          <CubeNet facelets={live} compact />
        </div>
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Target</h3>
          <CubeNet facelets={algorithmState(entry)} compact />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Enter the next move</h3>
        <MovePad onMove={press} />
      </div>
    </div>
  )
}
