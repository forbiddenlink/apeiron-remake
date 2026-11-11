import type React from 'react'
import { useCallback } from 'react'
import { CELL, EXTRA_LIFE_STEP, POWERUPS, PSYCHEDELIC, SCORE } from '../../game/Constants'
import { formatSeed, type ScoreEntry } from '../../game/HighScores'
import type { PowerUpType } from '../../game/Player'
import { PowerUp } from '../../game/PowerUp'
import {
  drawFlea,
  drawGecko,
  drawMushroom,
  drawSegment,
  drawSpider,
  drawUFO,
  type VisualProfile,
} from '../../game/ProceduralSprites'
import { drawTile, getSharedAtlas } from '../../game/render3d/SpriteBaker'
import { COLORS } from '../ui'
import { Panel, SectionTitle } from './Panel'
import { SpriteIcon } from './SpriteIcon'

interface InfoProps {
  profile: VisualProfile
  onClose: () => void
}

// Draws the 3D-rendered sprite when it has been baked, else the flat drawing.
function sprite(
  g: CanvasRenderingContext2D,
  key: string,
  cx: number,
  cy: number,
  flat: () => void
) {
  const atlas = getSharedAtlas()
  if (!atlas || !drawTile(g, atlas, key, cx, cy)) flat()
}

const fieldColor = (profile: VisualProfile) => (profile === 'classic' ? '#c9a23a' : '#8aa860')

function Row({
  icon,
  name,
  children,
}: {
  icon: React.ReactNode
  name: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0' }}>
      {icon}
      <div>
        <div style={{ color: '#f5fdff', fontWeight: 700 }}>{name}</div>
        <div style={{ color: COLORS.dim }}>{children}</div>
      </div>
    </div>
  )
}

function Keys({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <tbody>
        {rows.map(([key, what]) => (
          <tr key={key}>
            <td style={{ padding: '2px 14px 2px 0', color: '#f5fdff', whiteSpace: 'nowrap' }}>
              {key}
            </td>
            <td style={{ padding: '2px 0', color: COLORS.dim }}>{what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const YUMMY_TEXT: Record<PowerUpType, [string, string]> = {
  guided: ['Guided Shot', 'Your shots curve toward the nearest target.'],
  diamond: ['Diamond', 'Move straight through mushrooms.'],
  machine_gun: ['Machine Gun', 'Rapid fire, several shots on screen at once.'],
  shield: ['Shield', 'Nothing can hurt you until it runs out.'],
  lock: ['Lock', 'Keep your Yummies if you lose a life.'],
  house_cleaning: ['House Cleaning', 'Clears every mushroom out of your zone.'],
  extra_man: ['Extra Man', 'One more life, up to 8.'],
  multiplier: ['Multiplier', `Multiplies the Bonus counter by ${POWERUPS.BONUS_MULTIPLIER}.`],
}

function YummyIcon({ type, profile }: { type: PowerUpType; profile: VisualProfile }) {
  const draw = useCallback(
    (g: CanvasRenderingContext2D) => {
      const coin = new PowerUp(4, 4, type, () => 0)
      coin.draw(g, () => {
        const atlas = getSharedAtlas()
        return !!atlas && drawTile(g, atlas, 'coin:0', 0, 0)
      })
    },
    [type]
  )
  return (
    <SpriteIcon
      draw={draw}
      size={20}
      zoom={2.2}
      background={fieldColor(profile)}
      label={YUMMY_TEXT[type][0]}
    />
  )
}

export function HowToPlayPanel({ profile, onClose }: InfoProps) {
  return (
    <Panel title="HOW TO PLAY" onClose={onClose}>
      <p style={{ margin: '0 0 4px' }}>
        You are a crystal in a mushroom patch. Shoot every segment of the Pentipede to clear the
        wave. Each segment you hit leaves a mushroom behind.
      </p>

      <SectionTitle>CONTROLS</SectionTitle>
      <Keys
        rows={[
          ['Mouse or finger', 'Move inside the bottom zone'],
          ['Click, hold or touch', 'Fire'],
          ['Arrow keys + Space', 'Keyboard move and fire'],
          ['Gamepad', 'Stick or d-pad to move, any face button to fire, Start to pause'],
          ['P or Caps Lock', 'Pause and resume'],
          ['Esc', 'Give up the run and return to the title'],
        ]}
      />

      <SectionTitle>YUMMIES</SectionTitle>
      <p style={{ margin: '0 0 2px', color: COLORS.dim }}>
        Coins that sometimes pop out of a mushroom you destroy. Catch them. A coin you shoot bounces
        away, and one that falls off the bottom is gone.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18 }}>
        {POWERUPS.TYPES.map((type) => (
          <Row
            key={type}
            icon={<YummyIcon type={type} profile={profile} />}
            name={YUMMY_TEXT[type][0]}
          >
            {YUMMY_TEXT[type][1]}
          </Row>
        ))}
      </div>

      <SectionTitle>SCORING</SectionTitle>
      <Keys
        rows={[
          ['Bonus', 'Counts down during the wave. What is left is added to your score.'],
          ['Extra life', `Every ${EXTRA_LIFE_STEP.toLocaleString()} points, up to 8 lives`],
          [
            'Rainbow mushroom',
            `Everything is worth ${PSYCHEDELIC.POINT_MULTIPLIER} times as much for a few seconds`,
          ],
          [
            'Falling mushroom',
            `${SCORE.FALLING_MUSHROOM.toLocaleString()} if you shoot it in the air. Keep it up for more.`,
          ],
        ]}
      />

      <SectionTitle>MODES</SectionTitle>
      <Keys
        rows={[
          ['Apeiron', 'Classic rules, scoring and pacing'],
          ['Apeiron X', 'Combos, wave bonuses, coin frenzies and faster enemies'],
        ]}
      />
      <p style={{ color: COLORS.dim, margin: '10px 0 0' }}>
        Rumor has it the old cheat words still work if you pause with Caps Lock and type one.
      </p>
    </Panel>
  )
}

export function VerminPanel({ profile, onClose }: InfoProps) {
  const bg = fieldColor(profile)
  const head = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, `seg:${profile}:h:0`, 15, 15.5, () => drawSegment(g, 7, 7, true, profile)),
    [profile]
  )
  const body = useCallback(
    (g: CanvasRenderingContext2D) => {
      sprite(g, `seg:${profile}:b:1`, 9, 15.5, () => drawSegment(g, 1, 7, false, profile, 0.25))
      sprite(g, `seg:${profile}:b:5`, 21, 15.5, () => drawSegment(g, 13, 7, false, profile, 0.75))
    },
    [profile]
  )
  const larry = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, 'scobster:1', 15, 15, () => drawSpider(g, 4, 6, CELL * 1.4, CELL * 1.15)),
    []
  )
  const groucho = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, 'flick:0', 15, 14, () => drawFlea(g, 5, 5, CELL * 1.25, CELL * 1.25)),
    []
  )
  const gordon = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, 'gecko:1', 16, 15, () => drawGecko(g, 3, 6, CELL * 1.5, CELL * 1.1)),
    []
  )
  const ufo = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, 'ufo:0', 15, 14, () => drawUFO(g, 3, 7, CELL * 1.5, CELL)),
    []
  )
  const shroom = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, `mush:${profile}:0:4`, 15, 17, () => drawMushroom(g, 7, 7, false, 4, profile)),
    [profile]
  )
  const poison = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, `mush:${profile}:1:4`, 15, 17, () => drawMushroom(g, 7, 7, true, 4, profile)),
    [profile]
  )
  const mirror = useCallback(
    (g: CanvasRenderingContext2D) =>
      sprite(g, 'mush:reflective', 15, 17, () => drawMushroom(g, 7, 7, false, 4, profile, true)),
    [profile]
  )
  const rainbow = useCallback(
    (g: CanvasRenderingContext2D) => drawMushroom(g, 7, 7, false, 4, profile, false, true, 1.3),
    [profile]
  )

  return (
    <Panel title="MEET THE VERMIN" onClose={onClose}>
      <SectionTitle>THE CAST</SectionTitle>
      <Row
        icon={<SpriteIcon size={30} zoom={2} draw={head} background={bg} label="Pentipede head" />}
        name={`Cheech the Pentipede: head ${SCORE.HEAD}`}
      >
        Marches down the field, turning at every mushroom and wall. Shoot any segment and the chain
        splits, each piece with a new head.
      </Row>
      <Row
        icon={<SpriteIcon size={30} zoom={2} draw={body} background={bg} label="Pentipede body" />}
        name={`Body segment: ${SCORE.SEGMENT}`}
      >
        If he reaches the bottom row he calls in his friends. Clear every segment to end the wave.
      </Row>
      <Row
        icon={
          <SpriteIcon size={30} zoom={2} draw={larry} background={bg} label="Larry the Scobster" />
        }
        name={`Larry the Scobster: up to ${SCORE.SCOBSTER_NEAR.toLocaleString()}`}
      >
        Scuttles through your zone trying to run you down. The closer he is when you hit him, the
        more he is worth.
      </Row>
      <Row
        icon={
          <SpriteIcon size={30} zoom={2} draw={groucho} background={bg} label="Groucho the Flick" />
        }
        name={`Groucho the Flick: ${SCORE.FLEA}`}
      >
        Drops straight down when your zone runs low on mushrooms, planting new ones as he falls.
        Each one shot while several are falling is worth double the last.
      </Row>
      <Row
        icon={
          <SpriteIcon size={30} zoom={2} draw={gordon} background={bg} label="Gordon the Gecko" />
        }
        name={`Gordon the Gecko: ${SCORE.GECKO.toLocaleString()}`}
      >
        Crosses the field and poisons every mushroom he touches.
      </Row>
      <Row
        icon={<SpriteIcon size={30} zoom={2} draw={ufo} background={bg} label="Spaceship" />}
        name={`The Spaceship: ${SCORE.SPACESHIP_MIN} to ${SCORE.SPACESHIP_MAX.toLocaleString()}`}
      >
        Flies across blowing up the mushrooms under it. Hard to hit and worth the most.
      </Row>

      <SectionTitle>THE MUSHROOMS</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18 }}>
        <Row
          icon={<SpriteIcon size={30} zoom={2} draw={shroom} background={bg} label="Mushroom" />}
          name={`Mushroom: ${SCORE.MUSHROOM_HIT} a hit`}
        >
          Four hits to clear. May hide a Yummy.
        </Row>
        <Row
          icon={
            <SpriteIcon
              size={30}
              zoom={2}
              draw={poison}
              background={bg}
              label="Poisoned mushroom"
            />
          }
          name={`Poisoned: ${SCORE.POISON_MUSHROOM_HIT} a hit`}
        >
          Sends the Pentipede diving straight at you.
        </Row>
        <Row
          icon={
            <SpriteIcon
              size={30}
              zoom={2}
              draw={rainbow}
              background={bg}
              label="Rainbow mushroom"
            />
          }
          name="Rainbow"
        >
          Shoot it for {PSYCHEDELIC.POINT_MULTIPLIER} times the points for a few seconds.
        </Row>
        <Row
          icon={
            <SpriteIcon
              size={30}
              zoom={2}
              draw={mirror}
              background={bg}
              label="Reflecting mushroom"
            />
          }
          name="Reflecting"
        >
          Late waves only. Bounces your shot straight back at you.
        </Row>
      </div>
    </Panel>
  )
}

export function ScoresPanel({ scores, onClose }: { scores: ScoreEntry[]; onClose: () => void }) {
  const cell: React.CSSProperties = { padding: '4px 10px', textAlign: 'right' }
  return (
    <Panel title="HIGH SCORES" onClose={onClose}>
      {scores.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.dim, marginTop: 60 }}>
          No scores yet. Finish a run to get on the board.
        </p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
          <thead>
            <tr style={{ color: COLORS.cyan, borderBottom: `1px solid ${COLORS.line}` }}>
              <th style={cell}>#</th>
              <th style={cell}>Score</th>
              <th style={cell}>Wave</th>
              <th style={{ ...cell, textAlign: 'left' }}>Mode</th>
              <th style={{ ...cell, textAlign: 'left' }}>Date</th>
              <th style={{ ...cell, textAlign: 'left' }}>Seed</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr
                key={`${s.seed}-${s.score}-${s.date}-${s.wave}-${s.mode}`}
                style={{ color: i === 0 ? COLORS.gold : COLORS.text }}
              >
                <td style={cell}>{i + 1}</td>
                <td style={cell}>{s.score.toLocaleString()}</td>
                <td style={cell}>{s.wave}</td>
                <td style={{ ...cell, textAlign: 'left' }}>
                  {s.mode === 'classic' ? 'Apeiron' : 'Apeiron X'}
                  {s.daily ? ' (daily)' : ''}
                </td>
                <td style={{ ...cell, textAlign: 'left' }}>{s.date}</td>
                <td style={{ ...cell, textAlign: 'left', color: COLORS.dim }}>
                  {formatSeed(s.seed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ color: COLORS.dim, marginTop: 16 }}>
        Scores are kept in this browser. Runs that used a cheat word are not recorded.
      </p>
    </Panel>
  )
}

export function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="ABOUT" onClose={onClose}>
      <SectionTitle>THE ORIGINAL</SectionTitle>
      <p>
        Apeiron was released as shareware for the Macintosh by Ambrosia Software in February 1995.
        It was designed by Andrew Welch as Ambrosia's loud, strange take on the arcade game
        Centipede. A Mac OS X version, Apeiron X, followed in November 2004.
      </p>
      <SectionTitle>THIS REMAKE</SectionTitle>
      <p>
        An unofficial fan tribute, not affiliated with or endorsed by Ambrosia Software. It uses
        none of the original game's files: every sprite, backdrop and sound here is generated in
        code when the page loads.
      </p>
      <p>
        The Apeiron mode follows the original's rules as closely as its manual, reviews and gameplay
        footage allow. Where those do not give a number, the value is this remake's own tuning.
      </p>
      <SectionTitle>DAILY CHALLENGE</SectionTitle>
      <p>
        The game is deterministic: the same seed always produces the same mushroom field and the
        same enemy schedule. The daily challenge gives everyone the same seed for the day.
      </p>
    </Panel>
  )
}
