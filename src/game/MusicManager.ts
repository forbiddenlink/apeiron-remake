import { MusicSynth } from './MusicSynth';

export enum GameState {
  TITLE = 'title',
  PLAYING = 'playing',
  POWER_UP = 'power_up',
  TENSE = 'tense',
  GAME_OVER = 'game_over'
}

interface MusicStateConfig {
  tempo: number;
  pattern: 'MAIN' | 'ALT' | 'TENSE';
  volume: number;
  fadeInTime?: number;
  fadeOutTime?: number;
}

const STATE_CONFIGS: Record<GameState, MusicStateConfig> = {
  [GameState.TITLE]: {
    tempo: 100,
    pattern: 'MAIN',
    volume: 0.6,
    fadeInTime: 2.0,
    fadeOutTime: 1.0
  },
  [GameState.PLAYING]: {
    tempo: 120,
    pattern: 'MAIN',
    volume: 0.7,
    fadeInTime: 0.5,
    fadeOutTime: 0.5
  },
  [GameState.POWER_UP]: {
    tempo: 140,
    pattern: 'ALT',
    volume: 0.8,
    fadeInTime: 0.3,
    fadeOutTime: 0.3
  },
  [GameState.TENSE]: {
    tempo: 160,
    pattern: 'TENSE',
    volume: 0.9,
    fadeInTime: 0.2,
    fadeOutTime: 0.2
  },
  [GameState.GAME_OVER]: {
    tempo: 80,
    pattern: 'MAIN',
    volume: 0.5,
    fadeInTime: 0.1,
    fadeOutTime: 3.0
  }
};

export class MusicManager {
  private static instance: MusicManager;
  private synth: MusicSynth;
  private currentState: GameState = GameState.TITLE;
  private isEnabled = true;
  private volume = 1.0;
  private fadeInterval: number | null = null;

  private constructor() {
    this.synth = new MusicSynth();
  }

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  private startFade(fromVolume: number, toVolume: number, duration: number, onComplete?: () => void) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const startTime = performance.now();
    const volumeDiff = toVolume - fromVolume;

    this.fadeInterval = window.setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / duration);

      if (progress >= 1) {
        clearInterval(this.fadeInterval!);
        this.fadeInterval = null;
        this.synth.setVolume(toVolume * this.volume);
        if (onComplete) onComplete();
      } else {
        const currentVolume = fromVolume + (volumeDiff * progress);
        this.synth.setVolume(currentVolume * this.volume);
      }
    }, 16) as unknown as number; // 60fps update
  }

  setState(state: GameState) {
    if (state === this.currentState) return;

    const prevConfig = STATE_CONFIGS[this.currentState];
    const newConfig = STATE_CONFIGS[state];

    // Start fade out
    this.startFade(
      prevConfig.volume,
      0,
      prevConfig.fadeOutTime || 0.5,
      () => {
        // Update synth settings
        this.synth.setPattern(newConfig.pattern);
        this.synth.setTempo(newConfig.tempo);

        // Start fade in
        this.startFade(0, newConfig.volume, newConfig.fadeInTime || 0.5);
      }
    );

    this.currentState = state;
  }

  start() {
    if (!this.isEnabled) return;
    const config = STATE_CONFIGS[this.currentState];
    this.synth.setPattern(config.pattern);
    this.synth.setTempo(config.tempo);
    this.synth.setVolume(0);
    this.synth.start();
    this.startFade(0, config.volume, config.fadeInTime || 0.5);
  }

  stop() {
    const config = STATE_CONFIGS[this.currentState];
    this.startFade(
      config.volume,
      0,
      config.fadeOutTime || 0.5,
      () => this.synth.stop()
    );
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    } else if (this.currentState === GameState.PLAYING) {
      this.start();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    const config = STATE_CONFIGS[this.currentState];
    this.synth.setVolume(config.volume * this.volume);
  }

  // Special state transitions
  onPowerUpStart() {
    if (this.currentState === GameState.PLAYING) {
      this.setState(GameState.POWER_UP);
    }
  }

  onPowerUpEnd() {
    if (this.currentState === GameState.POWER_UP) {
      this.setState(GameState.PLAYING);
    }
  }

  onTenseMomentStart() {
    if (this.currentState === GameState.PLAYING) {
      this.setState(GameState.TENSE);
    }
  }

  onTenseMomentEnd() {
    if (this.currentState === GameState.TENSE) {
      this.setState(GameState.PLAYING);
    }
  }
}
