/** Searchable verified algorithm library with case diagrams + 3D demos. */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  LIBRARY,
  algorithmState,
  byCategory,
  caseState,
  getAlgorithm,
  searchLibrary,
  type AlgorithmCategory,
  type AlgorithmEntry,
} from '../algorithms'
import { CubeState, parseAlgorithm } from '../cube'
import { useApp } from '../app/store'
const Cube3D = lazy(() => import('./Cube3D'))
import CubeNet from './CubeNet'

const CATEGORIES: Array<{ id: AlgorithmCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pll', label: 'PLL' },
  { id: 'oll', label: 'OLL' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'trigger', label: 'Triggers' },
]

export default function LibraryPanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<AlgorithmCategory | 'all'>('all')
  const selectedId = useApp((s) => s.selectedAlgorithmId)
  const selectAlgorithm = useApp((s) => s.selectAlgorithm)
  const setPracticeAlgorithm = useApp((s) => s.setPracticeAlgorithm)
  const setTab = useApp((s) => s.setTab)

  const results = useMemo(() => {
    const found = searchLibrary(query)
    return category === 'all' ? found : found.filter((e) => e.category === category)
  }, [query, category])

  const selected: AlgorithmEntry | null = useMemo(() => {
    if (selectedId) {
      try {
        return getAlgorithm(selectedId)
      } catch {
        return null
      }
    }
    return null
  }, [selectedId])

  useEffect(() => {
    if (!selected && results.length > 0 && !query) selectAlgorithm(results[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const demo = useMemo(() => {
    if (!selected) return null
    const moves = parseAlgorithm(selected.moves)
    return { from: caseState(selected), moves }
  }, [selected])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-3">
        <div className="card">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${LIBRARY.length} verified algorithms…`}
            aria-label="Search algorithms"
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Category filter">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`chip ${category === c.id ? 'chip-active' : ''}`}
              >
                {c.label}
                {c.id !== 'all' && (
                  <span className="ml-1 text-xs opacity-70">{byCategory(c.id).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1" aria-label="Algorithms">
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => selectAlgorithm(e.id)}
                aria-current={selected?.id === e.id}
                className={`w-full rounded-lg border p-2 text-left transition ${
                  selected?.id === e.id
                    ? 'border-cyan-400/60 bg-cyan-400/10'
                    : 'border-edge bg-panel hover:border-slate-500'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CategoryBadge category={e.category} />
                  <span className="font-semibold text-slate-100">{e.name}</span>
                </span>
                <span className="mt-0.5 block truncate font-mono text-xs text-slate-400">{e.moves}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="card text-sm text-slate-400" role="status">
              No algorithms match “{query}”.
            </li>
          )}
        </ul>
      </div>

      <div>
        {selected && demo ? (
          <EntryDetail
            entry={selected}
            demoFrom={demo.from}
            demoMoves={demo.moves}
            onPractice={() => {
              setPracticeAlgorithm(selected.id)
              setTab('practice')
            }}
          />
        ) : (
          <p className="card text-sm text-slate-400">Pick an algorithm to see details.</p>
        )}
      </div>
    </div>
  )
}

export function CategoryBadge({ category }: { category: AlgorithmCategory }) {
  const style: Record<AlgorithmCategory, string> = {
    pll: 'bg-violet-400/15 text-violet-300',
    oll: 'bg-amber-400/15 text-amber-300',
    beginner: 'bg-mint/15 text-mint',
    trigger: 'bg-cyan-400/15 text-cyan-300',
  }
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${style[category]}`}>
      {category}
    </span>
  )
}

function EntryDetail({
  entry,
  demoFrom,
  demoMoves,
  onPractice,
}: {
  entry: AlgorithmEntry
  demoFrom: number[]
  demoMoves: ReturnType<typeof parseAlgorithm>
  onPractice: () => void
}) {
  const selectAlgorithm = useApp((s) => s.selectAlgorithm)
  const doesState = useMemo(() => algorithmState(entry), [entry])
  const solvesCase = useMemo(
    () => new CubeState(demoFrom).afterMoves(demoMoves).isSolved(),
    [demoFrom, demoMoves],
  )
  return (
    <div className="space-y-3">
      <section aria-label={`${entry.name} details`} className="card">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={entry.category} />
          <h2 className="text-lg font-bold text-slate-100">{entry.name}</h2>
        </div>
        <p className="mt-2 break-words font-mono text-[15px] leading-relaxed text-cyan-200">{entry.moves}</p>
        {entry.alternateMoves && (
          <p className="mt-1 break-words font-mono text-sm text-slate-400">
            Alt: {entry.alternateMoves}
          </p>
        )}
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="font-semibold text-amber-200/90">Recognize it</dt>
            <dd className="text-slate-300">{entry.recognition}</dd>
          </div>
          <div>
            <dt className="font-semibold text-amber-200/90">Hold it</dt>
            <dd className="text-slate-300">{entry.angle}</dd>
          </div>
          {entry.notes && (
            <div>
              <dt className="font-semibold text-amber-200/90">Notes</dt>
              <dd className="text-slate-300">{entry.notes}</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-slate-500" role="status">
          {solvesCase
            ? '✓ Verified live: this algorithm solves the case shown below.'
            : 'Demo shows the case on the left and what the moves do on the right.'}
        </p>
        {entry.seeAlso && entry.seeAlso.length > 0 && (
          <p className="mt-2 text-sm text-slate-400">
            See also:{' '}
            {entry.seeAlso.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                <button
                  type="button"
                  className="text-cyan-300 underline"
                  onClick={() => selectAlgorithm(id)}
                >
                  {safeName(id)}
                </button>
              </span>
            ))}
          </p>
        )}
        <button type="button" className="btn-primary mt-3" onClick={onPractice}>
          Practice this algorithm →
        </button>
      </section>

      <section aria-label="Case diagrams" className="card">
        <div className="grid gap-3 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              When you need it
            </figcaption>
            <CubeNet facelets={demoFrom} compact label={`${entry.name} case diagram`} />
          </figure>
          <figure>
            <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              What the moves do (from solved)
            </figcaption>
            <CubeNet facelets={doesState} compact label={`${entry.name} effect diagram`} />
          </figure>
        </div>
      </section>

      <section aria-label="3D demo" className="card">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">3D demo — press play</h3>
        <Suspense fallback={<p className="py-8 text-center text-sm text-slate-500">Loading 3D&hellip;</p>}>
          <Cube3D facelets={demoFrom} moves={demoMoves} resetKey={entry.id} height={300} label={`${entry.name} demo`} />
        </Suspense>
      </section>
    </div>
  )
}

function safeName(id: string): string {
  try {
    return getAlgorithm(id).name
  } catch {
    return id
  }
}
