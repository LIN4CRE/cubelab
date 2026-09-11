declare module 'min2phase.js' {
  /** Error codes returned as "Error N" strings by solution()/solve(). */
  interface Min2PhaseSolver {
    solve(facelets: string): string
    randomCube(): string
    fromScramble(scramble: string): string
    initFull(): void
    readonly INVERSE_SOLUTION: number
  }
  const min2phase: Min2PhaseSolver
  export default min2phase
}
