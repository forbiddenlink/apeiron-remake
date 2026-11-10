import type React from 'react'

// One text face and one display face for every menu and panel.
export const UI_FONT = '"SF Mono", Menlo, Consolas, "Lucida Console", "Courier New", monospace'
export const DISPLAY_FONT = '"Times New Roman", Georgia, serif'

export const COLORS = {
  text: '#d6eef4',
  dim: '#9fb8c2',
  gold: '#f0b555',
  cyan: '#78e6f6',
  panel: 'rgba(8, 10, 14, 0.95)',
  line: '#41525e',
} as const

export type Accent = 'classic' | 'x'

export function buttonStyle(selected: boolean, accent: Accent): React.CSSProperties {
  const edge = accent === 'classic' ? '#f17159' : '#4bd9ef'
  return {
    font: 'inherit',
    boxSizing: 'border-box',
    cursor: 'pointer',
    padding: '6px 18px',
    margin: '3px 0',
    minWidth: 250,
    border: '2px solid',
    borderRadius: 1,
    background: selected
      ? accent === 'classic'
        ? 'rgba(216, 53, 43, 0.22)'
        : 'rgba(18, 74, 92, 0.4)'
      : 'rgba(0,0,0,0.42)',
    borderColor: selected ? edge : COLORS.line,
    color: selected ? '#f5fdff' : COLORS.text,
    letterSpacing: '0.5px',
  }
}
