import { CELL } from './Constants';

// Helper function to convert hex colors to RGB
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// Apeiron's psychedelic color palette
const colors = {
  bg: '#000000',
  // Crystal mushrooms with poison effect
  mushStem: '#4a90e2',
  mushCap: '#64b5f6',
  mushCapSpot: '#e3f2fd',
  mushStemPoison: '#8e24aa',
  mushCapPoison: '#ab47bc',
  // Pentipede segments with glow effect
  seg: '#76ff03',
  segGlow: '#b2ff59',
  head: '#ffeb3b',
  headGlow: '#fff176',
  segOutline: '#33691e',
  // Unique enemy colors
  spider: '#ff4081',
  spiderGlow: '#ff80ab',
  flea: '#7c4dff',
  fleaGlow: '#b388ff',
  scorpion: '#ff6e40',
  scorpionGlow: '#ff9e80',
  // Player crystal shard
  player: '#18ffff',
  playerGlow: '#84ffff',
  barrel: '#00e5ff',
  bullet: '#ffffff',
  bulletGlow: '#e1f5fe',
  // Effects
  outline: '#000000',
  shadow: '#0a0a0a',
  particleBase: '#ffffff',
  particleGlow: '#b3e5fc'
} as const;

function mushCapByHp(poisoned:boolean, hp:number){
  // 4..1 hp, darker as hp decreases
  if (poisoned){
    return hp>=4 ? '#ff4fc8' : hp===3 ? '#e247b4' : hp===2 ? '#c53da0' : '#a8348b';
  }
  return hp>=4 ? '#3bd46a' : hp===3 ? '#35be60' : hp===2 ? '#2ea756' : '#288f4b';
}

export function drawMushroom(g:CanvasRenderingContext2D, x:number, y:number, poisoned:boolean, hp:number){
  const baseColor = poisoned ? colors.mushCapPoison : colors.mushCap;
  const stemColor = poisoned ? colors.mushStemPoison : colors.mushStem;
  
  // Glow effect
  g.fillStyle = `rgba(${hexToRgb(baseColor)},0.2)`;
  g.fillRect(x, y, CELL, CELL);
  
  // Crystal base shape
  g.fillStyle = colors.outline;
  g.fillRect(x+2, y+2, CELL-4, CELL-4);
  
  // Main crystal body
  g.fillStyle = baseColor;
  // Top crystal point
  g.fillRect(x + CELL/2 - 2, y + 3, 4, CELL - 8);
  // Side facets
  g.fillRect(x + 3, y + CELL/2 - 2, CELL - 6, 4);
  
  // Stem/base
  g.fillStyle = stemColor;
  g.fillRect(x + CELL/2 - 3, y + CELL - 6, 6, 4);
  
  // Highlight/sparkle
  g.fillStyle = colors.mushCapSpot;
  g.fillRect(x + CELL/2 - 1, y + 5, 2, 2);
  g.fillRect(x + CELL/2 + 2, y + CELL/2 - 1, 2, 2);
  
  // HP indicators as crystal fragments
  if (hp < 4){
    g.fillStyle = colors.outline;
    for (let i=0;i<4-hp;i++){
      const px = x + 4 + i*3;
      g.fillRect(px, y+CELL-4, 2, 2);
      g.fillRect(px+1, y+CELL-3, 1, 1);
    }
  }
}
}

export function drawSegment(g:CanvasRenderingContext2D, x:number, y:number, head:boolean){
  const baseColor = head ? colors.head : colors.seg;
  const glowColor = head ? colors.headGlow : colors.segGlow;
  
  // Outer glow
  g.fillStyle = `rgba(${hexToRgb(glowColor)},0.2)`;
  g.fillRect(x, y, CELL, CELL);
  
  // Inner glow
  g.fillStyle = `rgba(${hexToRgb(glowColor)},0.4)`;
  g.fillRect(x+1, y+1, CELL-2, CELL-2);
  
  // Base shape
  g.fillStyle = colors.segOutline;
  g.fillRect(x+2, y+2, CELL-4, CELL-4);
  
  // Glowing body
  g.fillStyle = baseColor;
  g.fillRect(x+3, y+3, CELL-6, CELL-6);
  
  // Core highlight
  g.fillStyle = glowColor;
  g.fillRect(x+5, y+5, CELL-10, CELL-10);
  
  if (head) {
    // Glowing eyes
    g.fillStyle = colors.outline;
    g.fillRect(x+4, y+4, 3,3);
    g.fillRect(x+CELL-7, y+4, 3,3);
    g.fillStyle = '#ffffff';
    g.fillRect(x+5, y+5, 1,1);
    g.fillRect(x+CELL-6, y+5, 1,1);
    
    // Energy antenna
    g.fillStyle = glowColor;
    g.fillRect(x+3, y+2, 2,1);
    g.fillRect(x+CELL-5, y+2, 2,1);
  }
}

export function drawSpider(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  // Outer glow
  g.fillStyle = `rgba(${hexToRgb(colors.spiderGlow)},0.2)`;
  g.fillRect(x-1, y-1, w+2, h+2);
  
  // Body glow
  g.fillStyle = colors.spiderGlow;
  g.fillRect(x+1, y+1, w-2, h-2);
  
  // Core body
  g.fillStyle = colors.spider;
  g.fillRect(x+3, y+3, w-6, h-6);
  
  // Energy legs
  g.fillStyle = `rgba(${hexToRgb(colors.spiderGlow)},0.6)`;
  // Front legs
  g.fillRect(x-4, y, 4, 2);
  g.fillRect(x+w, y, 4, 2);
  // Middle legs
  g.fillRect(x-3, y+h/2-1, 3, 2);
  g.fillRect(x+w, y+h/2-1, 3, 2);
  // Back legs
  g.fillRect(x-4, y+h-2, 4, 2);
  g.fillRect(x+w, y+h-2, 4, 2);
  
  // Eye glints
  g.fillStyle = '#ffffff';
  g.fillRect(x+4, y+4, 2, 2);
  g.fillRect(x+w-6, y+4, 2, 2);
}

export function drawFlea(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  // Energy field
  g.fillStyle = `rgba(${hexToRgb(colors.fleaGlow)},0.2)`;
  g.fillRect(x-2, y-2, w+4, h+4);
  
  // Core body
  g.fillStyle = colors.flea;
  g.fillRect(x, y, w, h);
  
  // Energy trails
  g.fillStyle = `rgba(${hexToRgb(colors.fleaGlow)},0.4)`;
  for(let i = 0; i < 3; i++) {
    g.fillRect(x+2, y-i*3-1, w-4, 1);
  }
}

export function drawScorpion(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  // Energy aura
  g.fillStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.2)`;
  g.fillRect(x-2, y-2, w+4, h+4);
  
  // Main body
  g.fillStyle = colors.scorpion;
  g.fillRect(x, y, w, h);
  
  // Tail
  g.fillStyle = colors.scorpionGlow;
  g.fillRect(x+w-4, y-3, 2, 3);
  g.fillRect(x+w-3, y-4, 2, 2);
  
  // Energy pulses
  g.fillStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.5)`;
  g.fillRect(x+2, y+2, 2, h-4);
  g.fillRect(x+w-4, y+2, 2, h-4);
}

export function drawPlayer(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  // Outer glow
  g.fillStyle = `rgba(${hexToRgb(colors.playerGlow)},0.2)`;
  g.fillRect(x-1, y-1, w+2, h+2);
  
  // Crystal base shape
  g.fillStyle = colors.outline;
  g.fillRect(x, y, w, h);
  
  // Main crystal body
  g.fillStyle = colors.player;
  g.fillRect(x+1, y+1, w-2, h-2);
  
  // Inner glow
  g.fillStyle = colors.playerGlow;
  g.fillRect(x+3, y+3, w-6, h-6);
  
  // Energy barrel
  g.fillStyle = `rgba(${hexToRgb(colors.barrel)},0.3)`;
  g.fillRect(x + w/2 - 3, y - 8, 6, 8);
  g.fillStyle = colors.barrel;
  g.fillRect(x + w/2 - 2, y - 7, 4, 7);
  
  // Energy tip
  g.fillStyle = '#ffffff';
  g.fillRect(x + w/2 - 1, y - 8, 2, 2);
}

export function drawBullet(g:CanvasRenderingContext2D, x:number, y:number){
  // Energy bolt glow
  g.fillStyle = `rgba(${hexToRgb(colors.bulletGlow)},0.3)`;
  g.fillRect(Math.floor(x)-1, y, 3, 8);
  
  // Core energy beam
  g.fillStyle = colors.bullet;
  g.fillRect(Math.floor(x), y, 1, 8);
  
  // Energy tip
  g.fillStyle = '#ffffff';
  g.fillRect(Math.floor(x), y, 1, 2);
}

export function drawMuzzleFlash(g:CanvasRenderingContext2D, x:number, y:number, w:number, intensity:number){
  // intensity 0..1 controls alpha/size; render an energy burst flash
  const alpha = Math.max(0, Math.min(1, intensity));
  const size = 3 + Math.floor(3*alpha);
  const cx = Math.floor(x + w/2);
  const cy = Math.floor(y - 10);
  
  // Outer energy burst
  g.fillStyle = `rgba(${hexToRgb(colors.bulletGlow)},${0.3*alpha})`;
  g.fillRect(cx-size-1, cy-size-1, (size+1)*2, (size+1)*2);
  
  // Inner energy cross
  g.fillStyle = `rgba(${hexToRgb(colors.bullet)},${0.7*alpha})`;
  g.fillRect(cx-size, cy, size*2, 1);
  g.fillRect(cx, cy-size, 1, size*2);
  
  // Core flash
  g.fillStyle = `rgba(255,255,255,${0.9*alpha})`;
  g.fillRect(cx-1, cy-1, 2, 2);
}
