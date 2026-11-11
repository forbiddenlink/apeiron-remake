import { useCallback } from 'react'
import { drawSegment, type VisualProfile } from '../../game/ProceduralSprites'
import { drawTile, getSharedAtlas } from '../../game/render3d/SpriteBaker'
import { SpriteIcon } from './SpriteIcon'

// Game over card: the Pentipede relaxing with a hookah, a nod to the original's
// game over picture. Built from the game's own segment sprite plus a few shapes.
export function CheechArt({ profile }: { profile: VisualProfile }) {
  const draw = useCallback(
    (g: CanvasRenderingContext2D) => {
      // Floor shadow strip
      g.fillStyle = 'rgba(255,255,255,0.05)'
      g.fillRect(0, 22, 72, 8)

      // Body trailing off to the left, head on the right
      const atlas = getSharedAtlas()
      for (let i = 0; i < 3; i++) {
        if (!atlas || !drawTile(g, atlas, `seg:${profile}:b:${i * 2}`, 10 + i * 11, 16)) {
          drawSegment(g, 2 + i * 11, 8, false, profile, i * 0.33)
        }
      }
      if (!atlas || !drawTile(g, atlas, `seg:${profile}:h:0`, 43, 16)) {
        drawSegment(g, 35, 8, true, profile)
      }

      // Hookah: glass base, stem, bowl
      const hx = 60
      g.fillStyle = 'rgba(90, 200, 215, 0.85)'
      g.beginPath()
      g.ellipse(hx, 20.5, 4.6, 4.2, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#1d5d6b'
      g.lineWidth = 0.8
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.beginPath()
      g.ellipse(hx - 1.6, 19, 1.1, 1.8, -0.3, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#c9a23a'
      g.fillRect(hx - 0.9, 6.5, 1.8, 10.5)
      g.fillStyle = '#8a5a1c'
      g.beginPath()
      g.moveTo(hx - 3, 4)
      g.lineTo(hx + 3, 4)
      g.lineTo(hx + 1.6, 7)
      g.lineTo(hx - 1.6, 7)
      g.closePath()
      g.fill()
      g.fillStyle = '#ff8a3c'
      g.fillRect(hx - 2.2, 3.2, 4.4, 1)

      // Hose from the base to his mouth
      g.strokeStyle = '#b3402e'
      g.lineWidth = 1.1
      g.beginPath()
      g.moveTo(hx - 4.2, 19.5)
      g.quadraticCurveTo(52, 27, 47.5, 18.2)
      g.stroke()

      // Smoke
      g.fillStyle = 'rgba(230, 236, 245, 0.5)'
      for (const [x, y, r] of [
        [47, 5.5, 1.6],
        [50, 3.2, 2.1],
        [54, 1.8, 2.6],
      ]) {
        g.beginPath()
        g.arc(x, y, r, 0, Math.PI * 2)
        g.fill()
      }
    },
    [profile]
  )
  return (
    <SpriteIcon
      draw={draw}
      width={72}
      size={30}
      zoom={2.6}
      background="#17141f"
      label="The Pentipede relaxing with a hookah"
    />
  )
}
