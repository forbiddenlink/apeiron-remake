/**
 * Shared Playwright boot for the Apeiron headless harness.
 *
 * Every entry point (capture / baseline / profile / playtest) gets a FRESH
 * browser context so no particle age, decal buffer, or localStorage state
 * leaks between runs -- the isolation lesson from Claude-of-Duty's baseline.mjs.
 */
import { chromium } from 'playwright'
import { installDeterminism, installProfiler } from './determinism.js'

export const DEFAULT_URL = process.env.APEIRON_URL || 'http://localhost:4173/'

/**
 * Launch a deterministic, isolated page pointed at the running app.
 * @param {{ url?: string, seed?: number, width?: number, height?: number, headless?: boolean }} [opts]
 */
export async function bootPage(opts = {}) {
  const url = opts.url || DEFAULT_URL
  const seed = opts.seed ?? 0x1234abcd
  const width = opts.width ?? 1280
  const height = opts.height ?? 800

  const browser = await chromium.launch({ headless: opts.headless !== false })
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1, // DPR 1 -> reproducible pixel dimensions
    reducedMotion: 'reduce',
  })

  // Install determinism (frozen clock) OR the real-time profiler recorder
  // BEFORE any app script runs.
  if (opts.profile) {
    await context.addInitScript(installProfiler, { seed })
  } else {
    await context.addInitScript(installDeterminism, { seed })
  }

  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // Wait until the engine mounts and exposes its test handle.
  await page.waitForFunction(() => !!window.__apeironEngine, null, { timeout: 15000 })

  return {
    browser,
    context,
    page,
    consoleErrors,
    pageErrors,
    async close() {
      await context.close()
      await browser.close()
    },
  }
}

/** Start a fresh run (leaves title -> playing) then let it settle one frame. */
export async function startRun(page) {
  await page.evaluate(() => {
    const e = window.__apeironEngine
    e.startNewGame()
  })
}

/** Advance exactly `frames` deterministic fixed steps. */
export async function pump(page, frames) {
  await page.evaluate((n) => window.__apeironPump(n), frames)
}

/** Read a snapshot of engine gameplay state for assertions. */
export async function readState(page) {
  return page.evaluate(() => {
    const e = window.__apeironEngine
    return {
      mode: e.mode,
      score: e.score,
      highScore: e.highScore,
      lives: e.lives,
      level: e.level,
    }
  })
}

/** Screenshot the game canvas only (not the DOM HUD / sparticles overlay). */
export async function shootCanvas(page) {
  const canvas = page.locator('canvas').first()
  return canvas.screenshot({ type: 'png' })
}
