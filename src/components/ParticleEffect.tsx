import { useEffect, useRef } from 'react'

interface ParticleOptions {
  count?: number
  speed?: number
  color?: string | string[]
  style?: 'circle' | 'square' | 'triangle' | 'line' | 'image'
  minSize?: number
  maxSize?: number
  direction?: 'any' | 'both' | 'alternate' | 'top' | 'bottom' | 'left' | 'right'
  overflow?: boolean
  className?: string
}

export function ParticleEffect({
  count = 60,
  speed = 1,
  color = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
  style = 'circle',
  minSize = 4,
  maxSize = 12,
  direction = 'alternate',
  overflow = false,
  className,
}: ParticleOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = us  const instanceRef = us  const ins{
                                                                   id                         par                                                                   id                         par               count,
        speed,
        color,
        style,
        minSize,
        maxSize,
        direction,
        overflow,
        bounce: true,
        resetOnBlur: true,
      })
    })

    return () => {
      instanceRef.current?.destroy()
    }
  }, [count, speed, direction, overflow, minSize, maxSize, style, color])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
