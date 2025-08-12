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
function voiceClip(type: 'scobster' | 'powerup' | 'bonus' | 'yeah' | 'groucho' | 'gordon' | 'ufo' | 'yummy') {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  
  switch(type) {
    case 'scobster':
      // "Scobsters!" - Larry's signature call
      fmOsc(400, 50, 30, 0.2, 'sawtooth', 0.3);
      setTimeout(() => fmOsc(300, 40, 20, 0.15, 'sawtooth', 0.25), 200);
      setTimeout(() => fmOsc(350, 45, 25, 0.1, 'sawtooth', 0.2), 350);
      break;
      
    case 'groucho':
      // "Heh heh heh!" - Groucho's laugh
      fmOsc(250, 30, 20, 0.15, 'square', 0.25);
      setTimeout(() => fmOsc(230, 28, 18, 0.15, 'square', 0.23), 160);
      setTimeout(() => fmOsc(210, 26, 16, 0.15, 'square', 0.21), 320);
      break;
      
    case 'gordon':
      // "Ssssss!" - Gordon's hiss
      noise(0.3, 0.15, 'pink');
      fmOsc(800, 100, 60, 0.3, 'sawtooth', 0.2);
      break;
      
    case 'ufo':
      // "Vwoooosh!" - UFO's energy beam
      fmOsc(600, 150, 100, 0.4, 'sine', 0.25);
      setTimeout(() => noise(0.3, 0.1, 'pink'), 100);
      break;
      
    case 'powerup':
      // "Power up!" - More energetic
      fmOsc(500, 60, 40, 0.15, 'square', 0.3);
      setTimeout(() => fmOsc(600, 70, 50, 0.2, 'square', 0.3), 150);
      setTimeout(() => fmOsc(700, 80, 60, 0.1, 'square', 0.25), 350);
      break;
      
    case 'yummy':
      // "Yummy!" - Cheerful collection sound
      fmOsc(600, 75, 45, 0.15, 'sine', 0.3);
      setTimeout(() => fmOsc(450, 55, 35, 0.2, 'sine', 0.25), 150);
      break;
      
    case 'bonus':
      // "Bonus!" - More impactful
      fmOsc(450, 55, 35, 0.2, 'sawtooth', 0.3);
      setTimeout(() => fmOsc(350, 45, 25, 0.15, 'sawtooth', 0.25), 200);
      setTimeout(() => fmOsc(550, 65, 45, 0.1, 'sawtooth', 0.2), 350);
      break;
      
    case 'yeah':
      // "Yeah!" - More enthusiastic
      fmOsc(350, 45, 25, 0.2, 'sawtooth', 0.3);
      setTimeout(() => fmOsc(450, 55, 35, 0.15, 'sawtooth', 0.25), 200);
      break;
  }
}

export const sfx = {
  // XQJ-37 plasma blaster sounds
  shoot() { 
    energyBeam(1250, 0.15);
    noise(0.1, 0.05, 'pink');
  },
  
  // Crystal impact sounds
  hit() { 
    crystalHit(250);
    noise(0.05, 0.1, 'white');
  },
  
  // Larry the Scobster (Spider)
  spider() {
    voiceClip('scobster');
    fmOsc(520, 130, 60, 0.2, 'triangle', 0.2);
    setTimeout(() => noise(0.15, 0.1, 'pink'), 100);
  },
  
  // Groucho the Flick (Flea)
  flea() {
    voiceClip('groucho');
    fmOsc(430, 215, 40, 0.15, 'triangle', 0.18);
    setTimeout(() => noise(0.1, 0.08, 'pink'), 150);
  },
  
  // Gordon the Gecko (Scorpion)
  scorpion() {
    voiceClip('gordon');
    fmOsc(860, 215, 80, 0.2, 'sawtooth', 0.2);
    setTimeout(() => noise(0.15, 0.1, 'brown'), 100);
  },
  
  // UFO sounds
  ufo() {
    voiceClip('ufo');
    fmOsc(600, 150, 100, 0.4, 'sine', 0.2);
    setTimeout(() => noise(0.3, 0.1, 'pink'), 200);
  },
  
  // Power-up (Yummy) collection
  powerup() {
    voiceClip('yummy');
    fmOsc(600, 150, 60, 0.2, 'sine', 0.2);
    setTimeout(() => fmOsc(800, 200, 80, 0.15, 'sine', 0.18), 150);
  },
  
  // Extra life and bonuses
  extra() {
    voiceClip('bonus');
    fmOsc(900, 225, 90, 0.15, 'square', 0.22);
    setTimeout(() => fmOsc(1400, 350, 140, 0.2, 'square', 0.22), 40);
  },
  
  // Level completion
  level() {
    voiceClip('yeah');
    fmOsc(980, 245, 98, 0.25, 'square', 0.2);
    setTimeout(() => fmOsc(1200, 300, 120, 0.2, 'square', 0.18), 250);
  },
  
  // Game start
  start() {
    voiceClip('powerup');
    fmOsc(600, 150, 60, 0.2, 'square', 0.2);
    setTimeout(() => fmOsc(900, 225, 90, 0.2, 'square', 0.2), 60);
    setTimeout(() => fmOsc(1200, 300, 120, 0.2, 'square', 0.2), 120);
  },
  
  // Game over
  gameover() {
    fmOsc(800, 200, 80, 0.3, 'triangle', 0.2);
    setTimeout(() => fmOsc(420, 105, 42, 0.4, 'sawtooth', 0.22), 90);
    setTimeout(() => noise(0.5, 0.15, 'brown'), 180);
  },
  
  // Volume control
  setVolume(volume: number) {
    // Volume is 0-100, convert to 0-1
    const v = Math.max(0, Math.min(1, volume / 100));
    // TODO: Implement per-sound volume control
  }
};
