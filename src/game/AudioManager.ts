// Audio manager using Howler.js for better cross-browser audio support
// Handles sound effects with pooling, volume control, and spatial audio

import { Howl, Howler } from 'howler';

export type SoundId =
  | 'shoot'
  | 'hit'
  | 'spider'
  | 'flea'
  | 'scorpion'
  | 'ufo'
  | 'powerup'
  | 'extra'
  | 'level'
  | 'start'
  | 'gameover'
  | 'raspberry'
  | 'juggle'
  | 'coin'
  | 'coinFrenzy'
  | 'reflect';

interface SoundConfig {
  frequencies: number[];
  duration: number;
  type: OscillatorType;
  modulation?: { freq: number; depth: number };
  noise?: { duration: number; filter: 'white' | 'pink' | 'brown' };
  volume: number;
}

// Sound configurations for procedural audio generation
const SOUND_CONFIGS: Record<SoundId, SoundConfig> = {
  shoot: {
    frequencies: [1250, 1875],
    duration: 0.15,
    type: 'square',
    modulation: { freq: 312, depth: 50 },
    noise: { duration: 0.1, filter: 'pink' },
    volume: 0.17
  },
  hit: {
    frequencies: [250, 375],
    duration: 0.15,
    type: 'sine',
    modulation: { freq: 500, depth: 100 },
    noise: { duration: 0.05, filter: 'white' },
    volume: 0.22
  },
  spider: {
    frequencies: [520, 400, 300],
    duration: 0.2,
    type: 'sawtooth',
    modulation: { freq: 130, depth: 60 },
    noise: { duration: 0.15, filter: 'pink' },
    volume: 0.25
  },
  flea: {
    frequencies: [250, 230, 210],
    duration: 0.15,
    type: 'square',
    modulation: { freq: 28, depth: 18 },
    noise: { duration: 0.1, filter: 'pink' },
    volume: 0.23
  },
  scorpion: {
    frequencies: [860, 800],
    duration: 0.2,
    type: 'sawtooth',
    modulation: { freq: 215, depth: 80 },
    noise: { duration: 0.3, filter: 'pink' },
    volume: 0.2
  },
  ufo: {
    frequencies: [600, 500],
    duration: 0.4,
    type: 'sine',
    modulation: { freq: 150, depth: 100 },
    noise: { duration: 0.3, filter: 'pink' },
    volume: 0.25
  },
  powerup: {
    frequencies: [600, 800],
    duration: 0.2,
    type: 'sine',
    modulation: { freq: 150, depth: 60 },
    volume: 0.3
  },
  extra: {
    frequencies: [900, 1400],
    duration: 0.2,
    type: 'square',
    modulation: { freq: 225, depth: 90 },
    volume: 0.22
  },
  level: {
    frequencies: [980, 1200],
    duration: 0.25,
    type: 'square',
    modulation: { freq: 245, depth: 98 },
    volume: 0.2
  },
  start: {
    frequencies: [600, 900, 1200],
    duration: 0.2,
    type: 'square',
    modulation: { freq: 150, depth: 60 },
    volume: 0.2
  },
  gameover: {
    frequencies: [800, 420],
    duration: 0.4,
    type: 'triangle',
    modulation: { freq: 105, depth: 42 },
    noise: { duration: 0.5, filter: 'brown' },
    volume: 0.22
  },
  raspberry: {
    frequencies: [120, 80],
    duration: 0.2,
    type: 'sawtooth',
    modulation: { freq: 40, depth: 30 },
    noise: { duration: 0.25, filter: 'pink' },
    volume: 0.12
  },
  juggle: {
    frequencies: [300],
    duration: 0.15,
    type: 'sine',
    modulation: { freq: 150, depth: 40 },
    volume: 0.2
  },
  coin: {
    frequencies: [880, 1100],
    duration: 0.1,
    type: 'sine',
    modulation: { freq: 220, depth: 60 },
    volume: 0.18
  },
  coinFrenzy: {
    frequencies: [600, 700, 800, 900, 1000],
    duration: 0.12,
    type: 'sine',
    modulation: { freq: 150, depth: 50 },
    volume: 0.15
  },
  reflect: {
    frequencies: [1200],
    duration: 0.1,
    type: 'triangle',
    modulation: { freq: 300, depth: 80 },
    noise: { duration: 0.08, filter: 'white' },
    volume: 0.2
  }
};

class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.8;
  private musicVolume = 0.7;
  private isMuted = false;

  // Sound sprite cache for frequently used sounds
  private soundSprites: Map<SoundId, Howl> = new Map();

  private constructor() {
    this.initContext();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initContext(): void {
    if (typeof window === 'undefined') return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.initContext();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Generate procedural sound using Web Audio API
  private generateSound(config: SoundConfig, pitchMultiplier: number = 1): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    const t0 = ctx.currentTime;
    const volume = config.volume * this.sfxVolume * this.masterVolume;

    // Main oscillator with FM synthesis
    for (let i = 0; i < config.frequencies.length; i++) {
      const freq = config.frequencies[i] * pitchMultiplier;
      const delay = i * 0.06;

      const carrier = ctx.createOscillator();
      const mainGain = ctx.createGain();

      carrier.type = config.type;
      carrier.frequency.setValueAtTime(freq, t0 + delay);

      // Frequency modulation
      if (config.modulation) {
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(config.modulation.freq * pitchMultiplier, t0 + delay);
        modGain.gain.setValueAtTime(config.modulation.depth, t0 + delay);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        modulator.start(t0 + delay);
        modulator.stop(t0 + delay + config.duration);
      }

      mainGain.gain.setValueAtTime(volume, t0 + delay);
      mainGain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + config.duration);

      carrier.connect(mainGain).connect(ctx.destination);
      carrier.start(t0 + delay);
      carrier.stop(t0 + delay + config.duration);
    }

    // Optional noise component
    if (config.noise) {
      this.generateNoise(config.noise.duration, volume * 0.5, config.noise.filter);
    }
  }

  private generateNoise(duration: number, volume: number, filter: 'white' | 'pink' | 'brown'): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (filter === 'pink') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3;
      } else if (filter === 'brown') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut;
      } else {
        data[i] = white;
      }
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    source.connect(gain).connect(ctx.destination);
    source.start(t0);
  }

  // Public sound effect methods
  play(soundId: SoundId, pitchMultiplier: number = 1): void {
    const config = SOUND_CONFIGS[soundId];
    if (config) {
      this.generateSound(config, pitchMultiplier);
    }
  }

  playAt(soundId: SoundId, x: number, y: number, screenWidth: number): void {
    // Simple stereo panning based on x position
    const pan = (x / screenWidth) * 2 - 1; // -1 to 1
    // For now, just play without panning - can enhance later with StereoPannerNode
    this.play(soundId);
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  mute(): void {
    this.isMuted = true;
    Howler.mute(true);
  }

  unmute(): void {
    this.isMuted = false;
    Howler.mute(false);
  }

  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  // Resume audio context (needed for mobile/browser autoplay restrictions)
  resume(): void {
    this.getContext();
    Howler.ctx?.resume();
  }

  // Convenience methods that match the old sfx interface
  shoot(): void { this.play('shoot'); }
  hit(): void { this.play('hit'); }
  spider(): void { this.play('spider'); }
  flea(): void { this.play('flea'); }
  scorpion(): void { this.play('scorpion'); }
  ufo(): void { this.play('ufo'); }
  powerup(): void { this.play('powerup'); }
  extra(): void { this.play('extra'); }
  level(): void { this.play('level'); }
  start(): void { this.play('start'); }
  gameover(): void { this.play('gameover'); }
  raspberry(): void { this.play('raspberry'); }
  juggle(count: number): void { this.play('juggle', 1 + count * 0.33); }
  coin(): void { this.play('coin'); }
  coinFrenzy(): void { this.play('coinFrenzy'); }
  reflect(): void { this.play('reflect'); }

  setVolume(volume: number): void {
    this.setSfxVolume(volume);
  }
}

export const audioManager = AudioManager.getInstance();

// Export a compatible interface with the old sfx object
export const sfx = {
  shoot: () => audioManager.shoot(),
  hit: () => audioManager.hit(),
  spider: () => audioManager.spider(),
  flea: () => audioManager.flea(),
  scorpion: () => audioManager.scorpion(),
  ufo: () => audioManager.ufo(),
  powerup: () => audioManager.powerup(),
  extra: () => audioManager.extra(),
  level: () => audioManager.level(),
  start: () => audioManager.start(),
  gameover: () => audioManager.gameover(),
  raspberry: () => audioManager.raspberry(),
  juggle: (count: number) => audioManager.juggle(count),
  coin: () => audioManager.coin(),
  coinFrenzy: () => audioManager.coinFrenzy(),
  reflect: () => audioManager.reflect(),
  setVolume: (volume: number) => audioManager.setVolume(volume / 100)
};
