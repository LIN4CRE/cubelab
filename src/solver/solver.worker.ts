/**
 * Solver Web Worker: runs the Kociemba engine off the main thread so the UI
 * stays responsive during table initialization and searches.
 */
import min2phase from 'min2phase.js'
import { CubeState, formatAlgorithm, invertAlgorithm, moveMetrics, parseAlgorithm } from '../cube/index'

interface SolveRequest {
  id: number
  type: 'init' | 'solve' | 'random-state'
  facelets?: number[]
}

interface WorkerResponse {
  id: number
  type: 'ready' | 'solution' | 'random-state' | 'error'
  algorithm?: string
  moves?: { face: string; turns: number }[]
  htm?: number
  qtm?: number
  durationMs?: number
  facelets?: number[]
  scramble?: string
  code?: string
  message?: string
}

const post = (msg: WorkerResponse) => {
  ;(self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(msg)
}

let initialized = false

function ensureInit(): void {
  if (!initialized) {
    min2phase.initFull()
    initialized = true
  }
}

function solveFacelets(facelets: number[]): { algorithm: string } {
  ensureInit()
  const faceletString = new CubeState(facelets).toFaceletString()
  const raw = min2phase.solve(faceletString).trim().replace(/\s+/g, ' ')
  if (raw.startsWith('Error')) {
    throw new Error(raw)
  }
  const moves = raw === '' ? [] : parseAlgorithm(raw)
  return { algorithm: formatAlgorithm(moves) }
}

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const req = event.data
  try {
    if (req.type === 'init') {
      ensureInit()
      post({ id: req.id, type: 'ready' })
      return
    }
    if (req.type === 'solve') {
      if (!req.facelets || req.facelets.length !== 54) {
        throw new Error('Worker received an incomplete cube.')
      }
      const started = performance.now()
      const { algorithm } = solveFacelets(req.facelets)
      const moves = algorithm === '' ? [] : parseAlgorithm(algorithm)
      const metrics = moveMetrics(moves)
      post({
        id: req.id,
        type: 'solution',
        algorithm,
        moves: moves.map((m) => ({ face: m.face, turns: m.turns })),
        htm: metrics.htm,
        qtm: metrics.qtm,
        durationMs: performance.now() - started,
      })
      return
    }
    if (req.type === 'random-state') {
      ensureInit()
      const faceletString = min2phase.randomCube()
      const solution = min2phase.solve(faceletString).trim().replace(/\s+/g, ' ')
      if (solution.startsWith('Error')) throw new Error(solution)
      const solutionMoves = solution === '' ? [] : parseAlgorithm(solution)
      const scramble = formatAlgorithm(invertAlgorithm(solutionMoves))
      const facelets = CubeState.fromFaceletString(faceletString).facelets
      post({ id: req.id, type: 'random-state', facelets, scramble })
      return
    }
  } catch (err) {
    post({
      id: req.id,
      type: 'error',
      code: 'solver-failed',
      message: err instanceof Error ? err.message : 'Solver worker failed.',
    })
  }
}
