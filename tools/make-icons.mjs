#!/usr/bin/env node
/**
 * make-icons.mjs -- regenerate the favicon, app icons and social card from the
 * game's own procedural art. No image editor involved: it boots a Vite dev
 * server, draws with the real Engine and sprite code in a headless page, and
 * screenshots the result.
 *
 * Usage: node tools/make-icons.mjs
 * Writes: public/favicon.png (64), public/icon-192.png, public/icon-512.png,
 *         public/og-image.png (1200x630)
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5199

// Runs in the page. Starts the 3D sprite bake and waits for every tile. Headless
// Chromium renders in software, so this takes around half a minute.
async function waitForSprites() {
  const baker = await import('/src/game/render3d/SpriteBaker.ts')
  const atlas = baker.bakeSprites()
  if (!atlas) return false
  const started = Date.now()
  while (!atlas.tiles.has('mush:reflective') && Date.now() - started < 180000) {
    await new Promise((r) => setTimeout(r, 250))
  }
  return atlas.tiles.has('mush:reflective')
}

// Runs in the page. Draws a square icon: the crystal on the field color.
async function drawIcon(size) {
  const sprites = await import('/src/game/ProceduralSprites.ts')
  const baker = await import('/src/game/render3d/SpriteBaker.ts')
  const canvas = document.createElement('canvas')
  canvas.id = 'out'
  canvas.width = size
  canvas.height = size
  document.body.replaceChildren(canvas)
  const g = canvas.getContext('2d')
  const bg = g.createRadialGradient(size * 0.4, size * 0.35, 0, size / 2, size / 2, size * 0.75)
  bg.addColorStop(0, '#e2bb4a')
  bg.addColorStop(1, '#9a7420')
  g.fillStyle = bg
  g.fillRect(0, 0, size, size)
  // One crystal, centered, filling the icon: 26 game units span it.
  const k = size / 26
  g.setTransform(k, 0, 0, k, 0, 0)
  const atlas = baker.getSharedAtlas()
  if (!atlas || !baker.drawTile(g, atlas, 'crystal:3', 13, 12.5)) {
    const w = 16 * 1.42
    const h = 16 * 1.08
    sprites.drawPlayer(g, (26 - w) / 2, 7.5, w, h, 'classic', 0.2)
  }
}

// Runs in the page. Draws the 1200x630 social card from a real seeded run.
async function drawCard() {
  const { Engine } = await import('/src/game/Engine.ts')
  const W = 1200
  const H = 630
  const game = document.createElement('canvas')
  const engine = new Engine(game, 800, 592)
  engine.setPixelRatio(3)
  engine.updateSettings({ ...engine.settings, movingBackdrops: false })
  engine.startNewGame(0x1995)
  // Wait for the terrain-lit backdrops (the sprites were baked before this ran).
  const started = Date.now()
  while (engine.backgroundEffects.lit.size < 12 && Date.now() - started < 120000) {
    await new Promise((r) => setTimeout(r, 250))
  }
  for (let i = 0; i < 220; i++) {
    engine.invulnT = 1
    engine.tick(1 / 60)
  }
  engine.invulnT = 0
  engine.draw()
  engine.destroy()

  const canvas = document.createElement('canvas')
  canvas.id = 'out'
  canvas.width = W
  canvas.height = H
  document.body.replaceChildren(canvas)
  const g = canvas.getContext('2d')
  // A wide slice of the playfield, top area where the Pentipede is.
  const srcW = 592 * 3
  const srcH = Math.round(srcW * (H / W))
  g.drawImage(game, 0, 0, srcW, srcH, 0, 0, W, H)
  const shade = g.createLinearGradient(0, 0, 0, H)
  shade.addColorStop(0, 'rgba(0,0,0,0.15)')
  shade.addColorStop(0.55, 'rgba(0,0,0,0.5)')
  shade.addColorStop(1, 'rgba(0,0,0,0.78)')
  g.fillStyle = shade
  g.fillRect(0, 0, W, H)
  g.textAlign = 'center'
  g.font = '700 150px "Times New Roman", Georgia, serif'
  g.lineWidth = 10
  g.strokeStyle = 'rgba(20,10,4,0.9)'
  g.strokeText('APEIRON', W / 2, 400)
  const gold = g.createLinearGradient(0, 290, 0, 410)
  gold.addColorStop(0, '#ffe08a')
  gold.addColorStop(1, '#d8841e')
  g.fillStyle = gold
  g.fillText('APEIRON', W / 2, 400)
  g.font = '34px Menlo, Consolas, monospace'
  g.fillStyle = '#d6eef4'
  g.fillText('A fan remake of the 1995 Macintosh classic', W / 2, 470)
  g.font = '26px Menlo, Consolas, monospace'
  g.fillStyle = '#9fd6e2'
  g.fillText('Plays in your browser. Mouse, keyboard, touch or gamepad.', W / 2, 520)
}

async function main() {
  const server = await createServer({
    root,
    server: { port: PORT, strictPort: true },
    logLevel: 'error',
  })
  await server.listen()
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    })
    await page.goto(`http://localhost:${PORT}/tools/blank.html`, { waitUntil: 'domcontentloaded' })
    const shoot = async (file) => {
      const png = await page.locator('#out').screenshot({ type: 'png', omitBackground: false })
      writeFileSync(path.join(root, 'public', file), png)
      console.log(`wrote public/${file} (${png.length} bytes)`)
    }
    console.log('baking 3D sprites (software WebGL, about 30 s)...')
    const baked = await page.evaluate(waitForSprites)
    if (!baked) console.log('3D bake unavailable: using the flat sprites')
    for (const [file, size] of [
      ['favicon.png', 64],
      ['icon-192.png', 192],
      ['icon-512.png', 512],
    ]) {
      await page.evaluate(drawIcon, size)
      await shoot(file)
    }
    await page.evaluate(drawCard)
    await shoot('og-image.png')
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
