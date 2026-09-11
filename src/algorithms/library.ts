import { CubeState, invertAlgorithm, parseAlgorithm } from '../cube/index'
import { PLL } from './pll'
import { OLL } from './oll'
import { INSERTS } from './inserts'
import type { AlgorithmCategory, AlgorithmEntry } from './types'

/** The full verified library: 21 PLL + 9 OLL + 6 beginner inserts + 2 triggers. */
export const LIBRARY: AlgorithmEntry[] = [...PLL, ...OLL, ...INSERTS]

const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]))

/** Look up a library entry by id. Throws on unknown id (content bug). */
export function getAlgorithm(id: string): AlgorithmEntry {
  const entry = BY_ID.get(id)
  if (!entry) throw new Error(`Unknown algorithm id: ${id}`)
  return entry
}

/** All entries in a category. */
export function byCategory(category: AlgorithmCategory): AlgorithmEntry[] {
  return LIBRARY.filter((e) => e.category === category)
}

/**
 * Search the library by name, id, moves, recognition, or notes.
 * Case-insensitive substring match; empty query returns everything.
 */
export function searchLibrary(query: string): AlgorithmEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...LIBRARY]
  return LIBRARY.filter((e) =>
    [e.id, e.name, e.moves, e.alternateMoves ?? '', e.recognition, e.angle, e.notes ?? '']
      .join('\n')
      .toLowerCase()
      .includes(q),
  )
}

/**
 * The case state: what the cube looks like (from solved) when this algorithm
 * is needed. Computed as the inverse applied to solved, so diagrams always
 * match the algorithm exactly.
 */
export function caseState(entry: AlgorithmEntry): number[] {
  const moves = parseAlgorithm(entry.moves)
  return new CubeState(CubeState.solved().facelets).afterMoves(invertAlgorithm(moves)).facelets
}

/** The algorithm applied to solved (what it does). */
export function algorithmState(entry: AlgorithmEntry): number[] {
  return new CubeState(CubeState.solved().facelets).afterMoves(parseAlgorithm(entry.moves)).facelets
}
