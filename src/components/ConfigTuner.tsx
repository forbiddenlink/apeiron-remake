import React, { useState } from 'react';
import { GRID, PLAYER, ENEMIES, YUMMIES, SCORING } from '../game/GameConfig';

interface ConfigGroup {
  name: string;
  configs: {
    key: string;
    value: any;
    type: 'number' | 'boolean' | 'string';
    description: string;
    min?: number;
    max?: number;
    step?: number;
  }[];
}

interface ConfigTunerProps {
  onConfigChange: (key: string, value: any) => void;
  onReset: () => void;
}

export function ConfigTuner({ onConfigChange, onReset }: ConfigTunerProps) {
  const [activeGroup, setActiveGroup] = useState<string>('PLAYER');
  const [searchTerm, setSearchTerm] = useState('');

  const configGroups: ConfigGroup[] = [
    {
      name: 'PLAYER',
      configs: [
        {
          key: 'PLAYER.MOVEMENT.BASE_SPEED',
          value: PLAYER.MOVEMENT.BASE_SPEED,
          type: 'number',
          description: 'Base movement speed (px/sec)',
          min: 100,
          max: 1000,
          step: 10
        },
        {
          key: 'PLAYER.MOVEMENT.ACCEL',
          value: PLAYER.MOVEMENT.ACCEL,
          type: 'number',
          description: 'Acceleration (px/sec²)',
          min: 500,
          max: 5000,
          step: 100
        },
        {
          key: 'PLAYER.MOVEMENT.VERTICAL_MULT',
          value: PLAYER.MOVEMENT.VERTICAL_MULT,
          type: 'number',
          description: 'Vertical movement multiplier',
          min: 0.1,
          max: 2.0,
          step: 0.05
        }
      ]
    },
    {
      name: 'ENEMIES',
      configs: [
        {
          key: 'ENEMIES.LARRY_THE_SCOBSTER.SPEED_PX_PER_SEC_X',
          value: ENEMIES.LARRY_THE_SCOBSTER.SPEED_PX_PER_SEC_X,
          type: 'number',
          description: 'Larry (Spider) speed',
          min: 50,
          max: 500,
          step: 10
        },
        {
          key: 'ENEMIES.GROUCHO_THE_FLICK.MUSHROOM_DROP_CHANCE',
          value: ENEMIES.GROUCHO_THE_FLICK.MUSHROOM_DROP_CHANCE,
          type: 'number',
          description: 'Groucho (Flea) mushroom drop chance',
          min: 0,
          max: 1,
          step: 0.01
        },
        {
          key: 'ENEMIES.UFO.SPAWN_CHANCE',
          value: ENEMIES.UFO.SPAWN_CHANCE,
          type: 'number',
          description: 'UFO spawn chance',
          min: 0,
          max: 1,
          step: 0.01
        }
      ]
    },
    {
      name: 'YUMMIES',
      configs: [
        {
          key: 'YUMMIES.DURATIONS.MACHINE_GUN',
          value: YUMMIES.DURATIONS.MACHINE_GUN,
          type: 'number',
          description: 'Machine Gun duration (sec)',
          min: 1,
          max: 30,
          step: 0.5
        },
        {
          key: 'YUMMIES.DURATIONS.SHIELD',
          value: YUMMIES.DURATIONS.SHIELD,
          type: 'number',
          description: 'Shield duration (sec)',
          min: 1,
          max: 30,
          step: 0.5
        },
        {
          key: 'YUMMIES.SPAWN.CHANCE',
          value: YUMMIES.SPAWN.CHANCE,
          type: 'number',
          description: 'Yummy spawn chance',
          min: 0,
          max: 1,
          step: 0.01
        }
      ]
    },
    {
      name: 'SCORING',
      configs: [
        {
          key: 'SCORING.CHAIN_MULTIPLIER',
          value: SCORING.CHAIN_MULTIPLIER,
          type: 'number',
          description: 'Chain multiplier',
          min: 1,
          max: 5,
          step: 0.1
        },
        {
          key: 'SCORING.COMBO_WINDOW',
          value: SCORING.COMBO_WINDOW,
          type: 'number',
          description: 'Combo window (sec)',
          min: 0.1,
          max: 5,
          step: 0.1
        }
      ]
    }
  ];

  const filteredGroups = configGroups.map(group => ({
    ...group,
    configs: group.configs.filter(config =>
      config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.configs.length > 0);

  return (
    <div className="config-tuner" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '300px',
      maxHeight: '80vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '12px',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Search configs..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {configGroups.map(group => (
          <button
            key={group.name}
            onClick={() => setActiveGroup(group.name)}
            style={{
              padding: '5px 10px',
              backgroundColor: activeGroup === group.name ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {group.name}
          </button>
        ))}
      </div>

      {filteredGroups.map(group => (
        <div
          key={group.name}
          style={{
            display: searchTerm || activeGroup === group.name ? 'block' : 'none',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#64ffda' }}>{group.name}</h3>
          {group.configs.map(config => (
            <div key={config.key} style={{ marginBottom: '15px' }}>
              <div style={{ marginBottom: '5px', color: '#b388ff' }}>
                {config.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {config.type === 'number' ? (
                  <>
                    <input
                      type="range"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={config.value}
                      onChange={e => onConfigChange(config.key, parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={config.value}
                      onChange={e => onConfigChange(config.key, parseFloat(e.target.value))}
                      style={{
                        width: '80px',
                        padding: '2px 5px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        borderRadius: '4px'
                      }}
                    />
                  </>
                ) : config.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={config.value}
                    onChange={e => onConfigChange(config.key, e.target.checked)}
                  />
                ) : (
                  <input
                    type="text"
                    value={config.value}
                    onChange={e => onConfigChange(config.key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '2px 5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      borderRadius: '4px'
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={onReset}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: 'rgba(255, 82, 82, 0.2)',
          border: '1px solid rgba(255, 82, 82, 0.4)',
          color: '#ff5252',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Reset All to Default
      </button>
    </div>
  );
}
