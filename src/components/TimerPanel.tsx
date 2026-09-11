/**
 * Speedcubing timer: hold Space (or press-and-hold the pad) to arm, release
 * to start, press again to stop. Casual timer — no inspection countdown.
 * Ao5 / Ao12 / Ao50, session history with +2 / DNF, all stored on-device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatAlgorithm, generateScramble } from '../cube'
import { useApp } from '../app/store'
import { averageOf, bestSingle, effectiveMs, formatTime, mean, type TimedSolve } from '../app/stats'

type Phase = 'idle' | 'arming' | 'armed' | 'running'

export default function TimerPanel() {
  const solves = useApp((s) => s.solves)
  const addSolve = useApp((s) => s.addSolve)
  const updateSolve = useApp((s) => s.updateSolve)
  const deleteSolve = useApp((s) => s.deleteSolve)
  const clearSolves = useApp((s) => s.clearSolves)
  const scrambleLength = useApp((s) => s.settings.scrambleLength)
  const setTab = useApp((s) => s.setTab)

  const [scramble, setScramble] = useState(() => formatAlgorithm(generateScramble(scrambleLength)))
  const [phase, setPhase] = useState<Phase>('idle')
  const [displayMs, setDisplayMs] = useState(0)
  const startRef = useRef(0)
  const armTimer = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('idle')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const newScramble = useCallback(() => {
    setScramble(formatAlgorithm(generateScramble(scrambleLength)))
  }, [scrambleLength])

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- regen when length setting changes
    newScramble()
  }, [newScramble])

  const stop = useCallback(() => {
    if (phaseRef.current !== 'running') return
    const elapsed = performance.now() - startRef.current
    setDisplayMs(elapsed)
    setPhase('idle')
    addSolve({
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      date: Date.now(),
      scramble,
      timeMs: Math.round(elapsed / 10) * 10,
      penalty: 'ok',
    })
    newScramble()
  }, [addSolve, newScramble, scramble])

  const pressDown = useCallback(() => {
    if (phaseRef.current === 'running') {
      stop()
      return
    }
    if (phaseRef.current !== 'idle') return
    setPhase('arming')
    setDisplayMs(0)
    armTimer.current = window.setTimeout(() => {
      if (phaseRef.current === 'arming') setPhase('armed')
    }, 500)
  }, [stop])

  const pressUp = useCallback(() => {
    if (armTimer.current !== null) {
      window.clearTimeout(armTimer.current)
      armTimer.current = null
    }
    if (phaseRef.current === 'armed') {
      startRef.current = performance.now()
      setPhase('running')
    } else if (phaseRef.current === 'arming') {
      setPhase('idle') // released too early — not armed
    }
  }, [])

  // Space-bar control (ignored while typing).
  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (e.code !== 'Space' || e.repeat) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      e.preventDefault()
      pressDown()
    }
    const up = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      e.preventDefault()
      pressUp()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [pressDown, pressUp])

  // Live ticking while running.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => setDisplayMs(performance.now() - startRef.current), 31)
    return () => window.clearInterval(id)
  }, [phase])

  const stats = useMemo(() => {
    const eff = solves.map(effectiveMs).filter((t): t is number => t !== null)
    return {
      count: solves.length,
      best: bestSingle(solves),
      mean: eff.length > 0 ? mean(eff) : null,
      ao5: averageOf(solves, 5),
      ao12: averageOf(solves, 12),
      ao50: averageOf(solves, 50),
    }
  }, [solves])

  const padColor =
    phase === 'armed'
      ? 'border-mint text-mint'
      : phase === 'arming'
        ? 'border-rose-400 text-rose-300'
        : phase === 'running'
          ? 'border-cyan-300 text-cyan-200'
          : 'border-edge text-slate-100'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <section aria-label="Current scramble" className="card">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-sm leading-relaxed text-slate-200">{scramble}</p>
            <button type="button" className="btn shrink-0" onClick={newScramble} aria-label="New scramble">
              ↻
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            WCA-style scramble ({scrambleLength} moves — length in Settings). Casual timer, no inspection countdown.
          </p>
        </section>

        <section aria-label="Timer" className="card">
          <button
            type="button"
            className={`flex w-full touch-none select-none flex-col items-center rounded-xl border-2 py-10 ${padColor}`}
            onPointerDown={(e) => {
              e.preventDefault()
              pressDown()
            }}
            onPointerUp={pressUp}
            onPointerLeave={() => {
              if (phaseRef.current === 'arming') pressUp()
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={
              phase === 'running'
                ? `Timer running: ${formatTime(displayMs)}. Activate to stop.`
                : 'Timer pad. Press and hold to arm, release to start.'
            }
          >
            <span className="font-mono text-6xl font-bold tabular-nums" aria-live="off">
              {formatTime(displayMs)}
            </span>
            <span className="mt-2 text-sm opacity-80">
              {phase === 'running'
                ? 'Solving… press Space or tap to stop'
                : phase === 'armed'
                  ? 'Release to start!'
                  : phase === 'arming'
                    ? 'Hold…'
                    : 'Hold Space (or press & hold here) to arm, release to start'}
            </span>
          </button>
          <p className="mt-2 text-center text-xs text-slate-500" role="status">
            {solves.length === 0
              ? 'No solves yet — your times will appear below and in Stats.'
              : `Last: ${formatTime(effectiveMs(solves[solves.length - 1] as TimedSolve))}`}
          </p>
        </section>

        <section aria-label="Session stats" className="card">
          <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            <Stat label="Solves" value={String(stats.count)} />
            <Stat label="Best" value={formatTime(stats.best)} />
            <Stat label="Mean" value={formatTime(stats.mean)} />
            <Stat label="Ao5" value={formatTime(stats.ao5)} />
            <Stat label="Ao12" value={formatTime(stats.ao12)} />
            <Stat label="Ao50" value={formatTime(stats.ao50)} />
          </div>
          <button type="button" className="btn mt-3" onClick={() => setTab('stats')}>
            Open full stats →
          </button>
        </section>
      </div>

      <section aria-label="Solve history" className="card h-fit">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">History</h3>
          {solves.length > 0 && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Delete all recorded solves? This cannot be undone.')) clearSolves()
              }}
            >
              Clear all
            </button>
          )}
        </div>
        {solves.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing here yet.</p>
        ) : (
          <ol className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
            {[...solves].reverse().map((s, rev) => {
              const num = solves.length - rev
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-edge bg-panel-2 px-2 py-1.5 text-sm"
                >
                  <span className="w-8 shrink-0 text-xs text-slate-500">{num}</span>
                  <span className={`font-mono font-semibold ${s.penalty === 'dnf' ? 'text-rose-300 line-through' : 'text-slate-100'}`}>
                    {formatTime(effectiveMs(s))}
                    {s.penalty === 'plus2' && <span className="text-amber-300"> +2</span>}
                  </span>
                  <span className="hidden truncate font-mono text-[11px] text-slate-500 md:inline" title={s.scramble}>
                    {s.scramble}
                  </span>
                  <span className="ml-auto flex shrink-0 gap-1">
                    <MiniBtn
                      label="+2"
                      title="Toggle +2 penalty"
                      active={s.penalty === 'plus2'}
                      onClick={() => updateSolve(s.id, { penalty: s.penalty === 'plus2' ? 'ok' : 'plus2' })}
                    />
                    <MiniBtn
                      label="DNF"
                      title="Toggle DNF"
                      active={s.penalty === 'dnf'}
                      onClick={() => updateSolve(s.id, { penalty: s.penalty === 'dnf' ? 'ok' : 'dnf' })}
                    />
                    <MiniBtn label="✕" title="Delete solve" onClick={() => deleteSolve(s.id)} danger />
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-panel-2 px-1 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-mono text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}

function MiniBtn({
  label,
  title,
  onClick,
  active,
  danger,
}: {
  label: string
  title: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
        active
          ? 'border-amber-300/60 bg-amber-300/15 text-amber-200'
          : danger
            ? 'border-edge text-slate-500 hover:border-rose-400/60 hover:text-rose-300'
            : 'border-edge text-slate-400 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  )
}
