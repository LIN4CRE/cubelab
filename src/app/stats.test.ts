import { describe, expect, it } from 'vitest'
import { averageOf, bestSingle, effectiveMs, formatTime, type TimedSolve } from './stats'

const mk = (timeMs: number, penalty: TimedSolve['penalty'] = 'ok', id = ''): TimedSolve => ({
  id: id || `s${timeMs}${penalty}`,
  date: 0,
  scramble: '',
  timeMs,
  penalty,
})

describe('solve stats', () => {
  it('effective time applies +2 and DNF', () => {
    expect(effectiveMs(mk(10000))).toBe(10000)
    expect(effectiveMs(mk(10000, 'plus2'))).toBe(12000)
    expect(effectiveMs(mk(10000, 'dnf'))).toBeNull()
  })

  it('average of 5 drops best and worst', () => {
    const solves = [10000, 11000, 12000, 13000, 14000].map((t) => mk(t))
    expect(averageOf(solves, 5)).toBe(12000)
  })

  it('average needs a full window', () => {
    expect(averageOf([mk(1000), mk(2000)], 5)).toBeNull()
  })

  it('average with one DNF drops it plus best', () => {
    const solves = [mk(10000), mk(11000), mk(12000), mk(13000), mk(9999, 'dnf')]
    // Drops DNF (worst) and 10000 (best): mean(11000,12000,13000).
    expect(averageOf(solves, 5)).toBe(12000)
  })

  it('average with two DNFs is DNF', () => {
    const solves = [mk(10000), mk(11000), mk(12000), mk(1, 'dnf'), mk(2, 'dnf')]
    expect(averageOf(solves, 5)).toBeNull()
  })

  it('best single ignores DNF', () => {
    expect(bestSingle([mk(15000), mk(12000), mk(9000, 'dnf')])).toBe(12000)
    expect(bestSingle([mk(1, 'dnf')])).toBeNull()
  })

  it('formats times', () => {
    expect(formatTime(8340)).toBe('8.34')
    expect(formatTime(75430)).toBe('1:15.43')
    expect(formatTime(null)).toBe('DNF')
  })
})
