/**
 * Verified algorithm library types.
 *
 * Every algorithm in this library was mechanically verified against the cube
 * engine (see library.test.ts): exact resulting state, solvability
 * preservation, case coverage, and beginner-method completeness. Nothing here
 * is recalled from memory without a passing test pinning it down.
 */

export type AlgorithmCategory = 'pll' | 'oll' | 'beginner' | 'trigger'

export interface AlgorithmEntry {
  /** Stable id, e.g. 'pll-T', 'oll-sune', 'ins-right'. */
  id: string
  /** Display name, e.g. 'T perm', 'Sune'. */
  name: string
  category: AlgorithmCategory
  /** Verbatim Singmaster moves (face turns only). */
  moves: string
  /** Alternate verified moves for the same purpose (optional). */
  alternateMoves?: string
  /**
   * What you SEE when you need this algorithm, stated as verified structural
   * facts (fixed points, swap structure). The app renders the exact case
   * diagram alongside; this text never contradicts it.
   */
  recognition: string
  /** How to hold/align the cube before applying (verified angle). */
  angle: string
  /** Extra verified teaching notes. */
  notes?: string
  /** Related entry ids. */
  seeAlso?: string[]
}

export interface BeginnerStep {
  /** Step number (1-based). */
  step: number
  /** Short title, e.g. 'White cross'. */
  title: string
  /** Goal of the step. */
  goal: string
  /** Ordered rules to apply (each references library entries). */
  rules: BeginnerRule[]
}

export interface BeginnerRule {
  /** When this rule applies (recognition). */
  when: string
  /** What to do (may reference entry ids in [brackets] - resolved by the app). */
  action: string
  /** Library entry ids used by this rule. */
  uses: string[]
}
