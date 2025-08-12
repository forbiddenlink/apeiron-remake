import React from 'react';

interface DebugControlsProps {
  settings: {
    showHitboxes: boolean;
    showVelocityVectors: boolean;
    showEnemyPaths: boolean;
    showSpawnZones: boolean;
    showPlayerZone: boolean;
    showGrid: boolean;
    showFPS: boolean;
    showCollisionPoints: boolean;
    showEnergyFields: boolean;
    showParticleCount: boolean;
  };
  onSettingChange: (key: string, value: boolean) => void;
}

export function DebugControls({ settings, onSettingChange }: DebugControlsProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px',
      borderRadius: '8px',
      color: '#fff',
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#64ffda' }}>Debug Controls</h3>
      
      <div style={{ display: 'grid', gap: '8px' }}>
        {Object.entries(settings).map(([key, value]) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={value}
              onChange={e => onSettingChange(key, e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{
              color: value ? '#b388ff' : '#fff',
              transition: 'color 0.2s'
            }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </label>
        ))}
      </div>

      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        fontSize: '11px'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#64ffda' }}>Keyboard Shortcuts:</p>
        <div style={{ display: 'grid', gap: '4px' }}>
          <div>
            <kbd style={kbdStyle}>H</kbd> Toggle Hitboxes
          </div>
          <div>
            <kbd style={kbdStyle}>V</kbd> Toggle Velocity Vectors
          </div>
          <div>
            <kbd style={kbdStyle}>P</kbd> Toggle Enemy Paths
          </div>
          <div>
            <kbd style={kbdStyle}>G</kbd> Toggle Grid
          </div>
          <div>
            <kbd style={kbdStyle}>F</kbd> Toggle FPS
          </div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  padding: '2px 6px',
  borderRadius: '3px',
  marginRight: '8px',
  fontSize: '10px'
};
