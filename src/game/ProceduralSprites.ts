import { CELL } from './Constants';

export type VisualProfile = 'classic' | 'x';

const palette = {
  outline: '#0d1118',
  mushStemDark: '#20273c',
  mushStemLight: '#90a8d1',
  mushCapDark: '#0f1729',
  mushCapMid: '#28395e',
  mushCapHi: '#5f7db0',
  mushPoisonDark: '#571a13',
  mushPoisonMid: '#9f3723',
  mushPoisonHi: '#eb8f37',
  segmentDark: '#2f4d2f',
  segmentMid: '#4e7f48',
  segmentHi: '#9ecb7b',
  headDark: '#703416',
  headMid: '#c2632b',
  headHi: '#ffd07a',
  spiderDark: '#304034',
  spiderMid: '#4f7248',
  spiderHi: '#9dcf80',
  fleaDark: '#1f2840',
  fleaMid: '#3f5a87',
  fleaHi: '#9dc0eb',
  scorpionDark: '#463344',
  scorpionMid: '#76546f',
  scorpionHi: '#c27f70',
  ufoDark: '#2f3a3a',
  ufoMid: '#58726b',
  ufoHi: '#c0d9c7',
  playerDark: '#1f603f',
  playerMid: '#2f9a64',
  playerHi: '#8ce8cb',
  bulletDark: '#924618',
  bulletMid: '#df8534',
  bulletHi: '#ffe5ac'
} as const;

function snap(v: number): number {
  return Math.round(v * 2) / 2;
}

function radial(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  inner: string,
  outer: string
): CanvasGradient {
  const grad = g.createRadialGradient(x, y, r0, x, y, r1);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  return grad;
}

function linear(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  a: string,
  b: string
): CanvasGradient {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  return grad;
}

function coordNoise(x: number, y: number): number {
  const n = Math.sin((x * 127.1 + y * 311.7) * 0.123) * 43758.5453;
  return n - Math.floor(n);
}

export function drawMushroom(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  poisoned: boolean,
  hp: number,
  profile: VisualProfile = 'x',
  reflective = false,
  psychedelic = false,
  time = 0
) {
  const px = snap(x);
  const py = snap(y);
  const cx = px + CELL * 0.5;
  const tone = coordNoise((px + 9) * 0.16, (py + 13) * 0.2);
  const wobble = (tone - 0.5) * 0.6;
  const capY = py + 7.1 + wobble;
  const stemY = py + 8.2;
  const stemH = 4.3;

  // PSYCHEDELIC MUSHROOMS - rainbow gradient cycling colors
  let capInner: string | CanvasGradient;
  let capMid: string;
  if (psychedelic) {
    const hue = (time * 120 + px * 2 + py) % 360;
    capInner = `hsl(${hue}, 100%, 60%)`;
    capMid = `hsl(${(hue + 30) % 360}, 80%, 35%)`;
  } else if (reflective) {
    // REFLECTIVE MUSHROOMS - metallic silver/chrome look
    capInner = '#e8e8e8';
    capMid = '#808080';
  } else {
    capInner = profile === 'classic'
      ? (poisoned ? '#ff9442' : '#d83a67')
      : (poisoned ? '#ef6e38' : '#4f76ad');
    capMid = profile === 'classic'
      ? (poisoned ? '#8c2517' : '#4a1c5e')
      : (poisoned ? '#8a2416' : '#203b5d');
  }

  const capEdge = reflective ? '#404040' : (profile === 'classic' ? '#220911' : '#091428');
  const stemTopColor = reflective ? '#c0c0c0' : (profile === 'classic' ? '#f7da76' : '#c2d7e8');
  const stemBottomColor = reflective ? '#606060' : (profile === 'classic' ? '#5a4626' : '#35526c');

  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath();
  g.ellipse(cx + 0.18, py + 13.95, 4.9, 1.45, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = linear(g, cx, stemY, cx, stemY + stemH, stemTopColor, stemBottomColor);
  g.beginPath();
  g.roundRect(cx - 1.65, stemY, 3.3, stemH, 1.2);
  g.fill();
  g.strokeStyle = reflective ? 'rgba(80, 80, 80, 0.6)' : (profile === 'classic' ? 'rgba(69, 44, 19, 0.58)' : 'rgba(13, 31, 52, 0.58)');
  g.lineWidth = 0.75;
  g.strokeRect(cx - 1.65, stemY, 3.3, stemH);
  g.fillStyle = reflective ? 'rgba(255, 255, 255, 0.5)' : (profile === 'classic' ? 'rgba(255, 245, 182, 0.35)' : 'rgba(233, 245, 255, 0.36)');
  g.fillRect(cx - 0.42, stemY + 0.6, 0.84, stemH - 1.25);

  g.fillStyle = radial(g, cx - 1.25, capY - 0.85, 0.65, 6.0, capInner as string, capMid);
  g.beginPath();
  g.ellipse(cx, capY, 4.95, 2.8, 0, Math.PI, Math.PI * 2);
  g.lineTo(cx + 4.5, capY + 0.15);
  g.quadraticCurveTo(cx, capY + 2.45, cx - 4.5, capY + 0.15);
  g.closePath();
  g.fill();
  g.strokeStyle = capEdge;
  g.lineWidth = 0.92;
  g.stroke();

  g.fillStyle = reflective ? 'rgba(40, 40, 40, 0.5)' : (profile === 'classic' ? 'rgba(31, 8, 38, 0.67)' : 'rgba(7, 14, 24, 0.72)');
  g.beginPath();
  g.ellipse(cx, capY + 0.95, 3.95, 1.05, 0, 0, Math.PI);
  g.fill();

  // Highlight - extra shiny for reflective mushrooms
  if (reflective) {
    // Metallic shine highlights
    g.fillStyle = 'rgba(255, 255, 255, 0.7)';
    g.beginPath();
    g.ellipse(cx - 1.5, capY - 0.8, 2.0, 0.8, -0.22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.beginPath();
    g.ellipse(cx + 1.8, capY - 0.3, 1.2, 0.5, 0.3, 0, Math.PI * 2);
    g.fill();
  } else if (psychedelic) {
    // Rainbow sparkle for psychedelic
    const sparkleHue = (time * 200 + px * 3) % 360;
    g.fillStyle = `hsla(${sparkleHue}, 100%, 80%, 0.6)`;
    g.beginPath();
    g.ellipse(cx - 1.5, capY - 0.8, 1.65, 0.65, -0.22, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = poisoned
      ? 'rgba(255, 194, 115, 0.38)'
      : (profile === 'classic' ? 'rgba(255, 205, 218, 0.34)' : 'rgba(180, 223, 255, 0.34)');
    g.beginPath();
    g.ellipse(cx - 1.5, capY - 0.8, 1.65, 0.65, -0.22, 0, Math.PI * 2);
    g.fill();
  }

  if (poisoned && !reflective && !psychedelic) {
    g.fillStyle = 'rgba(255, 169, 82, 0.42)';
    g.beginPath();
    g.ellipse(cx + 1.35, capY - 0.25, 1.2, 0.5, 0.16, 0, Math.PI * 2);
    g.fill();
  }

  if (hp < 4) {
    g.fillStyle = 'rgba(6, 8, 12, 0.72)';
    for (let i = 0; i < 4 - hp; i++) {
      const ox = cx - 2.2 + i * 1.6;
      g.beginPath();
      g.moveTo(ox, capY - 0.05);
      g.lineTo(ox + 1.2, capY + 0.9);
      g.lineTo(ox + 0.25, capY + 1.5);
      g.closePath();
      g.fill();
    }
  }
}

export function drawSegment(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  head: boolean,
  profile: VisualProfile = 'x'
) {
  const px = snap(x);
  const py = snap(y);
  const cx = px + CELL * 0.5;
  const cy = py + 8.15;
  const tone = coordNoise(px * 0.21, py * 0.17);
  const bodyWobble = (tone - 0.5) * 0.4;
  const bodyDark = head
    ? (profile === 'classic' ? '#6e1224' : '#6e3014')
    : (profile === 'classic' ? '#2e1d50' : '#2c4f2e');
  const bodyMid = head
    ? (profile === 'classic' ? '#d4464a' : '#d96f2f')
    : (profile === 'classic' ? '#5c3a8a' : '#4f7e47');
  const bodyHi = head
    ? (profile === 'classic' ? '#ffb27d' : '#ffd48d')
    : (profile === 'classic' ? '#9079cb' : '#add48f');

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.ellipse(cx, py + 13.65, 5.9, 1.6, 0, 0, Math.PI * 2);
  g.fill();

  // Little feet/sneakers for each segment (Cheech wears sneakers!)
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.ellipse(cx - 3.5, py + 12.5, 1.8, 1.0, 0.2, 0, Math.PI * 2);
  g.ellipse(cx + 3.5, py + 12.5, 1.8, 1.0, -0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(cx - 3.5, py + 12.2, 0.8, 0.4, 0, 0, Math.PI * 2);
  g.ellipse(cx + 3.5, py + 12.2, 0.8, 0.4, 0, 0, Math.PI * 2);
  g.fill();

  // Body
  g.fillStyle = radial(g, cx - 1.8, cy - 1.9, 0.7, 7.6, bodyHi, bodyMid);
  g.beginPath();
  g.ellipse(cx, cy, 5.8 + bodyWobble, 4.2, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = bodyDark;
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, cy, 5.75 + bodyWobble, 4.1, 0, 0, Math.PI * 2);
  g.stroke();

  // Shine highlight
  g.fillStyle = 'rgba(255,255,255,0.23)';
  g.beginPath();
  g.ellipse(cx - 1.8, cy - 1.75, 1.78, 0.78, -0.2, 0, Math.PI * 2);
  g.fill();

  // Segment line
  g.strokeStyle = 'rgba(5, 8, 14, 0.45)';
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(cx - 3.35, cy + 1.02);
  g.lineTo(cx + 3.35, cy + 1.02);
  g.stroke();

  if (head) {
    // CHEECH'S FACE - big expressive eyes and smile!

    // Antennae
    g.strokeStyle = bodyDark;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx - 2.5, cy - 3);
    g.quadraticCurveTo(cx - 3.5, cy - 7, cx - 1.5, cy - 8);
    g.moveTo(cx + 2.5, cy - 3);
    g.quadraticCurveTo(cx + 3.5, cy - 7, cx + 1.5, cy - 8);
    g.stroke();
    // Antenna tips
    g.fillStyle = bodyHi;
    g.beginPath();
    g.arc(cx - 1.5, cy - 8, 1.2, 0, Math.PI * 2);
    g.arc(cx + 1.5, cy - 8, 1.2, 0, Math.PI * 2);
    g.fill();

    // Big googly eyes (white background)
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(cx - 2.2, cy - 0.5, 1.8, 1.5, 0, 0, Math.PI * 2);
    g.ellipse(cx + 2.2, cy - 0.5, 1.8, 1.5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#333';
    g.lineWidth = 0.5;
    g.stroke();

    // Pupils
    g.fillStyle = '#1c1209';
    g.beginPath();
    g.ellipse(cx - 2.0, cy - 0.3, 0.7, 0.6, 0, 0, Math.PI * 2);
    g.ellipse(cx + 2.0, cy - 0.3, 0.7, 0.6, 0, 0, Math.PI * 2);
    g.fill();

    // Eye highlights
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx - 2.4, cy - 0.8, 0.35, 0, Math.PI * 2);
    g.arc(cx + 1.6, cy - 0.8, 0.35, 0, Math.PI * 2);
    g.fill();

    // Smile!
    g.strokeStyle = '#1c1209';
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(cx, cy + 1.5, 2.2, 0.2, Math.PI - 0.2);
    g.stroke();

    // Bow tie (Cheech's signature accessory)
    g.fillStyle = '#cc2222';
    g.beginPath();
    g.moveTo(cx - 2.5, cy + 3.5);
    g.lineTo(cx - 0.5, cy + 2.8);
    g.lineTo(cx - 0.5, cy + 4.2);
    g.closePath();
    g.moveTo(cx + 2.5, cy + 3.5);
    g.lineTo(cx + 0.5, cy + 2.8);
    g.lineTo(cx + 0.5, cy + 4.2);
    g.closePath();
    g.fill();
    g.fillStyle = '#ff4444';
    g.beginPath();
    g.arc(cx, cy + 3.5, 0.8, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawSpider(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // LARRY THE SCOBSTER - a cantankerous scorpion-lobster hybrid!
  const px = snap(x);
  const py = snap(y);
  const cx = px + w * 0.5;
  const cy = py + h * 0.56;

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(cx, py + h - 1, 7, 2, 0, 0, Math.PI * 2);
  g.fill();

  // Legs (spider-like but thicker)
  g.strokeStyle = '#2a4a3a';
  g.lineWidth = 1.5;
  for (let i = -2; i <= 2; i += 2) {
    g.beginPath();
    g.moveTo(cx - 4, cy + i);
    g.quadraticCurveTo(cx - 8, cy + i - 1, cx - 10, cy + i + 3);
    g.moveTo(cx + 4, cy + i);
    g.quadraticCurveTo(cx + 8, cy + i - 1, cx + 10, cy + i + 3);
    g.stroke();
  }

  // LOBSTER CLAWS - Larry's signature feature!
  // Left claw
  g.fillStyle = '#8b4513';
  g.beginPath();
  g.moveTo(cx - 5, cy - 1);
  g.quadraticCurveTo(cx - 10, cy - 4, cx - 12, cy - 2);
  g.lineTo(cx - 11, cy + 1);
  g.quadraticCurveTo(cx - 8, cy, cx - 5, cy + 1);
  g.closePath();
  g.fill();
  // Claw pincer
  g.strokeStyle = '#5a2d0a';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(cx - 12, cy - 2);
  g.lineTo(cx - 14, cy - 4);
  g.moveTo(cx - 11, cy + 1);
  g.lineTo(cx - 13, cy + 2);
  g.stroke();

  // Right claw
  g.fillStyle = '#8b4513';
  g.beginPath();
  g.moveTo(cx + 5, cy - 1);
  g.quadraticCurveTo(cx + 10, cy - 4, cx + 12, cy - 2);
  g.lineTo(cx + 11, cy + 1);
  g.quadraticCurveTo(cx + 8, cy, cx + 5, cy + 1);
  g.closePath();
  g.fill();
  // Claw pincer
  g.beginPath();
  g.moveTo(cx + 12, cy - 2);
  g.lineTo(cx + 14, cy - 4);
  g.moveTo(cx + 11, cy + 1);
  g.lineTo(cx + 13, cy + 2);
  g.stroke();

  // Main body (scorpion-like segmented)
  g.fillStyle = radial(g, cx - 1, cy - 1.5, 0.8, 8, '#9fd37f', '#39593a');
  g.beginPath();
  g.ellipse(cx, cy, 6.5, 4, 0, 0, Math.PI * 2);
  g.fill();

  // Body segments
  g.strokeStyle = '#1f3226';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - 3, cy - 3);
  g.lineTo(cx - 3, cy + 3);
  g.moveTo(cx, cy - 3.5);
  g.lineTo(cx, cy + 3.5);
  g.moveTo(cx + 3, cy - 3);
  g.lineTo(cx + 3, cy + 3);
  g.stroke();

  g.strokeStyle = '#1f3226';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, cy, 6.3, 3.9, 0, 0, Math.PI * 2);
  g.stroke();

  // Shine
  g.fillStyle = 'rgba(208, 244, 178, 0.3)';
  g.beginPath();
  g.ellipse(cx - 2, cy - 1.5, 2, 1, -0.2, 0, Math.PI * 2);
  g.fill();

  // Mean little eyes
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(cx - 2, cy - 0.5, 1.2, 1, 0, 0, Math.PI * 2);
  g.ellipse(cx + 2, cy - 0.5, 1.2, 1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a0a00';
  g.beginPath();
  g.ellipse(cx - 1.8, cy - 0.3, 0.5, 0.4, 0, 0, Math.PI * 2);
  g.ellipse(cx + 1.8, cy - 0.3, 0.5, 0.4, 0, 0, Math.PI * 2);
  g.fill();

  // Angry eyebrows
  g.strokeStyle = '#1a0a00';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - 3.2, cy - 1.8);
  g.lineTo(cx - 1, cy - 1.2);
  g.moveTo(cx + 3.2, cy - 1.8);
  g.lineTo(cx + 1, cy - 1.2);
  g.stroke();

  // Small scorpion tail hint
  g.strokeStyle = '#39593a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy + 4);
  g.quadraticCurveTo(cx + 2, cy + 7, cx + 1, cy + 9);
  g.stroke();
  g.fillStyle = '#2a4a3a';
  g.beginPath();
  g.arc(cx + 1, cy + 9, 1.5, 0, Math.PI * 2);
  g.fill();
}

export function drawFlea(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // GROUCHO THE FLICK - a flea-tick creature that laughs as he falls!
  const px = snap(x);
  const py = snap(y);
  const cx = px + w * 0.5;
  const cy = py + h * 0.5;

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath();
  g.ellipse(cx, py + h - 1, 4, 1.2, 0, 0, Math.PI * 2);
  g.fill();

  // Jumping legs (flea-style)
  g.strokeStyle = '#1a3050';
  g.lineWidth = 1.5;
  // Back powerful jumping legs
  g.beginPath();
  g.moveTo(cx - 1, cy + 3);
  g.quadraticCurveTo(cx - 5, cy + 2, cx - 6, cy + 6);
  g.quadraticCurveTo(cx - 5, cy + 8, cx - 3, cy + 7);
  g.moveTo(cx + 1, cy + 3);
  g.quadraticCurveTo(cx + 5, cy + 2, cx + 6, cy + 6);
  g.quadraticCurveTo(cx + 5, cy + 8, cx + 3, cy + 7);
  g.stroke();
  // Front smaller legs
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx - 1.5, cy - 1);
  g.lineTo(cx - 3, cy + 2);
  g.moveTo(cx + 1.5, cy - 1);
  g.lineTo(cx + 3, cy + 2);
  g.stroke();

  // Main body (tick-like rounded)
  g.fillStyle = radial(g, cx - 1, cy - 2, 0.5, 6, '#7ab8e8', '#2a5888');
  g.beginPath();
  g.ellipse(cx, cy, 4, 5, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#1a3858';
  g.lineWidth = 1;
  g.stroke();

  // Body segments (tick-like)
  g.strokeStyle = 'rgba(20, 50, 80, 0.4)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - 3, cy - 2);
  g.lineTo(cx + 3, cy - 2);
  g.moveTo(cx - 3.5, cy);
  g.lineTo(cx + 3.5, cy);
  g.moveTo(cx - 3, cy + 2);
  g.lineTo(cx + 3, cy + 2);
  g.stroke();

  // Shine highlight
  g.fillStyle = 'rgba(200, 230, 255, 0.4)';
  g.beginPath();
  g.ellipse(cx - 1, cy - 2, 1.5, 1, -0.2, 0, Math.PI * 2);
  g.fill();

  // Head (smaller, tick-like)
  g.fillStyle = radial(g, cx - 0.5, cy - 5, 0.3, 3, '#8ac8f8', '#3a6898');
  g.beginPath();
  g.ellipse(cx, cy - 4.5, 2.5, 2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1a3858';
  g.stroke();

  // Groucho's mischievous eyes
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(cx - 1, cy - 5, 0.9, 0.7, 0, 0, Math.PI * 2);
  g.ellipse(cx + 1, cy - 5, 0.9, 0.7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0a0a0a';
  g.beginPath();
  g.ellipse(cx - 1, cy - 5, 0.35, 0.3, 0, 0, Math.PI * 2);
  g.ellipse(cx + 1, cy - 5, 0.35, 0.3, 0, 0, Math.PI * 2);
  g.fill();

  // Groucho's grin (he's laughing as he falls!)
  g.strokeStyle = '#0a0a0a';
  g.lineWidth = 0.6;
  g.beginPath();
  g.arc(cx, cy - 3.5, 1.2, 0.2, Math.PI - 0.2);
  g.stroke();

  // Antennae/feelers
  g.strokeStyle = '#3a6898';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - 1, cy - 6.5);
  g.quadraticCurveTo(cx - 2, cy - 8, cx - 1.5, cy - 9);
  g.moveTo(cx + 1, cy - 6.5);
  g.quadraticCurveTo(cx + 2, cy - 8, cx + 1.5, cy - 9);
  g.stroke();

  // Tick mouthparts (proboscis)
  g.strokeStyle = '#2a5888';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx, cy - 3);
  g.lineTo(cx, cy - 1.5);
  g.stroke();
}

export function drawUFO(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // UFO with one-eyed alien pilot!
  const px = snap(x);
  const py = snap(y);
  const cx = px + w * 0.5;

  // Shadow/glow beneath
  g.fillStyle = 'rgba(100, 200, 150, 0.2)';
  g.beginPath();
  g.ellipse(cx, py + h + 2, 12, 3, 0, 0, Math.PI * 2);
  g.fill();

  // Main saucer body
  g.fillStyle = radial(g, cx, py + 7, 1, 12, '#d0e8d8', '#607870');
  g.beginPath();
  g.ellipse(cx, py + 9, 11, 4.5, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#3a5048';
  g.lineWidth = 1;
  g.stroke();

  // Saucer rim detail
  g.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx, py + 8, 9, 3, 0, Math.PI, Math.PI * 2);
  g.stroke();

  // Lights around the rim
  const numLights = 8;
  for (let i = 0; i < numLights; i++) {
    const angle = (i / numLights) * Math.PI * 2;
    const lx = cx + Math.cos(angle) * 8;
    const ly = py + 9 + Math.sin(angle) * 2.5;
    g.fillStyle = i % 2 === 0 ? '#ff6666' : '#66ff66';
    g.beginPath();
    g.arc(lx, ly, 1.2, 0, Math.PI * 2);
    g.fill();
  }

  // Glass dome
  g.fillStyle = radial(g, cx - 2, py + 3, 0.5, 6, 'rgba(200, 240, 255, 0.7)', 'rgba(100, 180, 200, 0.5)');
  g.beginPath();
  g.ellipse(cx, py + 5, 5, 4, 0, Math.PI, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(80, 150, 170, 0.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(cx, py + 5, 5, 4, 0, Math.PI, Math.PI * 2);
  g.stroke();

  // Dome shine
  g.fillStyle = 'rgba(255, 255, 255, 0.4)';
  g.beginPath();
  g.ellipse(cx - 2, py + 3, 1.5, 1, -0.3, 0, Math.PI * 2);
  g.fill();

  // ONE-EYED ALIEN inside dome!
  // Alien body (green)
  g.fillStyle = '#88dd88';
  g.beginPath();
  g.ellipse(cx, py + 4.5, 2.5, 2, 0, 0, Math.PI * 2);
  g.fill();

  // Big single eye
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx, py + 3.5, 1.8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#446644';
  g.lineWidth = 0.5;
  g.stroke();

  // Pupil
  g.fillStyle = '#000000';
  g.beginPath();
  g.arc(cx, py + 3.5, 0.8, 0, Math.PI * 2);
  g.fill();

  // Eye highlight
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(cx - 0.5, py + 3, 0.35, 0, Math.PI * 2);
  g.fill();

  // Small antennae on alien
  g.strokeStyle = '#66aa66';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(cx - 1.5, py + 2.5);
  g.lineTo(cx - 2, py + 1);
  g.moveTo(cx + 1.5, py + 2.5);
  g.lineTo(cx + 2, py + 1);
  g.stroke();

  // Antenna bulbs
  g.fillStyle = '#aaffaa';
  g.beginPath();
  g.arc(cx - 2, py + 1, 0.6, 0, Math.PI * 2);
  g.arc(cx + 2, py + 1, 0.6, 0, Math.PI * 2);
  g.fill();
}

export function drawScorpion(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // GORDON THE GECKO - his B.O. is literally poison!
  const px = snap(x);
  const py = snap(y);
  const cx = px + w * 0.5;
  const cy = py + h * 0.5;

  // Poison aura/stink lines
  g.strokeStyle = 'rgba(100, 255, 100, 0.4)';
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI - Math.PI * 0.5;
    const startX = cx + Math.cos(angle) * 6;
    const startY = cy + Math.sin(angle) * 4;
    g.beginPath();
    g.moveTo(startX, startY);
    g.quadraticCurveTo(
      startX + Math.cos(angle) * 4,
      startY + Math.sin(angle) * 3 - 2,
      startX + Math.cos(angle) * 6,
      startY + Math.sin(angle) * 5 - 4
    );
    g.stroke();
  }

  // Shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(cx, py + h - 1, 6, 1.5, 0, 0, Math.PI * 2);
  g.fill();

  // Four gecko legs
  g.strokeStyle = '#5a6a40';
  g.lineWidth = 1.5;
  // Front legs
  g.beginPath();
  g.moveTo(px + 4, cy);
  g.quadraticCurveTo(px - 2, cy - 2, px - 3, cy + 3);
  g.moveTo(px + w - 4, cy);
  g.quadraticCurveTo(px + w + 2, cy - 2, px + w + 3, cy + 3);
  g.stroke();
  // Back legs
  g.beginPath();
  g.moveTo(px + 3, cy + 1);
  g.quadraticCurveTo(px - 1, cy + 4, px - 2, cy + 5);
  g.moveTo(px + w - 3, cy + 1);
  g.quadraticCurveTo(px + w + 1, cy + 4, px + w + 2, cy + 5);
  g.stroke();

  // Gecko toe pads
  g.fillStyle = '#8aa060';
  g.beginPath();
  g.arc(px - 3, cy + 3, 1.5, 0, Math.PI * 2);
  g.arc(px + w + 3, cy + 3, 1.5, 0, Math.PI * 2);
  g.arc(px - 2, cy + 5, 1.3, 0, Math.PI * 2);
  g.arc(px + w + 2, cy + 5, 1.3, 0, Math.PI * 2);
  g.fill();

  // Tail
  g.strokeStyle = '#6a8a50';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px + w - 2, cy);
  g.quadraticCurveTo(px + w + 4, cy - 1, px + w + 8, cy + 1);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(px + w + 8, cy + 1);
  g.quadraticCurveTo(px + w + 10, cy + 2, px + w + 11, cy);
  g.stroke();

  // Main body (gecko-shaped)
  g.fillStyle = radial(g, cx - 2, cy - 2, 1, 10, '#b8d888', '#6a8a50');
  g.beginPath();
  g.ellipse(cx, cy, 6, 3.5, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#4a6a30';
  g.lineWidth = 1;
  g.stroke();

  // Gecko pattern spots
  g.fillStyle = 'rgba(90, 120, 60, 0.5)';
  g.beginPath();
  g.ellipse(cx - 2, cy - 1, 1.5, 1, 0.3, 0, Math.PI * 2);
  g.ellipse(cx + 2, cy, 1.2, 0.8, -0.2, 0, Math.PI * 2);
  g.ellipse(cx, cy + 1, 1, 0.7, 0, 0, Math.PI * 2);
  g.fill();

  // Shine highlight
  g.fillStyle = 'rgba(220, 255, 200, 0.35)';
  g.beginPath();
  g.ellipse(cx - 2, cy - 1.5, 2, 0.8, -0.2, 0, Math.PI * 2);
  g.fill();

  // Head (slightly larger)
  g.fillStyle = radial(g, px + 2, cy - 1, 0.5, 5, '#c8e898', '#7a9a60');
  g.beginPath();
  g.ellipse(px + 4, cy, 4, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#4a6a30';
  g.stroke();

  // Big gecko eyes (on sides of head)
  g.fillStyle = '#ffff00';
  g.beginPath();
  g.ellipse(px + 2, cy - 1.5, 1.5, 1.2, 0, 0, Math.PI * 2);
  g.ellipse(px + 2, cy + 1.5, 1.5, 1.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#000000';
  g.beginPath();
  g.ellipse(px + 1.5, cy - 1.5, 0.5, 0.8, 0, 0, Math.PI * 2);
  g.ellipse(px + 1.5, cy + 1.5, 0.5, 0.8, 0, 0, Math.PI * 2);
  g.fill();

  // Poison drip from body
  g.fillStyle = 'rgba(150, 255, 100, 0.6)';
  g.beginPath();
  g.ellipse(cx + 1, cy + 4, 1, 1.5, 0, 0, Math.PI * 2);
  g.fill();
}

export function drawPlayer(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  profile: VisualProfile = 'x'
) {
  const px = snap(x);
  const py = snap(y);
  const cx = px + w * 0.5;
  const cy = py + h * 0.6;

  if (profile === 'classic') {
    g.fillStyle = 'rgba(0,0,0,0.27)';
    g.beginPath();
    g.ellipse(cx, py + h - 0.35, 6.5, 1.85, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = radial(g, cx - 1.75, cy - 2.0, 0.6, 8.7, '#92fff6', '#2a90af');
    g.beginPath();
    g.ellipse(cx, cy, 6.35, 4.95, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#134d66';
    g.stroke();

    g.fillStyle = '#d8ffff';
    g.beginPath();
    g.ellipse(cx - 1.9, cy - 1.8, 2.1, 0.92, -0.2, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#1f5e89';
    g.beginPath();
    g.roundRect(cx - 1.1, py - 5.55, 2.2, 6.75, 0.95);
    g.fill();
    g.fillStyle = '#8ff9ff';
    g.fillRect(cx - 0.82, py - 3.95, 1.64, 2.26);
    g.fillStyle = '#ffad64';
    g.beginPath();
    g.ellipse(cx, py - 5.95, 0.62, 0.8, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }

  g.fillStyle = 'rgba(0,0,0,0.29)';
  g.beginPath();
  g.ellipse(cx, py + h - 0.25, 6.2, 1.95, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = linear(g, cx, py + 2.2, cx, py + h - 1.25, '#d3dbe0', '#44586e');
  g.beginPath();
  g.ellipse(cx, py + h - 0.95, 4.7, 2.45, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#273849';
  g.stroke();

  g.fillStyle = radial(g, cx - 1.75, cy - 2.1, 0.65, 8.8, '#8cf8d9', '#1b874f');
  g.beginPath();
  g.ellipse(cx, cy, 6.15, 4.85, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#0f4d38';
  g.lineWidth = 1.04;
  g.beginPath();
  g.ellipse(cx, cy, 6.03, 4.75, 0, 0, Math.PI * 2);
  g.stroke();

  g.fillStyle = '#154f3b';
  g.beginPath();
  g.ellipse(cx - 4.88, cy + 0.82, 1.48, 1.04, 0, 0, Math.PI * 2);
  g.ellipse(cx + 4.88, cy + 0.82, 1.48, 1.04, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(255,255,255,0.26)';
  g.beginPath();
  g.ellipse(cx - 2.0, cy - 1.88, 1.78, 0.8, -0.18, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#153f3d';
  g.beginPath();
  g.roundRect(cx - 1.14, py - 5.46, 2.28, 6.8, 1.0);
  g.fill();
  g.fillStyle = '#90f3df';
  g.fillRect(cx - 0.86, py - 4.02, 1.72, 2.5);
  g.fillStyle = '#f4ad70';
  g.beginPath();
  g.ellipse(cx, py - 6.0, 0.66, 0.88, 0, 0, Math.PI * 2);
  g.fill();
}

export function drawBullet(g: CanvasRenderingContext2D, x: number, y: number, profile: VisualProfile = 'x') {
  const px = snap(x);
  const py = snap(y);

  const bodyDark = profile === 'classic' ? '#7f3c1f' : '#773710';
  const bodyMid = profile === 'classic' ? '#f09444' : '#e58a33';
  const bodyHi = profile === 'classic' ? '#ffe6a5' : '#ffe4a3';

  g.fillStyle = bodyDark;
  g.beginPath();
  g.roundRect(px - 0.1, py + 0.2, 2.2, 8.4, 0.82);
  g.fill();
  g.fillStyle = linear(g, px, py + 0.25, px, py + 8.0, bodyHi, bodyMid);
  g.beginPath();
  g.roundRect(px + 0.1, py + 0.75, 1.8, 6.4, 0.72);
  g.fill();
  g.fillStyle = profile === 'classic' ? 'rgba(255, 250, 186, 0.76)' : 'rgba(255, 241, 182, 0.72)';
  g.beginPath();
  g.ellipse(px + 1.0, py + 1.1, 0.92, 0.72, 0, 0, Math.PI * 2);
  g.fill();
}

export function drawMuzzleFlash(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  intensity: number,
  profile: VisualProfile = 'x'
) {
  const alpha = Math.max(0, Math.min(1, intensity));
  const cx = snap(x + w / 2);
  const cy = snap(y - 5);

  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, 7);
  if (profile === 'classic') {
    grad.addColorStop(0, `rgba(255, 250, 188, ${0.9 * alpha})`);
    grad.addColorStop(0.5, `rgba(255, 164, 88, ${0.55 * alpha})`);
  } else {
    grad.addColorStop(0, `rgba(255, 241, 179, ${0.9 * alpha})`);
    grad.addColorStop(0.5, `rgba(255, 188, 96, ${0.55 * alpha})`);
  }
  grad.addColorStop(1, 'rgba(255, 130, 48, 0)');

  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, 7, 0, Math.PI * 2);
  g.fill();
}
