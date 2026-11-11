import type React from 'react'
import type { GameSettings } from '../settings'
import { Panel, SectionTitle } from './panels/Panel'
import { COLORS } from './ui'

export type { GameSettings } from '../settings'

interface OptionsProps {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
  onClose: () => void
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  padding: '7px 12px',
  margin: '5px 0',
  background: 'rgba(0,0,0,0.3)',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 2,
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  onText = 'ON',
  offText = 'OFF',
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
  onText?: string
  offText?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        ...rowStyle,
        width: '100%',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span>
        {label}
        {hint ? (
          <span style={{ display: 'block', color: COLORS.dim, fontSize: 12 }}>{hint}</span>
        ) : null}
      </span>
      <span
        style={{ color: value ? COLORS.cyan : '#8a949b', fontWeight: 700, whiteSpace: 'nowrap' }}
      >
        {value ? onText : offText}
      </span>
    </button>
  )
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label style={rowStyle}>
      <span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 200, accentColor: '#5ed8ef' }}
        />
        <span style={{ width: 34, textAlign: 'right', color: COLORS.cyan }}>{value}</span>
      </span>
    </label>
  )
}

// Changes apply and save as you make them; there is nothing to confirm.
export function Options({ settings, onChange, onClose }: OptionsProps) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value })

  const densities: GameSettings['particleDensity'][] = ['low', 'medium', 'high']

  return (
    <Panel title="OPTIONS" onClose={onClose} closeLabel="DONE">
      <SectionTitle>GAME</SectionTitle>
      <Toggle
        label="Style and rules"
        hint="Apeiron: classic rules. Apeiron X: combos, coin frenzies, faster enemies."
        value={settings.gameMode === 'classic'}
        onChange={(v) => set('gameMode', v ? 'classic' : 'enhanced')}
        onText="APEIRON"
        offText="APEIRON X"
      />
      <Toggle
        label="Reflecting mushrooms"
        hint="Late waves. They bounce your shot back at you, as in the original."
        value={settings.reflectingMushrooms}
        onChange={(v) => set('reflectingMushrooms', v)}
      />

      <Toggle
        label="Mouse control"
        hint="Captured: the cursor is hidden and the crystal follows your hand, as on the Mac. Esc frees it."
        value={settings.relativeMouse}
        onChange={(v) => set('relativeMouse', v)}
        onText="CAPTURED"
        offText="FOLLOW CURSOR"
      />

      <SectionTitle>SOUND</SectionTitle>
      <Slider
        label="Music volume"
        value={settings.musicVolume}
        onChange={(v) => set('musicVolume', v)}
      />
      <Slider
        label="Effects volume"
        value={settings.sfxVolume}
        onChange={(v) => set('sfxVolume', v)}
      />

      <SectionTitle>DISPLAY</SectionTitle>
      <Toggle
        label="Reduce flashing"
        hint="Calms the rainbow mushroom effect, wave-clear flash and respawn blink."
        value={settings.reduceFlashing}
        onChange={(v) => set('reduceFlashing', v)}
      />
      <Toggle
        label="3D sprites"
        hint="Characters rendered from 3D models. Off shows the flat drawn sprites."
        value={settings.sprites3d}
        onChange={(v) => set('sprites3d', v)}
      />
      <Toggle
        label="Moving backdrops"
        hint="Slow drifting light in the field behind the mushrooms."
        value={settings.movingBackdrops}
        onChange={(v) => set('movingBackdrops', v)}
      />
      <Toggle
        label="Screen shake"
        value={settings.screenShake}
        onChange={(v) => set('screenShake', v)}
      />
      <div style={rowStyle}>
        <span>Particle density</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {densities.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={settings.particleDensity === d}
              onClick={() => set('particleDensity', d)}
              style={{
                font: 'inherit',
                cursor: 'pointer',
                padding: '2px 10px',
                color: settings.particleDensity === d ? '#061a20' : COLORS.text,
                background: settings.particleDensity === d ? '#5ed8ef' : 'transparent',
                border: `1px solid ${COLORS.line}`,
                borderRadius: 2,
              }}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </span>
      </div>

      <SectionTitle>DEBUG</SectionTitle>
      <Toggle
        label="Show hitboxes"
        value={settings.showHitboxes}
        onChange={(v) => set('showHitboxes', v)}
      />
      <Toggle label="Show FPS" value={settings.showFPS} onChange={(v) => set('showFPS', v)} />
    </Panel>
  )
}
