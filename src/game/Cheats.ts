// The 1995 game's cheat words, typed while the game is paused (source: Lucy
// Snyder's review, which lists the word and its effect). Amounts the review does
// not give are remake calibration.
export const CHEATS = {
  SNAPPLE: 'lock',
  PERNTS: 'points',
  NALA: 'shield',
  SQUISH: 'machine_gun',
  USMC: 'bonus',
  DJARUM: 'diamond',
  HECTOR: 'lives',
} as const

export type CheatWord = keyof typeof CHEATS
export type CheatEffect = (typeof CHEATS)[CheatWord]

export const CHEAT_POINTS = 1000 // "adds points to your score": amount not documented
export const CHEAT_BONUS = 5000 // "adds 5000 to your bonus score"

const WORDS = Object.keys(CHEATS) as CheatWord[]
const LONGEST = Math.max(...WORDS.map((w) => w.length))

// Appends one typed letter and reports a completed cheat word, if any.
export function feedCheatBuffer(
  buffer: string,
  letter: string
): { buffer: string; word: CheatWord | null } {
  const next = (buffer + letter.toUpperCase()).slice(-LONGEST)
  const word = WORDS.find((w) => next.endsWith(w)) ?? null
  return { buffer: word ? '' : next, word }
}

// True when `buffer + letter` could still be the start of a cheat word.
export function continuesCheat(buffer: string, letter: string): boolean {
  const next = (buffer + letter).toUpperCase()
  for (let start = 0; start < next.length; start++) {
    const tail = next.slice(start)
    if (WORDS.some((w) => w.startsWith(tail))) return true
  }
  return false
}
