// Advanced WebAudio synthesizer for Apeiron-style background music
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  return audioCtx || (audioCtx = new Ctx());
}

interface OscillatorParams {
  type: OscillatorType;
  frequency: number;
  detune: number;
  gain: number;
}

interface LFOParams {
  frequency: number;
  depth: number;
  target: 'frequency' | 'gain';
}

interface VoiceParams {
  oscillators: OscillatorParams[];
  lfo?: LFOParams;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

class Voice {
  private ctx: AudioContext;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private mainGain: GainNode;
  private params: VoiceParams;
  private isPlaying = false;

  constructor(ctx: AudioContext, params: VoiceParams) {
    this.ctx = ctx;
    this.params = params;
    this.mainGain = ctx.createGain();
    this.mainGain.connect(ctx.destination);
    this.mainGain.gain.value = 0;

    // Create oscillators
    params.oscillators.forEach(osc => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = osc.type;
      oscillator.frequency.value = osc.frequency;
      oscillator.detune.value = osc.detune;
      gain.gain.value = osc.gain;
      oscillator.connect(gain);
      gain.connect(this.mainGain);
      this.oscillators.push(oscillator);
      this.gains.push(gain);
    });

    // Create LFO if specified
    if (params.lfo) {
      this.lfo = ctx.createOscillator();
      this.lfoGain = ctx.createGain();
      this.lfo.frequency.value = params.lfo.frequency;
      this.lfoGain.gain.value = params.lfo.depth;
      this.lfo.connect(this.lfoGain);

      if (params.lfo.target === 'frequency') {
        this.oscillators.forEach(osc => {
          this.lfoGain!.connect(osc.frequency);
        });
      } else {
        this.lfoGain.connect(this.mainGain.gain);
      }
    }
  }

  start(time = this.ctx.currentTime) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Start oscillators
    this.oscillators.forEach(osc => osc.start(time));
    if (this.lfo) this.lfo.start(time);

    // Apply envelope
    const { attack, decay, sustain } = this.params;
    this.mainGain.gain.cancelScheduledValues(time);
    this.mainGain.gain.setValueAtTime(0, time);
    this.mainGain.gain.linearRampToValueAtTime(1, time + attack);
    this.mainGain.gain.linearRampToValueAtTime(sustain, time + attack + decay);
  }

  stop(time = this.ctx.currentTime) {
    if (!this.isPlaying) return;

    const releaseEnd = time + this.params.release;
    this.mainGain.gain.cancelScheduledValues(time);
    this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, time);
    this.mainGain.gain.linearRampToValueAtTime(0, releaseEnd);

    // Stop oscillators after release
    this.oscillators.forEach(osc => osc.stop(releaseEnd));
    if (this.lfo) this.lfo.stop(releaseEnd);
    this.isPlaying = false;
  }

  setFrequency(frequency: number, time = this.ctx.currentTime) {
    this.oscillators.forEach(osc => {
      osc.frequency.setValueAtTime(frequency, time);
    });
  }

  setGain(gain: number, time = this.ctx.currentTime) {
    this.mainGain.gain.setValueAtTime(gain, time);
  }
}

// Psychedelic arpeggio patterns
const PATTERNS = {
  MAIN: [0, 4, 7, 11, 7, 4],
  ALT: [0, 3, 7, 10, 7, 3],
  TENSE: [0, 6, 11, 13, 11, 6]
};

export class MusicSynth {
  private ctx: AudioContext | null = null;
  private voices: Voice[] = [];
  private currentPattern = PATTERNS.MAIN;
  private baseNote = 220; // A3
  private tempo = 120;
  private stepDuration = 60 / this.tempo / 2; // Eighth notes
  private currentStep = 0;
  private isPlaying = false;
  private nextStepTime = 0;
  private volume = 0.7;
  private mainGain: GainNode | null = null;

  constructor() {
    this.ctx = getAudioContext();
    if (!this.ctx) return;

    this.mainGain = this.ctx.createGain();
    this.mainGain.connect(this.ctx.destination);
    this.setVolume(this.volume);

    // Create voices
    this.voices.push(
      // Lead synth
      new Voice(this.ctx, {
        oscillators: [
          { type: 'sawtooth', frequency: this.baseNote, detune: 0, gain: 0.3 },
          { type: 'square', frequency: this.baseNote * 2, detune: 5, gain: 0.2 }
        ],
        lfo: { frequency: 6, depth: 5, target: 'frequency' },
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2
      }),
      // Pad synth
      new Voice(this.ctx, {
        oscillators: [
          { type: 'sine', frequency: this.baseNote, detune: -10, gain: 0.2 },
          { type: 'sine', frequency: this.baseNote * 1.5, detune: 10, gain: 0.15 }
        ],
        lfo: { frequency: 0.5, depth: 0.1, target: 'gain' },
        attack: 0.5,
        decay: 1.0,
        sustain: 0.5,
        release: 1.0
      })
    );
  }

  private scheduleNote(time: number) {
    const note = this.currentPattern[this.currentStep];
    const frequency = this.baseNote * Math.pow(2, note / 12);

    this.voices.forEach(voice => {
      voice.setFrequency(frequency, time);
      voice.start(time);
      voice.stop(time + this.stepDuration * 0.8); // Slight gap between notes
    });
  }

  private scheduleNextStep() {
    while (this.nextStepTime < this.ctx!.currentTime + 0.1) {
      this.scheduleNote(this.nextStepTime);
      this.currentStep = (this.currentStep + 1) % this.currentPattern.length;
      this.nextStepTime += this.stepDuration;
    }
    requestAnimationFrame(() => this.scheduleNextStep());
  }

  start() {
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime;
    this.scheduleNextStep();
  }

  stop() {
    if (!this.ctx || !this.isPlaying) return;
    this.isPlaying = false;
    this.voices.forEach(voice => voice.stop());
  }

  setPattern(pattern: keyof typeof PATTERNS) {
    this.currentPattern = PATTERNS[pattern];
  }

  setTempo(bpm: number) {
    this.tempo = bpm;
    this.stepDuration = 60 / this.tempo / 2;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.mainGain) {
      this.mainGain.gain.value = this.volume;
    }
  }

  // Change to tense pattern during boss fights or high-intensity moments
  setTenseMode(enabled: boolean) {
    this.setPattern(enabled ? 'TENSE' : 'MAIN');
  }

  // Change to alternate pattern during power-ups
  setPowerUpMode(enabled: boolean) {
    this.setPattern(enabled ? 'ALT' : 'MAIN');
  }
}
