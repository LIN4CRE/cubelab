/** Real-data SVG stats over recorded solves. Empty states when no data. */
import { useMemo } from 'react'
import { useApp } from '../app/store'
import { averageOf, bestSingle, effectiveMs, formatDate, formatTime, mean } from '../app/stats'

const W = 560
const H = 220
const PAD = { l: 52, r: 12, t: 12, b: 24 }

export default function StatsPanel() {
  const solves = useApp((s) => s.solves)
  const setTab = useApp((s) => s.setTab)

  const eff = useMemo(() => solves.map((s) => ({ s, t: effectiveMs(s) })), [solves])
  const valid = useMemo(() => eff.filter((e) => e.t !== null), [eff])

  const ao5Series = useMemo(() => {
    const out: Array<number | null> = []
    for (let i = 0; i < solves.length; i++) {
      out.push(solves.length >= 0 && i >= 4 ? averageOf(solves.slice(0, i + 1), 5) : null)
    }
    return out
  }, [solves])

  if (solves.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-slate-100">Stats</h2>
        <p className="mt-1 text-sm text-slate-400">
          No solves recorded yet — everything here is computed from your real times, so there's
          nothing to show (and nothing made up). Record some solves in the Timer tab.
        </p>
        <button type="button" className="btn-primary mt-3" onClick={() => setTab('timer')}>
          Go to timer →
        </button>
      </div>
    )
  }

  const times = valid.map((e) => e.t as number)
  const lo = Math.min(...times)
  const hi = Math.max(...times)
  const span = Math.max(1, hi - lo)

  const x = (i: number): number => PAD.l + (i / Math.max(1, solves.length - 1)) * (W - PAD.l - PAD.r)
  const y = (t: number): number => PAD.t + (1 - (t - lo + span * 0.05) / (span * 1.1)) * (H - PAD.t - PAD.b)

  const singlePath = valid
    .map((e) => {
      const i = eff.indexOf(e)
      return `${i === eff.findIndex((v) => v.t !== null) ? 'M' : 'L'}${x(i).toFixed(1)},${y(e.t as number).toFixed(1)}`
    })
    .join(' ')
  const ao5Path = ao5Series
    .map((t, i) => (t === null ? null : `${x(i).toFixed(1)},${y(t).toFixed(1)}`))
    .filter(Boolean)
    .map((p, k) => `${k === 0 ? 'M' : 'L'}${p}`)
    .join(' ')

  // Histogram (10 bins over valid times).
  const bins = new Array<number>(10).fill(0)
  for (const t of times) {
    const b = Math.min(9, Math.floor(((t - lo) / Math.max(1e-9, span)) * 10))
    bins[b]++
  }
  const binMax = Math.max(...bins)

  const dnfs = solves.length - valid.length

  return (
    <div className="space-y-4">
      <section aria-label="Summary" className="card">
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-6">
          <Stat label="Solves" value={String(solves.length)} />
          <Stat label="Best" value={formatTime(bestSingle(solves))} />
          <Stat label="Mean" value={formatTime(times.length ? mean(times) : null)} />
          <Stat label="Current Ao5" value={formatTime(averageOf(solves, 5))} />
          <Stat label="Current Ao12" value={formatTime(averageOf(solves, 12))} />
          <Stat label="DNFs" value={String(dnfs)} />
        </div>
      </section>

      <section aria-label="Progress chart" className="card">
        <h3 className="mb-1 text-sm font-semibold text-slate-200">Singles & Ao5 over time</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Line chart of ${solves.length} solve times with best ${formatTime(bestSingle(solves))}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const t = hi - span * f
            const yy = y(t)
            return (
              <g key={f}>
                <line x1={PAD.l} y1={yy} x2={W - PAD.r} y2={yy} stroke="#1e2a45" strokeWidth="1" />
                <text x={PAD.l - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {formatTime(t)}
                </text>
              </g>
            )
          })}
          {[solves[0], solves[Math.floor(solves.length / 2)], solves[solves.length - 1]].map((s, k) => (
            <text
              key={k}
              x={x(k === 0 ? 0 : k === 1 ? Math.floor(solves.length / 2) : solves.length - 1)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {s ? formatDate(s.date) : ''}
            </text>
          ))}
          {singlePath && <path d={singlePath} fill="none" stroke="#22d3ee" strokeWidth="1.6" opacity="0.9" />}
          {ao5Path && <path d={ao5Path} fill="none" stroke="#fbbf24" strokeWidth="2" />}
          {valid.map((e) => {
            const i = eff.indexOf(e)
            return <circle key={i} cx={x(i)} cy={y(e.t as number)} r="2.4" fill="#22d3ee" />
          })}
        </svg>
        <p className="mt-1 flex gap-4 text-xs text-slate-500">
          <span><span className="mr-1 inline-block h-2 w-4 bg-cyan-400" /> Singles</span>
          <span><span className="mr-1 inline-block h-2 w-4 bg-amber-400" /> Ao5</span>
        </p>
      </section>

      <section aria-label="Distribution chart" className="card">
        <h3 className="mb-1 text-sm font-semibold text-slate-200">Time distribution</h3>
        <svg viewBox={`0 0 ${W} 140`} className="w-full" role="img" aria-label={`Histogram of solve times from ${formatTime(lo)} to ${formatTime(hi)}`}>
          {bins.map((count, i) => {
            const bw = (W - PAD.l - PAD.r) / 10
            const bh = count === 0 ? 0 : Math.max(2, (count / binMax) * 100)
            return (
              <g key={i}>
                <rect
                  x={PAD.l + i * bw + 2}
                  y={116 - bh}
                  width={bw - 4}
                  height={bh}
                  rx="2"
                  fill="#a78bfa"
                  opacity={count === 0 ? 0.15 : 0.85}
                />
                {count > 0 && (
                  <text x={PAD.l + i * bw + bw / 2} y={112 - bh} textAnchor="middle" fontSize="10" fill="#94a3b8">
                    {count}
                  </text>
                )}
              </g>
            )
          })}
          <text x={PAD.l} y={132} fontSize="10" fill="#64748b">{formatTime(lo)}</text>
          <text x={W - PAD.r} y={132} textAnchor="end" fontSize="10" fill="#64748b">{formatTime(hi)}</text>
        </svg>
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
