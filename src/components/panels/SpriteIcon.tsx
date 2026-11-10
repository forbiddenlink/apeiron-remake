import { useEffect, useRef } from 'react'

interface SpriteIconProps {
  // Draws in game pixels; the icon shows a `size` x `size` game-pixel window.
  draw: (g: CanvasRenderingContext2D) => void
  size?: number
  // Window width in game pixels when it is not square.
  width?: number
  zoom?: number
  background?: string
  label: string
}

// Renders one of the game's procedural sprites, enlarged, for the info panels.
export function SpriteIcon({
  draw,
  size = 24,
  width,
  zoom = 2.5,
  background = '#c9a23a',
  label,
}: SpriteIconProps) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const css = Math.round(size * zoom)
  const cssW = Math.round((width ?? size) * zoom)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(css * dpr)
    const g = canvas.getContext('2d')
    if (!g) return
    g.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)
    g.fillStyle = background
    g.fillRect(0, 0, width ?? size, size)
    draw(g)
  }, [draw, size, width, zoom, css, cssW, background])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{ width: cssW, height: css, flex: '0 0 auto', border: '1px solid #2c3840' }}
    />
  )
}
