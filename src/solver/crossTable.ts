/**
 * Optimal white-cross solver via a breadth-first pattern table.
 *
 * Only the four D-colour edges (relative cubies DR=4, DF=5, DL=6, DB=7)
 * are tracked. Goal: each home (cubie == pos) with orientation 0.
 * BFS from the goal over the 18 face turns gives an optimal (shortest) cross
 * for every reachable cross pattern. The table is built lazily once (~190k
 * entries) and shared by all solves.
 */
import { CubeState, parseAlgorithm } from '../cube/index'
import type { Move } from '../cube/types'

const CROSS_CUBIES = [4, 5, 6, 7] as const
/** Goal position for each white edge cubie: cubie i belongs at D-slot i + 4. */
const GOAL_POS = [4, 5, 6, 7] as const

const MOVE_NAMES = [
  'U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2',
  'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2',
] as const


function buildEdgeTable(): Array<Array<readonly [number, number]>> {
  const table: Array<Array<readonly [number, number]>> = []
  for (const name of MOVE_NAMES) {
    const move = parseAlgorithm(name)[0] as Move
    const row: Array<readonly [number, number]> = []
    // Probe: solved cube + move sends cubie p to (q, flip).
    const state = new CubeState().afterMoves([move])
    const cub = state.toCubies()
    if (!cub) throw new Error('Cubie read failed during cross table build')
    for (let p = 0; p < 12; p++) {
      const at = cub.edges.findIndex((e) => e.cubie === p)
      row.push([at, cub.edges[at]?.orientation ?? 0] as const)
    }
    table.push(row)
  }
  return table
}

/** Pack (positions of cubies 0-3, orientations) into a single key. */
function packKey(pos: readonly number[], ori: readonly number[]): number {
  const p = (((pos[0] as number) * 12 + (pos[1] as number)) * 12 + (pos[2] as number)) * 12 + (pos[3] as number)
  const o = ((ori[0] as number) * 8 + (ori[1] as number) * 4 + (ori[2] as number) * 2 + (ori[3] as number))
  return p * 16 + o
}

interface TableEntry {
  prev: number
  move: number
}

let crossTable: Map<number, TableEntry> | null = null

function goalKey(): number {
  return packKey(GOAL_POS as unknown as number[], [0, 0, 0, 0])
}

/**
 * Build (once) the BFS table from the cross goal. Returns entry count.
 * Consecutive same-face moves are pruned (they can never be optimal).
 */
export function initCrossTable(): number {
  if (crossTable) return crossTable.size
  const table = buildEdgeTable()
  const visited = new Map<number, TableEntry>()
  const goal = goalKey()
  visited.set(goal, { prev: -1, move: -1 })
  // BFS layers as arrays of [key, pos0..3, ori0..3, lastFace].
  let layer: number[][] = [[goal, ...GOAL_POS, 0, 0, 0, 0, -1]]
  const faces = MOVE_NAMES.map((m) => m[0] as string)
  while (layer.length > 0) {
    const next: number[][] = []
    for (const node of layer) {
      const key = node[0] as number
      const lastFace = node[9] as number
      for (let mi = 0; mi < 18; mi++) {
        if (faces[mi] === faces[lastFace]) continue
        const row = table[mi] as Array<readonly [number, number]>
        const np: number[] = [0, 0, 0, 0]
        const no: number[] = [0, 0, 0, 0]
        for (let c = 0; c < 4; c++) {
          const [q, f] = row[node[1 + c] as number] as readonly [number, number]
          np[c] = q
          no[c] = ((node[5 + c] as number) + f) % 2
        }
        const nk = packKey(np, no)
        if (!visited.has(nk)) {
          visited.set(nk, { prev: key, move: mi })
          next.push([nk, ...np, ...no, mi])
        }
      }
    }
    layer = next
  }
  crossTable = visited
  return visited.size
}

function invertMoveName(name: string): string {
  if (name.endsWith('2')) return name
  if (name.endsWith("'")) return name.slice(0, -1)
  return `${name}'`
}

/**
 * Optimal cross moves for a cube state. Reads the D-colour-edge pattern
 * from facelets and walks the BFS table back to the goal (inverting each
 * step). Throws if the pattern is unreachable (not a valid cross pattern).
 */
export function solveCross(facelets: readonly number[]): Move[] {
  const size = initCrossTable()
  if (!crossTable || size === 0) throw new Error('Cross table failed to build')
  const cub = new CubeState(facelets as number[]).toCubies()
  if (!cub) throw new Error('Cannot read cubies (rotated centers?)')
  const pos: number[] = [0, 0, 0, 0]
  const ori: number[] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const at = cub.edges.findIndex((e) => e.cubie === (CROSS_CUBIES[c] as number))
    pos[c] = at
    ori[c] = cub.edges[at]?.orientation ?? 0
  }
  let key = packKey(pos, ori)
  const goal = goalKey()
  const names: string[] = []
  let guard = 100
  while (key !== goal && guard-- > 0) {
    const entry = crossTable.get(key)
    if (!entry || entry.prev === -1) throw new Error('Unreachable cross pattern (invalid cube?)')
    names.push(invertMoveName(MOVE_NAMES[entry.move] as string))
    key = entry.prev
  }
  if (key !== goal) throw new Error('Cross lookup did not converge')
  // names[] is already in apply order (undo the last forward step first).
  return parseAlgorithm(names.join(' '))
}

/** True once the lazy table has been built. */
export function isCrossTableReady(): boolean {
  return crossTable !== null
}


