import { YUMMIES } from './GameConfig'
import type { VisualProfile } from './ProceduralSprites'

// Everything the right-hand panel shows. Engine fills this in each frame; the
// renderer holds no game state of its own.
export interface SidebarState {
  profile: VisualProfile
  score: number
  bonus: number
  lives: number
  wave: number
  hasLock: boolean
  hasDiamond: boolean
  hasGun: boolean
  autofireTime: number
}

// Draws the score panel: logo, Score, Bonus, Lives, Yummy strip and Wave.
export class SidebarRenderer {
  private texture: HTMLCanvasElement | null = null
  private textureWidth = 0

  constructor(private height: number) {}

  draw(g: CanvasRenderingContext2D, x: number, w: number, state: SidebarState) {
    if (w <= 0) return
    const profile = state.profile
    const classicProfile = profile === 'classic'

    if (!this.texture || this.textureWidth !== w) {
      this.texture = this.buildTexture(w, this.height)
      this.textureWidth = w
    }
    g.drawImage(this.texture, x, 0)

    g.fillStyle = '#1f2629'
    g.fillRect(x, 0, 2, this.height)
    g.fillStyle = '#6d6e6f'
    g.fillRect(x + 2, 0, 1, this.height)

    g.save()
    g.translate(x, 0)

    // The logo is drawn, not loaded: no image files (ARCHITECTURE.md invariant 3).
    {
      g.strokeStyle = classicProfile ? '#be8730' : '#ad7e32'
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(w * 0.5, 36, w * 0.42, 25, -0.12, 0, Math.PI * 2)
      g.stroke()
      g.font = 'italic 700 44px Georgia, serif'
      g.textAlign = 'center'
      g.textBaseline = 'top'
      const logoGrad = g.createLinearGradient(w * 0.18, 10, w * 0.82, 58)
      if (classicProfile) {
        logoGrad.addColorStop(0, '#70441a')
        logoGrad.addColorStop(0.38, '#e6bf55')
        logoGrad.addColorStop(1, '#c77818')
      } else {
        logoGrad.addColorStop(0, '#6f4a1c')
        logoGrad.addColorStop(0.38, '#f3c15f')
        logoGrad.addColorStop(1, '#d8841e')
      }
      g.fillStyle = logoGrad
      g.strokeStyle = 'rgba(21, 12, 6, 0.95)'
      g.lineWidth = 2
      g.strokeText('Apeiron', w * 0.47, 8)
      g.fillText('Apeiron', w * 0.47, 8)
      if (!classicProfile) {
        g.font = 'italic 700 26px Georgia, serif'
        g.fillStyle = '#d77a1c'
        g.strokeText('X', w * 0.9, 46)
        g.fillText('X', w * 0.9, 46)
      }
    }
    g.textAlign = 'center'
    g.textBaseline = 'top'

    const drawDataBox = (top: number, label: string, value: string, valueFont = 46) => {
      g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c'
      g.font = '700 18px "Times New Roman", Georgia, serif'
      g.fillText(label, w * 0.5, top)

      const boxX = 14
      const boxY = top + 28
      const boxW = w - 28
      const boxH = 36
      g.fillStyle = '#08090d'
      g.fillRect(boxX, boxY, boxW, boxH)
      g.strokeStyle = '#6a7073'
      g.lineWidth = 2
      g.strokeRect(boxX, boxY, boxW, boxH)
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.fillRect(boxX + 1, boxY + 1, boxW - 2, 6)

      const fitFont = Math.max(
        28,
        Math.min(valueFont, Math.floor(((boxW - 12) / Math.max(1, value.length)) * 1.68))
      )
      g.font = `700 ${fitFont}px "Times New Roman", Georgia, serif`
      g.strokeStyle = '#051923'
      g.lineWidth = 2.2
      g.strokeText(value, w * 0.5, top + 20)
      g.fillStyle = '#5fd2ef'
      g.fillText(value, w * 0.5, top + 20)
      g.fillStyle = 'rgba(186, 243, 252, 0.33)'
      g.fillText(value, w * 0.5 + 1, top + 19)
    }

    const scoreText = String(state.score)
    const bonusText = String(state.bonus)
    drawDataBox(94, 'Score', scoreText, 46)
    drawDataBox(212, 'Bonus', bonusText, 46)

    g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c'
    g.font = '700 18px "Times New Roman", Georgia, serif'
    g.fillText('Lives', w * 0.5, 326)
    g.fillStyle = '#08090d'
    g.fillRect(14, 352, w - 28, 32)
    g.strokeStyle = '#6a7073'
    g.lineWidth = 2
    g.strokeRect(14, 350, w - 28, 34)

    let lx = 52
    for (let i = 0; i < Math.max(0, state.lives); i++) {
      g.fillStyle = '#111d2d'
      g.beginPath()
      g.moveTo(lx, 368)
      g.lineTo(lx + 5.5, 360)
      g.lineTo(lx + 11, 368)
      g.lineTo(lx + 5.5, 372.5)
      g.closePath()
      g.fill()
      g.fillStyle = classicProfile ? '#f4df74' : '#82e1f5'
      g.beginPath()
      g.ellipse(lx + 5.5, 365.4, 1.8, 1.45, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#5d7088'
      g.strokeRect(lx + 1.2, 362.9, 8.6, 7.6)
      lx += 18
      if (lx > w - 24) break
    }

    // Active power-up strip.
    g.fillStyle = '#090a0e'
    g.fillRect(44, 420, w - 88, 22)
    g.strokeStyle = '#5a5e63'
    g.strokeRect(44, 418, w - 88, 24)
    const hasLock = state.hasLock
    const hasDiamond = state.hasDiamond
    const hasGun = state.hasGun
    const iconY = 431
    g.font = '700 18px Georgia, serif'
    g.fillStyle = hasGun ? '#c54630' : 'rgba(197, 70, 48, 0.35)'
    g.fillText('2', 62, iconY - 10)
    if (hasDiamond) {
      g.fillStyle = '#45d6ff'
    } else {
      g.fillStyle = 'rgba(69, 214, 255, 0.35)'
    }
    g.beginPath()
    g.moveTo(72, iconY)
    g.lineTo(78, iconY - 6)
    g.lineTo(84, iconY)
    g.lineTo(78, iconY + 6)
    g.closePath()
    g.fill()
    if (hasGun) {
      g.fillStyle = '#e55d2f'
    } else {
      g.fillStyle = 'rgba(229, 93, 47, 0.35)'
    }
    g.fillRect(98, iconY - 7, 3, 14)
    g.fillRect(104, iconY - 7, 3, 14)
    g.fillRect(110, iconY - 7, 3, 14)
    if (hasLock) {
      g.strokeStyle = '#c8d5e0'
      g.lineWidth = 1.5
    } else {
      g.strokeStyle = 'rgba(200, 213, 224, 0.4)'
      g.lineWidth = 1.2
    }
    g.strokeRect(130, iconY - 3, 10, 8)
    g.beginPath()
    g.arc(135, iconY - 3, 4, Math.PI, Math.PI * 2)
    g.stroke()

    g.fillStyle = classicProfile ? '#db2e26' : '#d3a43c'
    g.font = '700 18px "Times New Roman", Georgia, serif'
    g.fillText('Wave', w * 0.5, 454)
    g.fillStyle = '#08090d'
    g.fillRect(40, 480, w - 80, 54)
    g.strokeStyle = '#6a7073'
    g.strokeRect(40, 478, w - 80, 54)
    g.font = '700 54px "Times New Roman", Georgia, serif'
    const waveText = String(state.wave)
    g.strokeStyle = '#061c28'
    g.lineWidth = 2.4
    g.strokeText(waveText, w * 0.5, 472)
    g.fillStyle = '#67d6ea'
    g.fillText(waveText, w * 0.5, 472)
    g.fillStyle = 'rgba(161, 238, 248, 0.35)'
    g.fillText(waveText, w * 0.5 + 1, 471)

    if (state.autofireTime > 0) {
      const progress = state.autofireTime / YUMMIES.DURATIONS.MACHINE_GUN
      g.fillStyle = '#090a0e'
      g.fillRect(44, 446, w - 88, 7)
      g.fillStyle = '#b8842e'
      g.fillRect(45, 447, (w - 90) * progress, 5)
      g.fillStyle = '#f1ce7a'
      g.fillRect(45, 447, (w - 90) * progress * 0.35, 5)
    }

    g.restore()
  }

  private buildTexture(w: number, h: number): HTMLCanvasElement {
    const tile = document.createElement('canvas')
    tile.width = w
    tile.height = h
    const t = tile.getContext('2d')
    if (!t) return tile

    const grad = t.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#0a0a0b')
    grad.addColorStop(0.3, '#1a1b1d')
    grad.addColorStop(0.74, '#131416')
    grad.addColorStop(1, '#09090a')
    t.fillStyle = grad
    t.fillRect(0, 0, w, h)

    const img = t.createImageData(w, h)
    const data = img.data
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4
        const grain = Math.sin((xx * 127.1 + yy * 311.7) * 0.11) * 0.5 + 0.5
        const poresA = Math.sin((xx * 71.3 + yy * 91.9) * 0.27) * 0.5 + 0.5
        const poresB = Math.sin((xx * 43.7 - yy * 57.3) * 0.2) * 0.5 + 0.5
        const brushed = Math.sin(xx * 0.08 + yy * 0.36 + poresA * 4.2) * 0.5 + 0.5
        const c = Math.max(0, Math.min(255, 9 + grain * 14 + poresA * 9 + poresB * 8 + brushed * 7))
        data[i] = c
        data[i + 1] = c
        data[i + 2] = c + 1
        data[i + 3] = 255
      }
    }
    t.putImageData(img, 0, 0)

    t.fillStyle = 'rgba(255,255,255,0.055)'
    for (let i = 0; i < 1900; i++) {
      const rx = Math.sin(i * 12.47) * 0.5 + 0.5
      const ry = Math.sin(i * 7.11 + 3.2) * 0.5 + 0.5
      const rw = 1 + (Math.sin(i * 3.9) * 0.5 + 0.5 > 0.75 ? 1 : 0)
      t.fillRect(Math.floor(rx * w), Math.floor(ry * h), rw, 1)
    }

    const ridge = t.createLinearGradient(0, 0, w, 0)
    ridge.addColorStop(0, 'rgba(255,255,255,0.06)')
    ridge.addColorStop(0.45, 'rgba(255,255,255,0.01)')
    ridge.addColorStop(1, 'rgba(0,0,0,0.06)')
    t.fillStyle = ridge
    t.fillRect(0, 0, w, h)

    const shine = t.createLinearGradient(0, 0, w, h * 0.75)
    shine.addColorStop(0, 'rgba(255,255,255,0.026)')
    shine.addColorStop(0.35, 'rgba(255,255,255,0.014)')
    shine.addColorStop(1, 'rgba(255,255,255,0)')
    t.fillStyle = shine
    t.fillRect(0, 0, w, h)

    t.fillStyle = 'rgba(0, 0, 0, 0.18)'
    t.fillRect(0, 0, w, 2)
    t.fillRect(0, h - 2, w, 2)

    return tile
  }
}
