/** Solve tab: enter a cube, validate it, solve it, watch the 3D demo. */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  CubeState,
  applyMoveToFacelets,
  formatAlgorithm,
  validateCube,
  type Move,
} from '../cube'
import {
  solveBeginner,
  solveCube,
  type BeginnerSolution,
  type SolutionResult,
} from '../solver'
import { useApp } from '../app/store'
const Cube3D = lazy(() => import('./Cube3D'))
import CubeNet from './CubeNet'
import InputPanel from './InputPanel'
import MovePad from './MovePad'

type Solution =
  | { kind: 'kociemba'; result: SolutionResult; id: number }
  | { kind: 'beginner'; result: BeginnerSolution; id: number }

export default function SolveTab() {
  const facelets = useApp((s) => s.facelets)
  const setFacelets = useApp((s) => s.setFacelets)
  const solverChoice = useApp((s) => s.settings.solver)
  const updateSettings = useApp((s) => s.updateSettings)
  const showMetrics = useApp((s) => s.settings.showMetrics)
  const [solution, setSolution] = useState<Solution | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [solveError, setSolveError] = useState<string | null>(null)

  const validation = useMemo(() => validateCube(facelets), [facelets])
  const highlight = useMemo(
    () => new Set(validation.issues.flatMap((i) => i.facelets)),
    [validation],
  )
  const isSolved = useMemo(() => new CubeState(facelets).isSolved(), [facelets])

  // Any input change invalidates the previous solution.
  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- new input invalidates solution
    setSolution(null)
    setSolveError(null)
  }, [facelets])

  const runSolve = async (kind: 'kociemba' | 'beginner'): Promise<void> => {
    if (!validation.valid || busy) return
    setSolveError(null)
    setSolution(null)
    if (kind === 'kociemba') {
      setBusy('Solving with Kociemba two-phase (near-optimal)…')
      try {
        // Let the UI paint before the heavy search starts.
        await new Promise((r) => setTimeout(r, 30))
        const result = await solveCube(facelets)
        setSolution({ kind, result, id: Date.now() })
      } catch (err) {
        setSolveError(err instanceof Error ? err.message : 'Solver failed.')
      } finally {
        setBusy(null)
      }
    } else {
      setBusy('Solving step by step (building cross table on first run)…')
      try {
        await new Promise((r) => setTimeout(r, 30))
        const result = solveBeginner(facelets)
        setSolution({ kind, result, id: Date.now() })
      } catch (err) {
        setSolveError(err instanceof Error ? err.message : 'Beginner solver failed.')
      } finally {
        setBusy(null)
      }
    }
  }

  const solutionMoves: readonly Move[] = solution
    ? solution.kind === 'kociemba'
      ? solution.result.moves
      : solution.result.totalMoves
    : []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <InputPanel highlight={highlight} />

        <section aria-label="Validation" className="card">
          {validation.valid ? (
            <p className="text-sm text-mint" role="status">
              ✓ This is a valid, solvable cube{isSolved ? ' — it is already solved!' : '.'}
            </p>
          ) : (
            <div>
              <p className="text-sm font-semibold text-rose-300" role="alert">
                This cube can't exist — {validation.issues.length} problem{validation.issues.length === 1 ? '' : 's'} to fix
                (flagged on the grid):
              </p>
              <ul className="mt-2 space-y-2">
                {validation.issues.slice(0, 4).map((issue, i) => (
                  <li key={i} className="rounded-lg border border-rose-400/30 bg-rose-400/5 p-2 text-sm">
                    <strong className="text-rose-200">{issue.title}.</strong>{' '}
                    <span className="text-slate-300">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-label="Solver choice" className="card">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="Solver">
              <button
                type="button"
                onClick={() => updateSettings({ solver: 'kociemba' })}
                aria-pressed={solverChoice === 'kociemba'}
                className={`chip ${solverChoice === 'kociemba' ? 'chip-active' : ''}`}
              >
                Fast solve
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ solver: 'beginner' })}
                aria-pressed={solverChoice === 'beginner'}
                className={`chip ${solverChoice === 'beginner' ? 'chip-active' : ''}`}
              >
                Beginner steps
              </button>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!validation.valid || busy !== null || isSolved}
              onClick={() => runSolve(solverChoice)}
            >
              {busy ? 'Solving…' : isSolved ? 'Already solved ✓' : 'Solve this cube'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Fast solve: Kociemba two-phase, near-optimal (≤ 21 moves, never claimed optimal), runs in a
            background worker. Beginner steps: the full 7-step taught method with explanations.
          </p>
          {busy && (
            <p className="mt-2 text-sm text-cyan-300" role="status">
              {busy}
            </p>
          )}
          {solveError && (
            <p className="mt-2 text-sm text-rose-300" role="alert">
              {solveError}
            </p>
          )}
        </section>

        {solution?.kind === 'kociemba' && (
          <section aria-label="Solution" className="card">
            <h3 className="font-semibold text-slate-100">
              Solution — {solution.result.moves.length} moves
            </h3>
            <p className="mt-1 break-words font-mono text-sm leading-relaxed text-cyan-200">
              {solution.result.algorithm}
            </p>
            {showMetrics && (
              <p className="mt-1 text-xs text-slate-500">
                {solution.result.method} · {solution.result.htm} HTM · {solution.result.qtm} QTM ·{' '}
                {solution.result.durationMs < 1000
                  ? `${Math.round(solution.result.durationMs)} ms`
                  : `${(solution.result.durationMs / 1000).toFixed(1)} s`}{' '}
                · near-optimal, not proven optimal
              </p>
            )}
          </section>
        )}

        {solution?.kind === 'beginner' && (
          <section aria-label="Beginner solution" className="card">
            <h3 className="font-semibold text-slate-100">
              Beginner solution — {solution.result.totalMoves.length} moves in 7 stages
            </h3>
            <p className="mt-1 text-xs text-amber-200/90">🧭 {solution.result.holding}</p>
            <ol className="mt-2 space-y-2">
              {solution.result.steps.map((stage) => (
                <li key={stage.step} className="rounded-lg border border-edge bg-panel-2 p-2">
                  <p className="text-sm font-semibold text-slate-100">
                    {stage.step}. {stage.title}
                    <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                      {stage.moves.length} moves
                    </span>
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-slate-300">
                    {stage.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                  {stage.moves.length > 0 && (
                    <p className="mt-1 break-words font-mono text-[13px] text-cyan-200">
                      {formatAlgorithm(stage.moves)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="space-y-4">
        <section aria-label="3D preview" className="card">
          <Suspense fallback={<p className="py-8 text-center text-sm text-slate-500">Loading 3D&hellip;</p>}>
            <Cube3D
              facelets={facelets}
              moves={solutionMoves}
              resetKey={solution ? solution.id : 'input'}
              label={solution ? 'Solution demo' : 'Working cube'}
            />
          </Suspense>
          <div className="mx-auto mt-3 max-w-xs opacity-90">
            <CubeNet facelets={facelets} compact label="Working cube diagram" />
          </div>
        </section>

        <section aria-label="Turn the cube yourself" className="card">
          <h3 className="text-sm font-semibold text-slate-200">Turn it yourself</h3>
          <p className="mb-2 text-xs text-slate-500">
            Applies real turns to the cube above (clears any solution).
          </p>
          <MovePad onMove={(m: Move) => setFacelets(applyMoveToFacelets(facelets, m))} />
        </section>
      </div>
    </div>
  )
}
