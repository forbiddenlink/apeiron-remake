// Advanced WebAudio synthesizer for Apeiron-style SFX and voice synthesis
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  return ctx || (ctx = new Ctx());
}

// Enhanced oscillator with frequency modulation
function fmOsc(freq: number, modFreq: number, modDepth: number, duration: number, type: OscillatorType = 'sine', volume = 0.22) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  
  const carrier = a.createOscillator();
  const modulator = a.createOscillator();
  const modGain = a.createGain();
  const mainGain = a.createGain();
  
  carrier.type = type;
  modulator.type = 'sine';
  
  carrier.frequency.setValueAtTime(freq, t0);
  modulator.frequency.setValueAtTime(modFreq, t0);
  modGain.gain.setValueAtTime(modDepth, t0);
  mainGain.gain.setValueAtTime(volume, t0);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  carrier.connect(mainGain).connect(a.destination);
  
  carrier.start(t0);
  modulator.start(t0);
  carrier.stop(t0 + duration);
  modulator.stop(t0 + duration);
}

// Noise generator for various effects
function noise(duration: number, volume = 0.1, filter: 'white' | 'pink' | 'brown' = 'white') {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  const bufferSize = a.sampleRate * duration;
  const buffer = a.createBuffer(1, bufferSize, a.sampleRate);
  const data = buffer.getChannelData(0);
  
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    let white = Math.random() * 2 - 1;
    if (filter === 'pink') {
      // Pink noise approximation
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3;
    } else if (filter === 'brown') {
      // Brown noise approximation
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut;
    } else {
      // White noise
      data[i] = white;
    }
  }
  
  const source = a.createBufferSource();
  const gain = a.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  
  source.connect(gain).connect(a.destination);
  source.start(t0);
}

// Energy beam sound (for shooting)
function energyBeam(freq: number, duration: number, volume = 0.17) {
  fmOsc(freq, freq/4, 50, duration, 'square', volume);
  fmOsc(freq*1.5, freq/3, 30, duration*0.7, 'sine', volume*0.5);
}

// Crystal impact sound
function crystalHit(baseFreq: number, volume = 0.22) {
  const duration = 0.15;
  fmOsc(baseFreq, baseFreq*2, 100, duration, 'sine', volume);
  setTimeout(() => fmOsc(baseFreq*1.5, baseFreq, 50, duration*0.5, 'sine', volume*0.7), 50);
}

// Voice synthesis approximation
function voiceClip(type: 'scobster' | 'powerup' | 'bonus' | 'yeah') {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  
  switch(type) {
    case 'scobster':
      // "Scobsters!" approximation
      fmOsc(400, 50, 30, 0.2, 'sawtooth', 0.3);
      setTimeout(() => fmOsc(300, 40, 20, 0.15, 'sawtooth', 0.25), 200);
      break;
    case 'powerup':
      // "Power up!" approximation
      fmOsc(500, 60, 40, 0.15, 'square', 0.3);
      setTimeout(() => fmOsc(600, 70, 50, 0.2, 'square', 0.3), 150);
      break;
    case 'bonus':
      // "Bonus!" approximation
      fmOsc(450, 55, 35, 0.2, 'sawtooth', 0.3);
      setTimeout(() => fmOsc(350, 45, 25, 0.15, 'sawtooth', 0.25), 200);
      break;
    case 'yeah':
      // "Yeah!" approximation
      fmOsc(350, 45, 25, 0.2, 'sawtooth', 0.3);
      break;
  }
}

export const sfx = {
  shoot() { 
    energyBeam(1250, 0.15);
    noise(0.1, 0.05, 'pink');
  },
  hit() { 
    crystalHit(250);
    noise(0.05, 0.1, 'white');
  },
  spider() {
    fmOsc(520, 130, 60, 0.2, 'triangle', 0.2);
    setTimeout(() => voiceClip('scobster'), 100);
  },
  flea() {
    fmOsc(430, 215, 40, 0.15, 'triangle', 0.18);
    noise(0.1, 0.08, 'pink');
  },
  scorpion() {
    fmOsc(860, 215, 80, 0.2, 'sawtooth', 0.2);
    noise(0.15, 0.1, 'brown');
  },
  extra() {
    voiceClip('bonus');
    fmOsc(900, 225, 90, 0.15, 'square', 0.22);
    setTimeout(() => fmOsc(1400, 350, 140, 0.2, 'square', 0.22), 40);
  },
  level() {
    voiceClip('yeah');
    fmOsc(980, 245, 98, 0.25, 'square', 0.2);
  },
  start() {
    voiceClip('powerup');
    fmOsc(600, 150, 60, 0.2, 'square', 0.2);
    setTimeout(() => fmOsc(900, 225, 90, 0.2, 'square', 0.2), 60);
    setTimeout(() => fmOsc(1200, 300, 120, 0.2, 'square', 0.2), 120);
  },
  gameover() {
    fmOsc(800, 200, 80, 0.3, 'triangle', 0.2);
    setTimeout(() => fmOsc(420, 105, 42, 0.4, 'sawtooth', 0.22), 90);
    noise(0.5, 0.15, 'brown');
  }
};
