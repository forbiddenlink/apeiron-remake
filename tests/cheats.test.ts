import { describe, expect, it } from 'vitest'
import { CHEATS, continuesCheat, feedCheatBuffer } from '../src/game/Cheats'

function type(text: string) {
  let buffer = ''
  let word: string | null = null
  for (const letter of text) {
    const fed = feedCheatBuffer(buffer, letter)
    buffer = fed.buffer
    if (fed.word) word = fed.word
  }
  return { buffer, word }
}

describe('Cheat words', () => {
  it('recognizes every word from the 1995 game', () => {
    for (const word of Object.keys(CHEATS)) {
      expect(type(word).word).toBe(word)
    }
  })

  it('ignores case and leading noise, and clears after a match', () => {
    expect(type('xxsquish')).toEqual({ buffer: '', word: 'SQUISH' })
  })

  it('does not fire on a partial word', () => {
    expect(type('SNAPPL').word).toBeNull()
  })

  it('knows when P is part of a word rather than the resume key', () => {
    expect(continuesCheat('SNA', 'P')).toBe(true)
    expect(continuesCheat('SNAP', 'P')).toBe(true)
    expect(continuesCheat('', 'P')).toBe(true) // PERNTS starts with P
    expect(continuesCheat('NAL', 'P')).toBe(true) // ...so P can always start one
    expect(continuesCheat('', 'Q')).toBe(false)
  })
})
