import React, { useState } from 'react';
import { ApeironCanvas } from './components/ApeironCanvas';
import { Menu } from './components/Menu';
import { Options, GameSettings } from './components/Options';

const defaultSettings: GameSettings = {
  gameMode: 'enhanced',
  musicVolume: 70,
  sfxVolume: 80,
  particleDensity: 'low',
  screenShake: false,
  showHitboxes: false,
  showFPS: false
};

export default function App() {
  const [gameState, setGameState] = useState<{
    mode: 'title' | 'playing' | 'pause' | 'gameover';
    score: number;
    highScore: number;
    level: number;
  }>({
    mode: 'title',
    score: 0,
    highScore: 0,
    level: 1
  });
  
  const [showOptions, setShowOptions] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  
  const handleGameStateUpdate = (state: typeof gameState) => {
    setGameState(state);
  };
  
  const handleStart = () => {
    setGameState(prev => ({ ...prev, mode: 'playing' }));
  };
  
  const handleResume = () => {
    setGameState(prev => ({ ...prev, mode: 'playing' }));
  };
  
  const handleOptions = () => {
    setShowOptions(true);
  };
  
  const handleApplySettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
  };
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#000' }}>
      <div
        style={{
          width: 800,
          border: '1px solid #6a6a6a',
          boxShadow: '0 14px 34px rgba(0,0,0,0.55)',
          background: '#d0d0d0'
        }}
      >
        <div
          style={{
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'linear-gradient(#e6e6e6, #bfbfbf)',
            borderBottom: '1px solid #8a8a8a',
            fontFamily: 'Verdana, Geneva, sans-serif',
            fontSize: 14,
            color: '#252525',
            userSelect: 'none'
          }}
        >
          <div style={{ position: 'absolute', left: 7, display: 'flex', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#de6157', border: '1px solid #8a3a34' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e2bb46', border: '1px solid #8f7327' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#55bf59', border: '1px solid #2f7a33' }} />
          </div>
          Apeiron X
        </div>

        <div style={{ position: 'relative', width: 800, height: 592 }}>
          <ApeironCanvas
            width={800}
            height={592}
            gameState={gameState}
            onGameStateUpdate={handleGameStateUpdate}
            settings={settings}
          />

          {gameState.mode !== 'playing' && (
            <Menu
              mode={gameState.mode}
              visualProfile={settings.gameMode === 'classic' ? 'classic' : 'x'}
              score={gameState.score}
              highScore={gameState.highScore}
              level={gameState.level}
              onStart={handleStart}
              onResume={handleResume}
              onOptions={handleOptions}
            />
          )}

          {showOptions && (
            <Options
              onClose={() => setShowOptions(false)}
              onApply={handleApplySettings}
              initialSettings={settings}
            />
          )}
        </div>
      </div>
    </div>
  );
}
