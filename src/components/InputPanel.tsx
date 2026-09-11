/** Cube input: paint-by-hand, scramble text, 54-char paste, camera, random. */
import { useState } from 'react'
import {
  COLOR_NAMES,
  applyAlgorithmToFacelets,
  formatAlgorithm,
  generateScramble,
  isValidAlgorithm,
  randomFacelets,
  type ColorId,
} from '../cube'
import { solvedFacelets, useApp } from '../app/store'
import CameraScan from './CameraScan'
import CubeNet from './CubeNet'
import { STICKER_CSS } from './cubeLayout'

type InputTab = 'manual' | 'scramble' | 'paste' | 'camera' | 'random'

const TABS: Array<{ id: InputTab; label: string }> = [
  { id: 'manual', label: 'Paint' },
  { id: 'scramble', label: 'Scramble' },
  { id: 'paste', label: 'Paste' },
  { id: 'camera', label: 'Camera' },
  { id: 'random', label: 'Random' },
]

export default function InputPanel({ highlight }: { highlight: ReadonlySet<number> }) {
  const [tab, setTab] = useState<InputTab>('manual')
  const facelets = useApp((s) => s.facelets)
  const setFacelets = useApp((s) => s.setFacelets)
  const scrambleLength = useApp((s) => s.settings.scrambleLength)
  const [paint, setPaint] = useState<ColorId>(0)
  const [scrambleText, setScrambleText] = useState('')
  const [scrambleError, setScrambleError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  const applyPaint = (index: number): void => {
    const next = facelets.slice()
    next[index] = paint
    setFacelets(next)
  }

  const applyScramble = (text: string, base: number[]): void => {
    const trimmed = text.trim()
    if (!trimmed) {
      setScrambleError('Type some moves first, e.g. R U R\' U R U2 R\'')
      return
    }
    if (!isValidAlgorithm(trimmed)) {
      setScrambleError(
        'Those are not valid moves. Use faces U R F D L B with optional 2 or \' — e.g. R U R\' U\'',
      )
      return
    }
    setScrambleError(null)
    setFacelets(applyAlgorithmToFacelets(base, trimmed))
  }

  const applyPaste = (): void => {
    const t = pasteText.trim().toUpperCase()
    if (!/^[URFDLB]{54}$/.test(t)) {
      setPasteError(
        `Need exactly 54 letters U/R/F/D/L/B (you gave ${t.length}). Order: top face row by row, then right, front, bottom, left, back.`,
      )
      return
    }
    setPasteError(null)
    const map: Record<string, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }
    setFacelets(t.split('').map((ch) => map[ch] as number))
  }

  return (
    <section aria-label="Cube input" className="card">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Input methods">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`chip ${tab === t.id ? 'chip-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="mt-3">
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Paint color">
            {([0, 1, 2, 3, 4, 5] as ColorId[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPaint(c)}
                aria-label={`Paint ${COLOR_NAMES[c]}`}
                aria-pressed={paint === c}
                className={`aspect-square rounded-lg border-2 ${paint === c ? 'border-cyan-300' : 'border-transparent'}`}
                style={{ backgroundColor: STICKER_CSS[c] }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Pick a color, then tap stickers. Hold your cube with <strong>white on top, green in front</strong> and
            copy each face. Use <kbd>Tab</kbd> + <kbd>Enter</kbd> or arrow keys to paint by keyboard.
          </p>
          <div className="mx-auto mt-2 max-w-md">
            <CubeNet facelets={facelets} paintColor={paint} onPaint={applyPaint} highlight={highlight} label="Cube sticker editor. White top, green front." />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => setFacelets(solvedFacelets())}>
              Reset to solved
            </button>
          </div>
        </div>
      )}

      {tab === 'scramble' && (
        <div className="mt-3">
          <label htmlFor="scramble-input" className="text-sm text-slate-300">
            Scramble or moves in standard notation
          </label>
          <input
            id="scramble-input"
            value={scrambleText}
            onChange={(e) => setScrambleText(e.target.value)}
            placeholder="R U R' U R U2 R'"
            spellCheck={false}
            autoComplete="off"
            className="input mt-1 font-mono"
          />
          {scrambleError && (
            <p role="alert" className="mt-1 text-sm text-rose-300">{scrambleError}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => applyScramble(scrambleText, solvedFacelets())}>
              Apply to solved cube
            </button>
            <button type="button" className="btn" onClick={() => applyScramble(scrambleText, facelets)}>
              Apply to current cube
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const gen = formatAlgorithm(generateScramble(scrambleLength))
                setScrambleText(gen)
                applyScramble(gen, solvedFacelets())
              }}
            >
              New random scramble
            </button>
          </div>
        </div>
      )}

      {tab === 'paste' && (
        <div className="mt-3">
          <label htmlFor="paste-input" className="text-sm text-slate-300">
            54-letter facelet string (for copying states between apps)
          </label>
          <textarea
            id="paste-input"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
            className="input mt-1 font-mono text-xs break-all"
          />
          {pasteError && (
            <p role="alert" className="mt-1 text-sm text-rose-300">{pasteError}</p>
          )}
          <div className="mt-2">
            <button type="button" className="btn-primary" onClick={applyPaste}>
              Load this state
            </button>
          </div>
        </div>
      )}

      {tab === 'camera' && (
        <div className="mt-3">
          <CameraScan onDone={() => setTab('manual')} />
        </div>
      )}

      {tab === 'random' && (
        <div className="mt-3">
          <p className="text-sm text-slate-400">
            Generates a uniformly random, always-solvable cube state (mathematically random — not a
            fixed-length scramble).
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => setFacelets(randomFacelets())}>
            New random cube
          </button>
        </div>
      )}
    </section>
  )
}
