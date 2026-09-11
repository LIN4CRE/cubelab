import { useEffect } from 'react'
import { useApp, type TabId } from './app/store'
import SolveTab from './components/SolveTab'
import GuidePanel from './components/GuidePanel'
import LibraryPanel from './components/LibraryPanel'
import PracticePanel from './components/PracticePanel'
import TimerPanel from './components/TimerPanel'
import StatsPanel from './components/StatsPanel'
import SettingsPanel from './components/SettingsPanel'

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'solve', label: 'Solve', icon: '🧊' },
  { id: 'guide', label: 'Guide', icon: '📖' },
  { id: 'library', label: 'Algs', icon: '📚' },
  { id: 'practice', label: 'Drill', icon: '🎯' },
  { id: 'timer', label: 'Timer', icon: '⏱️' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'settings', label: 'Prefs', icon: '⚙️' },
]

export default function App() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const lightTheme = useApp((s) => s.settings.lightTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', lightTheme)
  }, [lightTheme])

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-3 pb-24 sm:px-4 md:pb-8">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-cyan-400 focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      <header className="flex items-center gap-3 py-3">
        <CubeLogo />
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-50">
            Cube<span className="text-cyan-300">Lab</span>
          </h1>
          <p className="text-xs text-slate-500">Solver · Trainer · Timer — offline-first</p>
        </div>
        <nav aria-label="Primary" className="ml-auto hidden gap-1 md:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-cyan-400/15 text-cyan-200'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span className="mr-1.5" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        {tab === 'solve' && <SolveTab />}
        {tab === 'guide' && <GuidePanel />}
        {tab === 'library' && <LibraryPanel />}
        {tab === 'practice' && <PracticePanel />}
        {tab === 'timer' && <TimerPanel />}
        {tab === 'stats' && <StatsPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>

      <footer className="mt-8 hidden text-center text-xs text-slate-600 md:block">
        CubeLab — free, offline-first, your data never leaves this device. Not affiliated with Rubik's®.
      </footer>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-7">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                tab === t.id ? 'text-cyan-300' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function CubeLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" role="img" aria-label="CubeLab logo">
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#0b1120" stroke="#22d3ee" strokeWidth="2" />
      <g>
        <rect x="9" y="9" width="9" height="9" rx="2" fill="#f2f4f8" />
        <rect x="19.5" y="9" width="9" height="9" rx="2" fill="#e53935" />
        <rect x="30" y="9" width="9" height="9" rx="2" fill="#43a047" />
        <rect x="9" y="19.5" width="9" height="9" rx="2" fill="#fb8c00" />
        <rect x="19.5" y="19.5" width="9" height="9" rx="2" fill="#22d3ee" />
        <rect x="30" y="19.5" width="9" height="9" rx="2" fill="#fdd835" />
        <rect x="9" y="30" width="9" height="9" rx="2" fill="#1e88e5" />
        <rect x="19.5" y="30" width="9" height="9" rx="2" fill="#a78bfa" />
        <rect x="30" y="30" width="9" height="9" rx="2" fill="#f2f4f8" />
      </g>
    </svg>
  )
}
