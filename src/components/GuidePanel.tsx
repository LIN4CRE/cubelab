/** Searchable beginner-method guide (content comes from the verified library). */
import { useMemo, useState } from 'react'
import { BEGINNER_METHOD, getAlgorithm } from '../algorithms'
import { useApp } from '../app/store'

export default function GuidePanel() {
  const [query, setQuery] = useState('')
  const selectAlgorithm = useApp((s) => s.selectAlgorithm)

  const steps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BEGINNER_METHOD
    return BEGINNER_METHOD.map((step) => ({
      ...step,
      rules: step.rules.filter(
        (r) =>
          step.title.toLowerCase().includes(q) ||
          step.goal.toLowerCase().includes(q) ||
          r.when.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q),
      ),
    })).filter((s) => s.rules.length > 0)
  }, [query])

  const openEntry = (id: string): void => {
    try {
      getAlgorithm(id)
      selectAlgorithm(id, 'library')
    } catch {
      // Unknown id — ignore (content bug, never user error).
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-bold text-slate-100">Beginner's method — 7 steps</h2>
        <p className="mt-1 text-sm text-slate-400">
          White on the bottom, yellow on top, all the way through. Every rule below is mechanically
          proven: from any valid position in a step, following the rules reaches the next step. Tap a
          highlighted algorithm to see it in the library.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guide — e.g. “corners”, “parity”, “cross”…"
          aria-label="Search the guide"
          className="input mt-3"
        />
      </div>

      {steps.length === 0 && (
        <p className="card text-sm text-slate-400" role="status">
          Nothing matches “{query}”. Try “corner”, “edge”, “parity” or “cross”.
        </p>
      )}

      {steps.map((step) => (
        <section key={step.step} aria-label={`Step ${step.step}: ${step.title}`} className="card">
          <h3 className="font-semibold text-slate-100">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/15 text-sm text-cyan-300">
              {step.step}
            </span>
            {step.title}
          </h3>
          <p className="mt-1 text-sm text-slate-400">Goal: {step.goal}</p>
          <ul className="mt-2 space-y-2">
            {step.rules.map((rule, i) => (
              <li key={i} className="rounded-lg border border-edge bg-panel-2 p-2 text-sm">
                <p className="text-slate-200">
                  <strong className="text-amber-200/90">When:</strong> {rule.when}
                </p>
                <p className="mt-1 text-slate-300">
                  <strong className="text-mint">Do:</strong> <ActionText text={rule.action} onOpen={openEntry} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Renders [entry-id] references in rule text as buttons into the library. */
function ActionText({ text, onOpen }: { text: string; onOpen: (id: string) => void }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[([^\]]+)\]$/.exec(part)
        if (!m) return <span key={i}>{part}</span>
        const id = m[1] as string
        let name = id
        try {
          name = getAlgorithm(id).name
        } catch {
          return <span key={i}>{part}</span>
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(id)}
            className="rounded bg-cyan-400/15 px-1 font-medium text-cyan-300 hover:bg-cyan-400/25"
          >
            {name}
          </button>
        )
      })}
    </>
  )
}
