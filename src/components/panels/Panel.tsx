import type React from 'react'
import { useEffect, useRef } from 'react'
import { COLORS, DISPLAY_FONT, UI_FONT } from '../ui'

interface PanelProps {
  title: string
  onClose: () => void
  closeLabel?: string
  children: React.ReactNode
}

// A full-frame dialog with its own backdrop. Content scrolls inside the frame,
// so nothing can spill outside the game window, and the close button is always
// visible at the bottom.
export function Panel({ title, onClose, closeLabel = 'BACK', children }: PanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: COLORS.panel,
        color: COLORS.text,
        fontFamily: UI_FONT,
        fontSize: 14,
        lineHeight: 1.45,
      }}
    >
      <h2
        style={{
          margin: '16px 0 10px',
          fontFamily: DISPLAY_FONT,
          fontSize: 30,
          letterSpacing: 1,
          color: COLORS.gold,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 620, maxWidth: '92%', paddingBottom: 8 }}>{children}</div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        style={{
          font: 'inherit',
          fontSize: 16,
          margin: '10px 0 14px',
          padding: '7px 34px',
          cursor: 'pointer',
          color: '#f5fdff',
          background: 'rgba(18, 74, 92, 0.4)',
          border: '2px solid #4bd9ef',
          borderRadius: 1,
        }}
      >
        {closeLabel}
      </button>
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: '14px 0 6px',
        fontSize: 14,
        letterSpacing: 1,
        color: COLORS.cyan,
        borderBottom: `1px solid ${COLORS.line}`,
        paddingBottom: 3,
      }}
    >
      {children}
    </h3>
  )
}
