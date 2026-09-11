import type { AlgorithmEntry } from './types'

/**
 * Beginner inserts, middle-layer inserts, and essential triggers.
 * All completeness claims (every white-corner state, every middle edge state)
 * are mechanically proven in library.test.ts.
 */
export const INSERTS: AlgorithmEntry[] = [
  {
    id: 'ins-FR-right',
    name: 'Front-right insert (white on right)',
    category: 'beginner',
    moves: "R U R'",
    recognition: 'White corner above the front-right slot with white facing right.',
    angle: 'Corner above its slot (front-right), white on the right.',
    notes: 'Also the pop-out move: from white-on-top, do this twice, then insert normally.',
    seeAlso: ['ins-FR-front'],
  },
  {
    id: 'ins-FR-front',
    name: 'Front-right insert (white in front)',
    category: 'beginner',
    moves: "F' U' F",
    recognition: 'White corner above the front-right slot with white facing front.',
    angle: 'Corner above its slot (front-right), white in front.',
    seeAlso: ['ins-FR-right'],
  },
  {
    id: 'ins-FL-left',
    name: 'Front-left insert (white on left)',
    category: 'beginner',
    moves: "L' U' L",
    recognition: 'White corner above the front-left slot with white facing left.',
    angle: 'Corner above its slot (front-left), white on the left.',
    notes: 'Mirror of the front-right insert.',
    seeAlso: ['ins-FL-front'],
  },
  {
    id: 'ins-FL-front',
    name: 'Front-left insert (white in front)',
    category: 'beginner',
    moves: "F U F'",
    recognition: 'White corner above the front-left slot with white facing front.',
    angle: 'Corner above its slot (front-left), white in front.',
    seeAlso: ['ins-FL-left'],
  },
  {
    id: 'ins-middle-right',
    name: 'Middle layer (right)',
    category: 'beginner',
    moves: "U R U' R' U' F' U F",
    recognition: 'Middle edge at UF with the right-centre colour on top.',
    angle: 'Edge at front-top (UF), top colour matches the right centre.',
    notes: 'Front colour on top instead? Do this algorithm three times (with a U2 before the third). Edge stuck in a slot? This pops it out.',
    seeAlso: ['ins-middle-left'],
  },
  {
    id: 'ins-middle-left',
    name: 'Middle layer (left)',
    category: 'beginner',
    moves: "U' L' U L U F U' F'",
    recognition: 'Middle edge at UF with the left-centre colour on top.',
    angle: 'Edge at front-top (UF), top colour matches the left centre.',
    notes: 'Mirror of the right insert, including the three-times rule for front-on-top.',
    seeAlso: ['ins-middle-right'],
  },
  {
    id: 'trig-sexy',
    name: 'Sexy move',
    category: 'trigger',
    moves: "R U R' U'",
    recognition: 'The fundamental 4-move trigger. Repeating it 6 times returns to solved.',
    angle: 'Right hand, front-right slot.',
    notes: 'Building block of many algorithms. Order 6.',
  },
  {
    id: 'trig-sledge',
    name: 'Sledgehammer',
    category: 'trigger',
    moves: "R' F R F'",
    recognition: 'The mirror trigger. Repeating it 6 times returns to solved.',
    angle: 'Right hand, front-right slot.',
    notes: 'Building block of many algorithms. Order 6.',
  },
]
