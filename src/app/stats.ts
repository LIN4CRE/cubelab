/** Pure helpers for solve-time statistics. Tested in stats.test.ts. */

export type Penalty = 'ok' | 'plus2' | 'dnf'

export interface TimedSolve {
  id: string
  date: number
  /** Scramble in Singmaster notation. */
  scramble: string
  /** Raw measured time in milliseconds. */
  timeMs: number
  penalty: Penalty
}

/** Effective time in ms, or null for DNF. */
export function effectiveMs(solve: TimedSolve): number | null {
  if (solve.penalty === 'dnf') return null
  return solve.timeMs + (solve.penalty === 'plus2' ? 2000 : 0)
}

/**
 * WCA-style average of `n` over the most recent solves: drop best & worst,
 * DNF-robust (more than one DNF, or any DNF when n<=3... standard: average
 * is DNF if 2+ DNFs among the n). Returns null when fewer than n solves.
 */
export function averageOf(solves: readonly TimedSolve[], n: number): number | null {
  if (solves.length < n || n < 3) return null
  const window = solves.slice(-n).map(effectiveMs)
  const dnfs = window.filter((t) => t === null).length
  if (dnfs > 1) return null
  const ordered = (window.filter((t) => t !== null) as number[]).sort((a, b) => a - b)
  if (dnfs === 1) {
    // Drop the DNF (worst) and the best.
    ordered.shift()
    return mean(ordered)
  }
  ordered.shift()
  ordered.pop()
  return mean(ordered)
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function bestSingle(solves: readonly TimedSolve[]): number | null {
  let best: number | null = null
  for (const s of solves) {
    const t = effectiveMs(s)
    if (t !== null && (best === null || t < best)) best = t
  }
  return best
}

/** Format ms as M:SS.cs (centiseconds), e.g. 1:23.45. */
export function formatTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return 'DNF'
  const total = Math.max(0, Math.round(ms / 10))
  const cs = total % 100
  const secs = Math.floor(total / 100)
  const s = secs % 60
  const m = Math.floor(secs / 60)
  const pad = (v: number, w = 2): string => String(v).padStart(w, '0')
  return m > 0 ? `${m}:${pad(s)}.${pad(cs)}` : `${s}.${pad(cs)}`
}

/** Compact date label for charts. */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
