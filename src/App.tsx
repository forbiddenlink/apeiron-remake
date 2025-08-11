import React, { useState } from 'react';
import { ApeironCanvas } from './components/ApeironCanvas';
import { Menu } from './components/Menu';
import { Options, GameSettings } from './components/Options';

const defaultSettings: GameSettings = {
  musicVolume: 70,
  sfxVolume: 80,
  particleDensity: 'medium',
  screenShake: true,
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
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      <ApeironCanvas
        width={640}
        height={800}
        gameState={gameState}
        onGameStateUpdate={handleGameStateUpdate}
        settings={settings}
      />
      
      {gameState.mode !== 'playing' && (
        <Menu
          mode={gameState.mode}
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
  );
}
