import type { BeginnerStep } from './types'

/**
 * The beginner method, end to end. Every rule below was mechanically proven
 * complete in library.test.ts: from any valid state at each stage, following
 * the rules reaches the next stage. White on bottom, yellow on top throughout.
 */
export const BEGINNER_METHOD: BeginnerStep[] = [
  {
    step: 1,
    title: 'White cross',
    goal: 'White cross on the bottom (white centre) with each edge matching its side centre.',
    rules: [
      {
        when: 'A white edge is anywhere except solved.',
        action:
          'Turn the white sticker to the top (U), rotate U until it sits above its side centre, then turn that face twice (F2/R2/B2/L2) to drop it into place. Repeat for all four edges.',
        uses: [],
      },
      {
        when: 'A white edge is stuck in the bottom but flipped or misplaced.',
        action: 'Hold it at the front and do F2 to lift it to the top, then place it as above.',
        uses: [],
      },
    ],
  },
  {
    step: 2,
    title: 'White corners',
    goal: 'White bottom layer complete: four white corners next to their matching side centres.',
    rules: [
      {
        when: 'The slot you are solving is at the back.',
        action:
          'Turn the whole cube to bring that slot to front-right or front-left, then proceed as below.',
        uses: [],
      },
      {
        when: 'The corner is in the top layer.',
        action:
          'Rotate U until the corner is above its slot (between its two side colours). Insert: white on the side facing your hand uses [ins-FR-right]/[ins-FL-left]; white in front uses [ins-FR-front]/[ins-FL-front].',
        uses: ['ins-FR-right', 'ins-FR-front', 'ins-FL-left', 'ins-FL-front'],
      },
      {
        when: 'White faces up (on top).',
        action:
          'Hold the corner above its slot and do [ins-FR-right] (or the left mirror) twice to pop it out with white on the side, then insert normally.',
        uses: ['ins-FR-right', 'ins-FL-left'],
      },
      {
        when: 'The corner is in the bottom but wrong (wrong slot or twisted).',
        action:
          'Hold that slot at front-right and do [ins-FR-right] once to pop the corner to the top, then solve it as above.',
        uses: ['ins-FR-right'],
      },
    ],
  },
  {
    step: 3,
    title: 'Middle layer',
    goal: 'First two layers complete: all four middle edges placed.',
    rules: [
      {
        when: 'The edge is in the top layer.',
        action:
          'Rotate U to bring the edge to front-top (UF). Look at the TOP colour: if it matches the right centre, do [ins-middle-right]; if it matches the left centre, do [ins-middle-left].',
        uses: ['ins-middle-right', 'ins-middle-left'],
      },
      {
        when: 'The front colour is on top (neither left nor right).',
        action:
          'Do the matching insert three times: the first seats the edge flipped, the second pops it out, line it up with U2 and do the third to finish. (Right slot: [ins-middle-right] three times; left slot: [ins-middle-left] three times.)',
        uses: ['ins-middle-right', 'ins-middle-left'],
      },
      {
        when: 'The edge is stuck in a middle slot (wrong edge or flipped).',
        action:
          'Do any middle insert ([ins-middle-right] or [ins-middle-left]) once to pop it to the top, then solve it as above.',
        uses: ['ins-middle-right', 'ins-middle-left'],
      },
    ],
  },
  {
    step: 4,
    title: 'Yellow cross',
    goal: 'Yellow cross on top (edge orientation; corners ignored).',
    rules: [
      {
        when: 'You see an L-shape (two adjacent yellow edges).',
        action: 'Hold it with yellow arms pointing left and back, then do [oll-edge-L].',
        uses: ['oll-edge-L'],
      },
      {
        when: 'You see a line (two opposite yellow edges).',
        action: 'Hold it pointing left-right, then do [oll-edge-line].',
        uses: ['oll-edge-line'],
      },
      {
        when: 'You see a dot (no yellow edges).',
        action: 'Do [oll-edge-L] (you get the line) or [oll-edge-line] (you get the L), then finish with the rule above.',
        uses: ['oll-edge-L', 'oll-edge-line'],
      },
    ],
  },
  {
    step: 5,
    title: 'Orient yellow corners',
    goal: 'Whole top face yellow (corners may still be permuted).',
    rules: [
      {
        when: 'One corner oriented, three twisted (fish shapes).',
        action:
          'Rotate U to put the oriented corner front-left. Sune pattern: do [oll-sune]. Anti-Sune pattern: turn U2 (oriented corner to back-right) and do [oll-antisune].',
        uses: ['oll-sune', 'oll-antisune'],
      },
      {
        when: 'Two adjacent corners twisted, two oriented.',
        action:
          'Rotate U to put the twisted pair at the back. Chameleon pattern: do [oll-T]. Headlights pattern: turn U2 (pair to front) and do [oll-U].',
        uses: ['oll-T', 'oll-U'],
      },
      {
        when: 'Two diagonal corners twisted, two oriented (bowtie).',
        action: 'Rotate U to match the [oll-bowtie] diagram (twisted diagonal UFL with UBR), then do [oll-bowtie].',
        uses: ['oll-bowtie'],
      },
      {
        when: 'All four corners twisted.',
        action:
          'Rotate U until the pattern matches a diagram. Pi pattern (front and back pairs twist opposite ways): do [oll-pi]. H pattern (alternating twists): do [oll-H].',
        uses: ['oll-pi', 'oll-H'],
      },
    ],
  },
  {
    step: 6,
    title: 'Position yellow corners',
    goal: 'Corners in the right places (edges may still be permuted). Uses the Aa perm.',
    rules: [
      {
        when: 'One corner solved (in the right place) and three are not.',
        action:
          'Turn the WHOLE cube (not just U) to put the solved corner at front-left, then do [pll-Aa] once or twice until solved.',
        uses: ['pll-Aa'],
      },
      {
        when: 'No corner solved (0 in place, including the diagonal-swap case).',
        action: 'Do [pll-Aa] once from any angle: exactly one corner becomes solved. Then follow the rule above.',
        uses: ['pll-Aa'],
      },
      {
        when: 'Two corners solved and two swapped (or Aa leaves you going in circles).',
        action:
          'That is parity (an odd swap): do [pll-T] once from any angle to fix it, then follow the Aa rules above.',
        uses: ['pll-T', 'pll-Aa'],
      },
    ],
  },
  {
    step: 7,
    title: 'Position yellow edges',
    goal: 'Cube solved. Uses the Ua perm (plus H and Z for the no-edge-solved cases).',
    rules: [
      {
        when: 'One edge solved (matches both sides) and three are not.',
        action:
          'Turn the WHOLE cube (not just U) to put the solved edge at the back, then do [pll-Ua] once or twice until solved.',
        uses: ['pll-Ua'],
      },
      {
        when: 'No edge solved: opposite edges swapped (front top row shows the opposite colour in the middle).',
        action: 'Do [pll-H]. It works from any angle.',
        uses: ['pll-H'],
      },
      {
        when: 'No edge solved: adjacent edges swapped (front top row shows a neighbour colour in the middle).',
        action: 'Turn the WHOLE cube to match the [pll-Z] diagram, then do [pll-Z].',
        uses: ['pll-Z'],
      },
    ],
  },
]
