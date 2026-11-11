import type React from 'react'
import { useEffect, useState } from 'react'
import { formatSeed } from '../game/HighScores'
import { accuracyPercent, type RunStats } from '../game/RunStats'
import { CheechArt } from './panels/CheechArt'
import { type Accent, buttonStyle, COLORS, DISPLAY_FONT, UI_FONT } from './ui'

export type OverlayName = 'options' | 'howto' | 'vermin' | 'scores' | 'about'

interface MenuProps {
  mode: 'title' | 'pause' | 'gameover'
  visualProfile: Accent
  score: number
  highScore: number
  level: number
  seed: number
  daily: boolean
  cheated: boolean
  newBest: boolean
  stats: RunStats
  onStart: () => void
  onStartDaily: () => void
  onResume: () => void
  onQuit: () => void
  onOpen: (overlay: OverlayName) => void
}

interface Item {
  label: string
  run: () => void
}

function WaveBars({ scores }: { scores: number[] }) {
  const firstWave = Math.max(1, scores.length - 11)
  const bars = scores.slice(-12).map((points, offset) => ({ wave: firstWave + offset, points }))
  const max = Math.max(1, ...bars.map((b) => b.points))
  return (
    <div
      role="img"
      aria-label={`Points per wave: ${bars.map((b) => `wave ${b.wave} ${b.points}`).join(', ')}`}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 54, marginTop: 6 }}
    >
      {bars.map((b) => (
        <div
          key={b.wave}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
        >
          <div
            title={`Wave ${b.wave}: ${b.points.toLocaleString()}`}
            style={{
              width: 16,
              height: Math.max(2, Math.round((b.points / max) * 38)),
              background: '#5ed8ef',
            }}
          />
          <div style={{ fontSize: 10, color: COLORS.dim }}>{b.wave}</div>
        </div>
      ))}
    </div>
  )
}

function RunSummary({ stats }: { stats: RunStats }) {
  const k = stats.kills
  const cell: React.CSSProperties = { padding: '1px 10px', textAlign: 'left' }
  const num: React.CSSProperties = { padding: '1px 10px', textAlign: 'right', color: '#f5fdff' }
  return (
    <div
      style={{ display: 'flex', gap: 22, fontSize: 13, color: COLORS.dim, margin: '4px 0 10px' }}
    >
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={cell}>Accuracy</td>
            <td style={num}>{accuracyPercent(stats)}%</td>
          </tr>
          <tr>
            <td style={cell}>Segments</td>
            <td style={num}>{k.pentipede}</td>
          </tr>
          <tr>
            <td style={cell}>Larry / Groucho</td>
            <td style={num}>
              {k.scobster} / {k.flick}
            </td>
          </tr>
          <tr>
            <td style={cell}>Gordon / Ships</td>
            <td style={num}>
              {k.gecko} / {k.ufo}
            </td>
          </tr>
          <tr>
            <td style={cell}>Yummies caught</td>
            <td style={num}>
              {stats.yummiesCollected} of {stats.yummiesCollected + stats.yummiesMissed}
            </td>
          </tr>
        </tbody>
      </table>
      {stats.waveScores.length > 0 ? (
        <div>
          <div>Points per wave</div>
          <WaveBars scores={stats.waveScores} />
        </div>
      ) : null}
    </div>
  )
}

export function Menu(props: MenuProps) {
  const { mode, visualProfile, score, highScore, level, seed, daily, cheated, newBest, stats } =
    props
  const [selected, setSelected] = useState(0)

  const items: Item[] =
    mode === 'title'
      ? [
          { label: 'START GAME', run: props.onStart },
          { label: 'DAILY CHALLENGE', run: props.onStartDaily },
          { label: 'HOW TO PLAY', run: () => props.onOpen('howto') },
          { label: 'MEET THE VERMIN', run: () => props.onOpen('vermin') },
          { label: 'HIGH SCORES', run: () => props.onOpen('scores') },
          { label: 'OPTIONS', run: () => props.onOpen('options') },
          { label: 'ABOUT', run: () => props.onOpen('about') },
        ]
      : mode === 'pause'
        ? [
            { label: 'RESUME', run: props.onResume },
            { label: 'HOW TO PLAY', run: () => props.onOpen('howto') },
            { label: 'OPTIONS', run: () => props.onOpen('options') },
            { label: 'QUIT TO TITLE', run: props.onQuit },
          ]
        : [
            { label: 'PLAY AGAIN', run: props.onStart },
            { label: 'HIGH SCORES', run: () => props.onOpen('scores') },
            { label: 'TITLE SCREEN', run: props.onQuit },
          ]

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the cursor when the menu changes
  useEffect(() => setSelected(0), [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((prev) => (prev - 1 + items.length) % items.length)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((prev) => (prev + 1) % items.length)
      } else if (e.key === 'Enter') {
        // Keyboard selection is driven here; stop a focused button from also clicking.
        e.preventDefault()
        items[Math.min(selected, items.length - 1)]?.run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: mode === 'title' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.68)',
        color: COLORS.text,
        fontFamily: UI_FONT,
        fontSize: 17,
        textAlign: 'center',
        zIndex: 100,
      }}
    >
      {mode === 'title' ? (
        <h1
          style={{
            fontSize: 58,
            margin: '0 0 18px',
            color: COLORS.gold,
            letterSpacing: 2,
            fontFamily: DISPLAY_FONT,
            textShadow: '0 3px 0 rgba(0,0,0,0.6)',
          }}
        >
          {visualProfile === 'classic' ? 'APEIRON' : 'APEIRON X'}
        </h1>
      ) : null}

      {mode === 'pause' ? (
        <>
          <h2
            style={{
              margin: '0 0 12px',
              fontFamily: DISPLAY_FONT,
              fontSize: 34,
              color: COLORS.gold,
            }}
          >
            PAUSED
          </h2>
          <div style={{ marginBottom: 16, color: COLORS.dim }}>
            Score {score.toLocaleString()} · Wave {level}
          </div>
        </>
      ) : null}

      {mode === 'gameover' ? (
        <>
          <CheechArt profile={visualProfile} />
          <h2
            style={{
              margin: '6px 0 4px',
              fontFamily: DISPLAY_FONT,
              fontSize: 34,
              color: '#e2759f',
            }}
          >
            GAME OVER
          </h2>
          <div style={{ fontSize: 22, color: '#f5fdff' }}>
            {score.toLocaleString()}{' '}
            <span style={{ fontSize: 14, color: COLORS.dim }}>points, wave {level}</span>
          </div>
          <div
            style={{ fontSize: 13, color: newBest ? COLORS.gold : COLORS.dim, margin: '2px 0 6px' }}
          >
            {cheated
              ? 'Cheat word used: not recorded'
              : newBest
                ? 'New best score'
                : `Best ${highScore.toLocaleString()}`}
            {' · '}
            {daily ? 'Daily challenge' : 'Seed'} {formatSeed(seed)}
          </div>
          <RunSummary stats={stats} />
        </>
      ) : null}

      {items.map((item, i) => (
        <button
          key={item.label}
          type="button"
          onMouseEnter={() => setSelected(i)}
          onFocus={() => setSelected(i)}
          onClick={() => {
            setSelected(i)
            item.run()
          }}
          style={buttonStyle(selected === i, visualProfile)}
        >
          {item.label}
        </button>
      ))}

      {mode === 'title' ? (
        <div style={{ marginTop: 14, fontSize: 14, color: '#9fd6e2' }}>
          HIGH SCORE: {highScore.toLocaleString()}
        </div>
      ) : null}
    </div>
  )
}
