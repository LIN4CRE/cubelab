import type { AlgorithmEntry } from './types'

/**
 * 2-look OLL. Edge triggers and all 7 corner cases with face-turn-only
 * solutions. The T and Bowtie cases have no short single face-turn algorithm,
 * so they ship as verified Sune-combination sequences (mechanically proven to
 * solve their canonical patterns). Corner patterns below name the twisted
 * corners with yellow on top: URF (front-right), UFL (front-left),
 * ULB (back-left), UBR (back-right).
 */
export const OLL: AlgorithmEntry[] = [
  {
    id: 'oll-edge-L',
    name: 'OLL edges: L-shape',
    category: 'oll',
    moves: "F U R U' R' F'",
    recognition: 'Two adjacent yellow edges (L-shape), two edges missing.',
    angle: 'Hold the L with yellow arms pointing left and back (missing edges at UR and UF).',
    notes: 'Solves the L directly to the yellow cross. From the dot, this gives the line.',
  },
  {
    id: 'oll-edge-line',
    name: 'OLL edges: line',
    category: 'oll',
    moves: "F R U R' U' F'",
    recognition: 'Two opposite yellow edges (line), two edges missing.',
    angle: 'Hold the line pointing left-right (missing edges at UF and UB).',
    notes: 'Solves the line directly to the yellow cross. From the dot, this gives the L.',
  },
  {
    id: 'oll-sune',
    name: 'Sune',
    category: 'oll',
    moves: "R U R' U R U2 R'",
    recognition: 'Three corners twisted, UFL oriented (Sune fish).',
    angle: 'Oriented corner (UFL) at front-left.',
    notes: 'The most important OLL: core of the two-algorithm set (with Anti-Sune) that solves all seven corner cases.',
    seeAlso: ['oll-antisune', 'oll-T', 'oll-bowtie'],
  },
  {
    id: 'oll-antisune',
    name: 'Anti-Sune',
    category: 'oll',
    moves: "R U2 R' U' R U' R'",
    recognition: 'Three corners twisted, UBR oriented (anti-fish).',
    angle: 'Oriented corner (UBR) at back-right.',
    seeAlso: ['oll-sune'],
  },
  {
    id: 'oll-pi',
    name: 'Pi (Bruisers)',
    category: 'oll',
    moves: "R U2 R2 U' R2 U' R2 U2 R",
    alternateMoves: "U2 R U R' U R U2 R' U' R U R' U R U2 R'",
    recognition: 'All four corners twisted (symmetric Pi pattern).',
    angle: 'Symmetric: any angle, then match the diagram.',
    notes: 'Alternate is a verified Sune-only sequence (for the two-algorithm OLL set).',
  },
  {
    id: 'oll-U',
    name: 'Headlights (U)',
    category: 'oll',
    moves: "R2 D R' U2 R D' R' U2 R'",
    alternateMoves: "U R U2 R' U' R U' R' U' R U R' U R U2 R'",
    recognition: 'Back pair twisted (ULB + UBR), front pair oriented.',
    angle: 'Twisted pair (headlights) at the back.',
    notes: 'Alternate is a verified Sune-only sequence (for the two-algorithm OLL set).',
  },
  {
    id: 'oll-H',
    name: 'H (Double headlights)',
    category: 'oll',
    moves: "R U R' U R U' R' U R U2 R'",
    alternateMoves: "R U R' U R U2 R' R U R' U R U2 R'",
    recognition: 'All four corners twisted (H pattern: opposite pairs twist opposite ways).',
    angle: 'Symmetric: any angle, then match the diagram.',
    notes: 'Alternate is just Sune twice (verified).',
  },
  {
    id: 'oll-T',
    name: 'Chameleon (T)',
    category: 'oll',
    moves: "R U2 R' U' R U' R' U R U R' U R U2 R'",
    recognition: 'Two adjacent corners twisted (back pair ULB + UBR, chameleon twist).',
    angle: 'Twisted pair at the back.',
    notes: 'Verified Anti-Sune + U + Sune combination (the standard single algorithms use wide moves).',
    seeAlso: ['oll-sune', 'oll-antisune'],
  },
  {
    id: 'oll-bowtie',
    name: 'Bowtie (L)',
    category: 'oll',
    moves: "R U R' U R U2 R' U2 R U2 R' U' R U' R'",
    recognition: 'Two diagonal corners twisted (UFL + UBR).',
    angle: 'Twisted diagonal UFL with UBR (front-left and back-right).',
    notes: 'Verified Sune + U2 + Anti-Sune combination. No short single face-turn algorithm exists for this case.',
    seeAlso: ['oll-sune', 'oll-antisune'],
  },
]
