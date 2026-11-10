// Debug aid: times the 3D sprite bake in headless Chromium against the preview server (:4173).
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (m) => console.log('console:', m.type(), m.text().slice(0, 200)))
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 300)))
const t0 = Date.now()
await page.addInitScript(() => {
  window.__APEIRON_TEST__ = true
  window.__APEIRON_3D__ = true
})
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
try {
  await page.waitForFunction(() => !!window.__apeironEngine, null, { timeout: 60000 })
  console.log('engine ready after ms', Date.now() - t0)
  await page.waitForFunction(() => window.__apeironEngine.atlas?.tiles.size >= 89, null, {
    timeout: 120000,
  })
  console.log('all tiles baked after ms', Date.now() - t0)
  console.log(
    'atlas',
    await page.evaluate(() => {
      const a = window.__apeironEngine.atlas
      return a ? [a.canvas.width, a.canvas.height, a.tiles.size] : null
    })
  )
  console.log(
    'renderer',
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2')
      if (!gl) return 'no webgl2'
      const e = gl.getExtension('WEBGL_debug_renderer_info')
      return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'
    })
  )
} catch (e) {
  console.log('timeout', Date.now() - t0, String(e).slice(0, 120))
}
await browser.close()
