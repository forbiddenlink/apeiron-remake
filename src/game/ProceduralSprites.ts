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
  const cx = x + CELL/2;
  const cy = y + CELL/2;
  
  // Save context for rotation effects
  g.save();
  g.translate(cx, cy);
  
  // Outer energy field
  g.fillStyle = `rgba(${hexToRgb(glowColor)},0.15)`;
  g.beginPath();
  for(let i = 0; i < 6; i++) {
    const angle = (i/6) * Math.PI * 2;
    const px = Math.cos(angle) * (CELL/2 + 2);
    const py = Math.sin(angle) * (CELL/2 + 2);
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  
  // Crystal base shape
  g.rotate(head ? Math.PI/4 : -Math.PI/4);
  
  // Outer crystal facets
  g.fillStyle = `rgba(${hexToRgb(glowColor)},0.3)`;
  g.beginPath();
  g.moveTo(-CELL/2, 0);
  g.lineTo(0, -CELL/2);
  g.lineTo(CELL/2, 0);
  g.lineTo(0, CELL/2);
  g.closePath();
  g.fill();
  
  // Inner crystal core
  g.fillStyle = baseColor;
  const innerSize = CELL * 0.4;
  g.beginPath();
  g.moveTo(-innerSize, 0);
  g.lineTo(0, -innerSize);
  g.lineTo(innerSize, 0);
  g.lineTo(0, innerSize);
  g.closePath();
  g.fill();
  
  // Energy core
  g.fillStyle = glowColor;
  const coreSize = CELL * 0.2;
  g.beginPath();
  g.moveTo(-coreSize, 0);
  g.lineTo(0, -coreSize);
  g.lineTo(coreSize, 0);
  g.lineTo(0, coreSize);
  g.closePath();
  g.fill();
  
  if (head) {
    // Reset rotation for head features
    g.rotate(-Math.PI/4);
    
    // Energy antenna
    const antennaLength = CELL * 0.4;
    const antennaWidth = CELL * 0.15;
    
    // Left antenna
    g.fillStyle = glowColor;
    g.beginPath();
    g.moveTo(-CELL/4, -CELL/4);
    g.lineTo(-CELL/4 - antennaWidth, -CELL/4 - antennaLength);
    g.lineTo(-CELL/4 + antennaWidth, -CELL/4 - antennaLength);
    g.closePath();
    g.fill();
    
    // Right antenna
    g.beginPath();
    g.moveTo(CELL/4, -CELL/4);
    g.lineTo(CELL/4 - antennaWidth, -CELL/4 - antennaLength);
    g.lineTo(CELL/4 + antennaWidth, -CELL/4 - antennaLength);
    g.closePath();
    g.fill();
    
    // Glowing eyes
    const eyeSize = CELL * 0.15;
    const eyeOffset = CELL * 0.25;
    
    // Eye sockets
    g.fillStyle = colors.outline;
    g.beginPath();
    g.arc(-eyeOffset, -eyeOffset, eyeSize, 0, Math.PI * 2);
    g.arc(eyeOffset, -eyeOffset, eyeSize, 0, Math.PI * 2);
    g.fill();
    
    // Eye glow
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(-eyeOffset, -eyeOffset, eyeSize * 0.5, 0, Math.PI * 2);
    g.arc(eyeOffset, -eyeOffset, eyeSize * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  
  // Energy particles
  g.fillStyle = `rgba(255,255,255,0.6)`;
  for(let i = 0; i < (head ? 4 : 2); i++) {
    const angle = (Math.random() * Math.PI * 2);
    const dist = Math.random() * CELL * 0.3;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    g.fillRect(px-1, py-1, 2, 2);
  }
  
  g.restore();
}
}

export function drawSpider(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  const cx = x + w/2;
  const cy = y + h/2;
  
  g.save();
  g.translate(cx, cy);
  
  // Outer energy field
  g.fillStyle = `rgba(${hexToRgb(colors.spiderGlow)},0.15)`;
  g.beginPath();
  for(let i = 0; i < 8; i++) {
    const angle = (i/8) * Math.PI * 2;
    const radius = (w/2 + 4) * (1 + Math.cos(angle * 4) * 0.2);
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  
  // Crystal body structure
  const drawCrystal = (size: number, color: string, alpha = 1) => {
    g.fillStyle = alpha < 1 ? `rgba(${hexToRgb(color)},${alpha})` : color;
    g.beginPath();
    // Top crystal
    g.moveTo(0, -size);
    g.lineTo(size * 0.7, -size * 0.3);
    g.lineTo(0, 0);
    g.lineTo(-size * 0.7, -size * 0.3);
    g.closePath();
    g.fill();
    // Bottom crystal
    g.beginPath();
    g.moveTo(0, size);
    g.lineTo(size * 0.7, size * 0.3);
    g.lineTo(0, 0);
    g.lineTo(-size * 0.7, size * 0.3);
    g.closePath();
    g.fill();
  };
  
  // Outer crystal layer
  drawCrystal(w * 0.6, colors.spiderGlow, 0.3);
  // Middle crystal layer
  drawCrystal(w * 0.5, colors.spiderGlow);
  // Core crystal
  drawCrystal(w * 0.35, colors.spider);
  // Energy core
  drawCrystal(w * 0.2, '#ffffff', 0.4);
  
  // Energy legs (3 pairs)
  g.strokeStyle = `rgba(${hexToRgb(colors.spiderGlow)},0.6)`;
  g.lineWidth = 2;
  
  const drawLeg = (angle: number, length: number, forward: boolean) => {
    const baseAngle = angle + (forward ? 0.3 : -0.3);
    const midX = Math.cos(baseAngle) * length * 0.6;
    const midY = Math.sin(baseAngle) * length * 0.6;
    const endX = Math.cos(angle) * length;
    const endY = Math.sin(angle) * length;
    
    // Energy flow effect
    const flowOffset = (Date.now() % 1000) / 1000;
    const flowPos = forward ? flowOffset : 1 - flowOffset;
    
    // Main leg beam
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);
    g.stroke();
    
    // Energy particle
    const particleX = endX * flowPos;
    const particleY = endY * flowPos;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(particleX, particleY, 1.5, 0, Math.PI * 2);
    g.fill();
  };
  
  // Draw all legs
  for(let i = 0; i < 3; i++) {
    const angle = (i/3) * Math.PI - Math.PI/6;
    const length = w * 0.8;
    // Left leg
    drawLeg(angle, length, true);
    // Right leg
    drawLeg(Math.PI - angle, length, false);
  }
  
  // Glowing eyes
  const eyeOffset = w * 0.2;
  const eyeSize = w * 0.1;
  
  // Eye sockets
  g.fillStyle = colors.outline;
  g.beginPath();
  g.arc(-eyeOffset, -h * 0.2, eyeSize, 0, Math.PI * 2);
  g.arc(eyeOffset, -h * 0.2, eyeSize, 0, Math.PI * 2);
  g.fill();
  
  // Eye glow
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(-eyeOffset, -h * 0.2, eyeSize * 0.6, 0, Math.PI * 2);
  g.arc(eyeOffset, -h * 0.2, eyeSize * 0.6, 0, Math.PI * 2);
  g.fill();
  
  // Energy particles
  g.fillStyle = `rgba(255,255,255,0.6)`;
  for(let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * w * 0.3;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    g.fillRect(px-1, py-1, 2, 2);
  }
  
  g.restore();
}

export function drawFlea(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  const cx = x + w/2;
  const cy = y + h/2;
  
  g.save();
  g.translate(cx, cy);
  
  // Energy field with trailing effect
  const trailCount = 3;
  for(let t = 0; t < trailCount; t++) {
    const alpha = 0.1 * (1 - t/trailCount);
    const offset = t * 4;
    
    g.fillStyle = `rgba(${hexToRgb(colors.fleaGlow)},${alpha})`;
    g.beginPath();
    for(let i = 0; i < 6; i++) {
      const angle = (i/6) * Math.PI * 2;
      const radius = (w/2 + 2) * (1 + Math.cos(angle * 2) * 0.2);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius + offset;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }
  
  // Crystal structure
  const drawCrystalShard = (size: number, angle: number, color: string, alpha = 1) => {
    const width = size * 0.4;
    g.fillStyle = alpha < 1 ? `rgba(${hexToRgb(color)},${alpha})` : color;
    g.save();
    g.rotate(angle);
    g.beginPath();
    g.moveTo(0, -size);
    g.lineTo(width, 0);
    g.lineTo(0, size);
    g.lineTo(-width, 0);
    g.closePath();
    g.fill();
    g.restore();
  };
  
  // Draw multiple crystal shards for body
  const shardCount = 5;
  const baseSize = h * 0.4;
  
  // Outer crystal layer
  for(let i = 0; i < shardCount; i++) {
    const angle = (i/shardCount) * Math.PI * 2;
    drawCrystalShard(baseSize * 1.2, angle, colors.fleaGlow, 0.3);
  }
  
  // Middle crystal layer
  for(let i = 0; i < shardCount; i++) {
    const angle = (i/shardCount) * Math.PI * 2 + Math.PI/shardCount;
    drawCrystalShard(baseSize, angle, colors.fleaGlow);
  }
  
  // Core crystal
  for(let i = 0; i < shardCount; i++) {
    const angle = (i/shardCount) * Math.PI * 2 + Math.PI/shardCount * 0.5;
    drawCrystalShard(baseSize * 0.7, angle, colors.flea);
  }
  
  // Energy core
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.4;
  g.beginPath();
  g.arc(0, 0, baseSize * 0.2, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  
  // Energy trails
  const trailLength = 5;
  const trailSpacing = 3;
  g.strokeStyle = `rgba(${hexToRgb(colors.fleaGlow)},0.4)`;
  g.lineWidth = 2;
  
  for(let i = 0; i < trailLength; i++) {
    const alpha = 0.4 * (1 - i/trailLength);
    const yOffset = i * trailSpacing + 2;
    
    // Left trail
    g.beginPath();
    g.moveTo(-w * 0.3, yOffset);
    g.lineTo(-w * 0.1, yOffset + trailSpacing);
    g.strokeStyle = `rgba(${hexToRgb(colors.fleaGlow)},${alpha})`;
    g.stroke();
    
    // Right trail
    g.beginPath();
    g.moveTo(w * 0.3, yOffset);
    g.lineTo(w * 0.1, yOffset + trailSpacing);
    g.stroke();
  }
  
  // Energy particles
  g.fillStyle = `rgba(255,255,255,0.6)`;
  for(let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * w * 0.3;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    g.fillRect(px-1, py-1, 2, 2);
  }
  
  g.restore();
}

export function drawUFO(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Save context state
  g.save();
  
  // UFO body
  g.fillStyle = COLORS.UFO;
  g.beginPath();
  g.ellipse(x + w/2, y + h * 0.6, w * 0.4, h * 0.25, 0, 0, Math.PI * 2);
  g.fill();
  
  // UFO dome
  g.fillStyle = COLORS.UFO_DOME;
  g.beginPath();
  g.ellipse(x + w/2, y + h * 0.4, w * 0.25, h * 0.3, 0, Math.PI, 0);
  g.fill();
  
  // Energy field
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = COLORS.UFO_GLOW;
  g.beginPath();
  g.ellipse(x + w/2, y + h/2, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
  g.fill();
  
  // Beam effect
  const beamGradient = g.createLinearGradient(x + w/2, y + h, x + w/2, y + h * 2);
  beamGradient.addColorStop(0, 'rgba(100,255,255,0.3)');
  beamGradient.addColorStop(1, 'rgba(100,255,255,0)');
  g.fillStyle = beamGradient;
  g.beginPath();
  g.moveTo(x + w * 0.3, y + h);
  g.lineTo(x + w * 0.7, y + h);
  g.lineTo(x + w * 0.9, y + h * 2);
  g.lineTo(x + w * 0.1, y + h * 2);
  g.closePath();
  g.fill();
  
  // Restore context state
  g.restore();
}

export function drawScorpion(g:CanvasRenderingContext2D, x:number, y:number, w:number, h:number){
  const cx = x + w/2;
  const cy = y + h/2;
  
  g.save();
  g.translate(cx, cy);
  
  // Energy field
  const fieldPoints = 8;
  g.fillStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.15)`;
  g.beginPath();
  for(let i = 0; i < fieldPoints; i++) {
    const angle = (i/fieldPoints) * Math.PI * 2;
    const radius = (w/2 + 4) * (1 + Math.cos(angle * 3) * 0.3);
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  
  // Crystal body segments
  const segmentCount = 3;
  const segmentSpacing = w * 0.2;
  const baseSize = h * 0.3;
  
  for(let seg = 0; seg < segmentCount; seg++) {
    const xOffset = (seg - 1) * segmentSpacing;
    const scale = seg === 1 ? 1 : 0.8; // Middle segment larger
    
    // Outer crystal layer
    g.fillStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.3)`;
    g.beginPath();
    g.moveTo(xOffset - baseSize * scale, 0);
    g.lineTo(xOffset, -baseSize * scale);
    g.lineTo(xOffset + baseSize * scale, 0);
    g.lineTo(xOffset, baseSize * scale);
    g.closePath();
    g.fill();
    
    // Inner crystal
    g.fillStyle = colors.scorpion;
    const innerScale = scale * 0.7;
    g.beginPath();
    g.moveTo(xOffset - baseSize * innerScale, 0);
    g.lineTo(xOffset, -baseSize * innerScale);
    g.lineTo(xOffset + baseSize * innerScale, 0);
    g.lineTo(xOffset, baseSize * innerScale);
    g.closePath();
    g.fill();
    
    // Energy core
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.4;
    g.beginPath();
    g.arc(xOffset, 0, baseSize * scale * 0.2, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  
  // Crystal tail segments
  const tailSegments = 4;
  const tailAngle = -Math.PI/6; // Tail raised angle
  const tailSpacing = w * 0.15;
  const tailBaseSize = h * 0.2;
  
  g.save();
  g.rotate(tailAngle);
  
  for(let i = 0; i < tailSegments; i++) {
    const xOffset = w * 0.3 + i * tailSpacing;
    const scale = 1 - i * 0.15;
    
    // Tail segment crystal
    g.fillStyle = colors.scorpionGlow;
    g.beginPath();
    g.moveTo(xOffset - tailBaseSize * scale, -tailBaseSize * scale);
    g.lineTo(xOffset + tailBaseSize * scale, 0);
    g.lineTo(xOffset - tailBaseSize * scale, tailBaseSize * scale);
    g.closePath();
    g.fill();
    
    // Energy flow
    if (i < tailSegments - 1) {
      g.strokeStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.6)`;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(xOffset + tailBaseSize * scale, 0);
      g.lineTo(xOffset + tailSpacing, 0);
      g.stroke();
    }
  }
  
  // Tail stinger
  const stingerSize = h * 0.15;
  const stingerX = w * 0.3 + tailSegments * tailSpacing;
  
  // Stinger crystal
  g.fillStyle = colors.scorpionGlow;
  g.beginPath();
  g.moveTo(stingerX, -stingerSize);
  g.lineTo(stingerX + stingerSize * 1.5, 0);
  g.lineTo(stingerX, stingerSize);
  g.closePath();
  g.fill();
  
  // Stinger energy core
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.6;
  g.beginPath();
  g.arc(stingerX + stingerSize * 0.5, 0, stingerSize * 0.3, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  
  g.restore();
  
  // Pincers
  const pincerSize = w * 0.25;
  const pincerOffset = w * 0.4;
  
  const drawPincer = (side: number) => { // side: 1 for right, -1 for left
    const baseX = side * pincerOffset;
    
    // Pincer crystal
    g.fillStyle = colors.scorpionGlow;
    g.beginPath();
    g.moveTo(baseX, -pincerSize * 0.3);
    g.lineTo(baseX + side * pincerSize * 0.7, -pincerSize * 0.7);
    g.lineTo(baseX + side * pincerSize, -pincerSize * 0.3);
    g.lineTo(baseX + side * pincerSize * 0.7, 0);
    g.closePath();
    g.fill();
    
    // Energy flow
    g.strokeStyle = `rgba(${hexToRgb(colors.scorpionGlow)},0.4)`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(baseX, 0);
    g.lineTo(baseX + side * pincerSize * 0.7, -pincerSize * 0.5);
    g.stroke();
  };
  
  drawPincer(-1); // Left pincer
  drawPincer(1);  // Right pincer
  
  // Energy particles
  g.fillStyle = `rgba(255,255,255,0.6)`;
  for(let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * w * 0.3;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    g.fillRect(px-1, py-1, 2, 2);
  }
  
  g.restore();
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
