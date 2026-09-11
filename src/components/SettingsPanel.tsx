/** Settings + local data management (export / import / delete). */
import { useRef, useState } from 'react'
import { useApp } from '../app/store'
import type { TimedSolve } from '../app/stats'

export default function SettingsPanel() {
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const solves = useApp((s) => s.solves)
  const practice = useApp((s) => s.practice)
  const clearSolves = useApp((s) => s.clearSolves)
  const importSolves = useApp((s) => s.importSolves)
  const resetAll = useApp((s) => s.resetAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const exportData = (): void => {
    const blob = new Blob(
      [JSON.stringify({ app: 'cubelab', version: 1, solves, practice, settings }, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cubelab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Backup downloaded.')
  }

  const importData = (file: File): void => {
    file
      .text()
      .then((text) => {
        const data = JSON.parse(text) as {
          solves?: unknown
          settings?: Record<string, unknown>
        }
        if (!Array.isArray(data.solves)) throw new Error('no solves array')
        const clean: TimedSolve[] = []
        for (const s of data.solves as Array<Record<string, unknown>>) {
          if (
            typeof s.id === 'string' &&
            typeof s.date === 'number' &&
            typeof s.scramble === 'string' &&
            typeof s.timeMs === 'number' &&
            Number.isFinite(s.timeMs) &&
            s.timeMs >= 0 &&
            (s.penalty === 'ok' || s.penalty === 'plus2' || s.penalty === 'dnf')
          ) {
            clean.push({
              id: s.id,
              date: s.date,
              scramble: s.scramble,
              timeMs: s.timeMs,
              penalty: s.penalty,
            })
          }
        }
        importSolves(clean)
        if (data.settings && typeof data.settings === 'object') {
          const s = data.settings
          updateSettings({
            ...(typeof s.speed === 'number' ? { speed: s.speed } : {}),
            ...(s.solver === 'kociemba' || s.solver === 'beginner' ? { solver: s.solver } : {}),
            ...(typeof s.reduceMotion === 'boolean' ? { reduceMotion: s.reduceMotion } : {}),
            ...(typeof s.lightTheme === 'boolean' ? { lightTheme: s.lightTheme } : {}),
            ...(typeof s.showMetrics === 'boolean' ? { showMetrics: s.showMetrics } : {}),
            ...(typeof s.scrambleLength === 'number' ? { scrambleLength: Math.max(1, Math.min(100, Math.floor(s.scrambleLength))) } : {}),
          })
        }
        setNotice(`Imported ${clean.length} solves.`)
      })
      .catch(() => setNotice('Could not read that file — is it a CubeLab backup?'))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-label="Preferences" className="card space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Preferences</h2>
        <SettingRow
          label="3D playback speed"
          control={
            <select
              value={settings.speed}
              onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
              className="input w-auto"
              aria-label="3D playback speed"
            >
              {[0.25, 0.5, 1, 2, 4].map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>
          }
        />
        <SettingRow
          label="Default solver"
          control={
            <select
              value={settings.solver}
              onChange={(e) => updateSettings({ solver: e.target.value as 'kociemba' | 'beginner' })}
              className="input w-auto"
              aria-label="Default solver"
            >
              <option value="kociemba">Fast solve (Kociemba)</option>
              <option value="beginner">Beginner steps</option>
            </select>
          }
        />
        <SettingRow
          label="Scramble length"
          hint="Used for timer scrambles and demos."
          control={
            <input
              type="number"
              min={1}
              max={100}
              value={settings.scrambleLength}
              onChange={(e) =>
                updateSettings({ scrambleLength: Math.max(1, Math.min(100, Number(e.target.value) || 20)) })
              }
              className="input w-24"
              aria-label="Scramble length"
            />
          }
        />
        <ToggleRow
          label="Reduce motion"
          hint="3D turns snap instantly instead of animating."
          checked={settings.reduceMotion}
          onChange={(v) => updateSettings({ reduceMotion: v })}
        />
        <ToggleRow
          label="Light theme"
          hint="Dark-first by default."
          checked={settings.lightTheme}
          onChange={(v) => updateSettings({ lightTheme: v })}
        />
        <ToggleRow
          label="Show solver metrics"
          hint="HTM / QTM / solve time under solutions."
          checked={settings.showMetrics}
          onChange={(v) => updateSettings({ showMetrics: v })}
        />
      </section>

      <div className="space-y-4">
        <section aria-label="Your data" className="card">
          <h2 className="text-lg font-bold text-slate-100">Your data</h2>
          <p className="mt-1 text-sm text-slate-400">
            Everything lives in this browser only: {solves.length} solve{solves.length === 1 ? '' : 's'},{' '}
            practice records for {Object.keys(practice).length} algorithm{Object.keys(practice).length === 1 ? '' : 's'}.
            No account, no tracking, no uploads — works fully offline once installed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={exportData}>
              Export backup (JSON)
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              aria-label="Import backup file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importData(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Delete all solves? Practice records stay.')) {
                  clearSolves()
                  setNotice('All solves deleted.')
                }
              }}
            >
              Delete solves
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Reset everything (solves, practice, settings)? This cannot be undone.')) {
                  resetAll()
                  setNotice('Everything reset.')
                }
              }}
            >
              Reset everything
            </button>
          </div>
          {notice && (
            <p className="mt-2 text-sm text-cyan-300" role="status">{notice}</p>
          )}
        </section>

        <section aria-label="About" className="card">
          <h2 className="text-lg font-bold text-slate-100">About CubeLab</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>Fast solver: Kociemba two-phase via min2phase.js (MIT), in a background worker.</li>
            <li>Beginner solver: optimal cross table + the complete 7-step method, proven by 60+ tests.</li>
            <li>Algorithm library: every entry mechanically verified — exact states, real coverage proofs.</li>
            <li>3D: three.js. Free, offline-first, local-only. Source on GitHub.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function SettingRow({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      {control}
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-cyan-400' : 'bg-slate-600'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}
