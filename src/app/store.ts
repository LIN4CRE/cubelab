/**
 * Local-first app state (zustand + localStorage). Everything persists on
 * device; nothing ever leaves the browser.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyAlgorithmToFacelets } from '../cube'
import type { TimedSolve } from './stats'

export type SolverChoice = 'kociemba' | 'beginner'
export type TabId = 'solve' | 'guide' | 'library' | 'practice' | 'timer' | 'stats' | 'settings'

export interface PracticeRecord {
  algorithmId: string
  completions: number
  mistakes: number
  bestStreak: number
  lastPracticed: number
}

interface Settings {
  /** 3D playback speed multiplier. */
  speed: number
  /** Default solver for the Solve tab. */
  solver: SolverChoice
  /** Reduce non-essential motion. */
  reduceMotion: boolean
  /** Light theme (default is dark-first). */
  lightTheme: boolean
  /** Show move count / metrics under solutions. */
  showMetrics: boolean
  /** Scramble length for timer + demos. */
  scrambleLength: number
}

interface AppState {
  tab: TabId
  /** Working cube in the Solve tab (facelets). */
  facelets: number[]
  /** Currently selected library/guide entry id (shared deep-link). */
  selectedAlgorithmId: string | null
  /** Practice target algorithm id. */
  practiceAlgorithmId: string
  settings: Settings
  solves: TimedSolve[]
  practice: Record<string, PracticeRecord>

  setTab: (tab: TabId) => void
  setFacelets: (facelets: number[]) => void
  applyScrambleToWorking: (algorithm: string) => void
  selectAlgorithm: (id: string | null, tab?: TabId) => void
  setPracticeAlgorithm: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  addSolve: (solve: TimedSolve) => void
  updateSolve: (id: string, patch: Partial<TimedSolve>) => void
  deleteSolve: (id: string) => void
  clearSolves: () => void
  importSolves: (solves: TimedSolve[]) => void
  recordPractice: (algorithmId: string, mistakes: number, completed: boolean) => void
  resetAll: () => void
}

const SOLVED = (): number[] => {
  const out: number[] = []
  for (let f = 0; f < 6; f++) for (let k = 0; k < 9; k++) out.push(f)
  return out
}

const DEFAULT_SETTINGS: Settings = {
  speed: 1,
  solver: 'kociemba',
  reduceMotion: false,
  lightTheme: false,
  showMetrics: true,
  scrambleLength: 20,
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      tab: 'solve',
      facelets: SOLVED(),
      selectedAlgorithmId: null,
      practiceAlgorithmId: 'oll-sune',
      settings: DEFAULT_SETTINGS,
      solves: [],
      practice: {},

      setTab: (tab) => set({ tab }),
      setFacelets: (facelets) => set({ facelets: facelets.slice() }),
      applyScrambleToWorking: (algorithm) =>
        set((s) => {
          try {
            return { facelets: applyAlgorithmToFacelets(s.facelets, algorithm) }
          } catch {
            return s
          }
        }),
      selectAlgorithm: (id, tab) =>
        set((s) => ({ selectedAlgorithmId: id, tab: tab ?? s.tab })),
      setPracticeAlgorithm: (id) => set({ practiceAlgorithmId: id }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addSolve: (solve) => set((s) => ({ solves: [...s.solves, solve] })),
      updateSolve: (id, patch) =>
        set((s) => ({ solves: s.solves.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSolve: (id) => set((s) => ({ solves: s.solves.filter((x) => x.id !== id) })),
      clearSolves: () => set({ solves: [] }),
      importSolves: (solves) => set({ solves }),
      recordPractice: (algorithmId, mistakes, completed) =>
        set((s) => {
          const prev = s.practice[algorithmId] ?? {
            algorithmId,
            completions: 0,
            mistakes: 0,
            bestStreak: 0,
            lastPracticed: 0,
          }
          return {
            practice: {
              ...s.practice,
              [algorithmId]: {
                algorithmId,
                completions: prev.completions + (completed ? 1 : 0),
                mistakes: prev.mistakes + mistakes,
                bestStreak: completed && mistakes === 0 ? prev.bestStreak + 1 : 0,
                lastPracticed: Date.now(),
              },
            },
          }
        }),
      resetAll: () =>
        set({
          facelets: SOLVED(),
          settings: DEFAULT_SETTINGS,
          solves: [],
          practice: {},
          selectedAlgorithmId: null,
        }),
    }),
    {
      name: 'cubelab-state-v1',
      partialize: (s) => ({
        facelets: s.facelets,
        practiceAlgorithmId: s.practiceAlgorithmId,
        settings: s.settings,
        solves: s.solves.slice(-500),
        practice: s.practice,
      }),
    },
  ),
)

export function solvedFacelets(): number[] {
  return SOLVED()
}
