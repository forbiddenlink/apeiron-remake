// Background music: a small look-ahead step sequencer on WebAudio.
//
// Each note gets its own oscillator and envelope (an OscillatorNode can only be
// started once), and everything runs through one gain node so Music Volume in
// Options is the single control. Cosmetic only: nothing here feeds gameplay,
// and it stays silent under the headless harness.

const STEPS_PER_BAR = 8 // eighth notes
const LOOKAHEAD_SECONDS = 0.15
const TICK_MS = 40
const MASTER_HEADROOM = 0.22

// A minor: Am, F, C, G. One bar each. Semitones from A2 (110 Hz).
const BARS: { root: number; chord: number[] }[] = [
  { root: 0, chord: [12, 15, 19, 24] },
  { root: -4, chord: [8, 12, 15, 20] },
  { root: 3, chord: [15, 19, 22, 27] },
  { root: -2, chord: [10, 14, 17, 22] },
]
const ARP_ORDER = [0, 1, 2, 3, 2, 1, 2, 1]

function hz(semitonesFromA2: number): number {
  return 110 * 2 ** (semitonesFromA2 / 12)
}

class Music {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private volume = 0.7
  private step = 0
  private nextTime = 0
  private tempo = 104
  private playing = false

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if ((window as unknown as { __APEIRON_TEST__?: boolean }).__APEIRON_TEST__) return null
    if (this.ctx) return this.ctx
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    try {
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume * MASTER_HEADROOM
      this.master.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume * MASTER_HEADROOM, this.ctx.currentTime, 0.05)
    }
  }

  // Wave number nudges the tempo up a little. Capped so it never gets frantic.
  setWave(wave: number): void {
    this.tempo = Math.min(132, 104 + Math.max(0, wave - 1) * 2)
  }

  start(): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    void ctx.resume()
    this.stopTimer()
    this.step = 0
    this.nextTime = ctx.currentTime + 0.08
    this.playing = true
    this.timer = setInterval(() => this.schedule(), TICK_MS)
  }

  pause(): void {
    if (!this.playing) return
    this.stopTimer()
  }

  resume(): void {
    if (!this.playing || this.timer || !this.ctx) return
    this.nextTime = this.ctx.currentTime + 0.08
    this.timer = setInterval(() => this.schedule(), TICK_MS)
  }

  stop(): void {
    this.playing = false
    this.stopTimer()
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const stepSeconds = 60 / this.tempo / 2
    // If the tab was throttled, skip ahead instead of dumping a burst of notes.
    if (this.nextTime < ctx.currentTime - 0.25) this.nextTime = ctx.currentTime + 0.05
    let guard = 0
    while (this.nextTime < ctx.currentTime + LOOKAHEAD_SECONDS && guard++ < 16) {
      this.playStep(ctx, this.step, this.nextTime, stepSeconds)
      this.step = (this.step + 1) % (STEPS_PER_BAR * BARS.length)
      this.nextTime += stepSeconds
    }
  }

  private playStep(ctx: AudioContext, step: number, time: number, stepSeconds: number): void {
    const bar = BARS[Math.floor(step / STEPS_PER_BAR) % BARS.length]
    const inBar = step % STEPS_PER_BAR

    // Bass on beats one and three, with a pickup on the last eighth.
    if (inBar === 0 || inBar === 4) {
      this.note(ctx, 'triangle', hz(bar.root), time, stepSeconds * 3.2, 0.5)
    } else if (inBar === 7) {
      this.note(ctx, 'triangle', hz(bar.root + 7), time, stepSeconds * 0.9, 0.3)
    }

    // Arpeggio on every eighth.
    const chordTone = bar.chord[ARP_ORDER[inBar]]
    this.note(ctx, 'square', hz(chordTone), time, stepSeconds * 0.85, 0.12, 1800)
  }

  private note(
    ctx: AudioContext,
    type: OscillatorType,
    frequency: number,
    time: number,
    duration: number,
    level: number,
    lowpassHz?: number
  ): void {
    if (!this.master) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, time)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(level, time + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    if (lowpassHz) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(lowpassHz, time)
      osc.connect(filter).connect(gain)
    } else {
      osc.connect(gain)
    }
    gain.connect(this.master)
    osc.start(time)
    osc.stop(time + duration + 0.02)
  }
}

export const music = new Music()
