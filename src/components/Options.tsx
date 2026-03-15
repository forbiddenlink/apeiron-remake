import React, { useState, useEffect } from 'react';
import type { GameMode } from '../game/GameMode';

interface OptionsProps {
  onClose: () => void;
  onApply: (settings: GameSettings) => void;
  initialSettings: GameSettings;
}

export interface GameSettings {
  gameMode: GameMode;
  musicVolume: number;
  sfxVolume: number;
  particleDensity: 'low' | 'medium' | 'high';
  screenShake: boolean;
  showHitboxes: boolean;
  showFPS: boolean;
}

export function Options({ onClose, onApply, initialSettings }: OptionsProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [selectedOption, setSelectedOption] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowUp':
        setSelectedOption(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setSelectedOption(prev => Math.min(7, prev + 1));
        break;
      case 'ArrowLeft':
        adjustValue(-1);
        break;
      case 'ArrowRight':
        adjustValue(1);
        break;
      case 'Enter':
        if (selectedOption === 7) {
          onApply(settings);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, settings]);
  
  const adjustValue = (delta: number) => {
    switch(selectedOption) {
      case 0: // Game Mode
        setSettings(prev => ({
          ...prev,
          gameMode: prev.gameMode === 'classic' ? 'enhanced' : 'classic'
        }));
        break;
      case 1: // Music Volume
        setSettings(prev => ({
          ...prev,
          musicVolume: Math.max(0, Math.min(100, prev.musicVolume + delta * 10))
        }));
        break;
      case 2: // SFX Volume
        setSettings(prev => ({
          ...prev,
          sfxVolume: Math.max(0, Math.min(100, prev.sfxVolume + delta * 10))
        }));
        break;
      case 3: // Particle Density
        setSettings(prev => ({
          ...prev,
          particleDensity: delta > 0 
            ? prev.particleDensity === 'low' ? 'medium' : 'high'
            : prev.particleDensity === 'high' ? 'medium' : 'low'
        }));
        break;
      case 4: // Screen Shake
        setSettings(prev => ({ ...prev, screenShake: !prev.screenShake }));
        break;
      case 5: // Show Hitboxes
        setSettings(prev => ({ ...prev, showHitboxes: !prev.showHitboxes }));
        break;
      case 6: // Show FPS
        setSettings(prev => ({ ...prev, showFPS: !prev.showFPS }));
        break;
    }
  };
  
  const optionStyle = (index: number): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    margin: '6px 0',
    width: '100%',
    maxWidth: '400px',
    background: selectedOption === index ? 'rgba(0, 185, 230, 0.12)' : 'rgba(0,0,0,0.22)',
    borderRadius: '2px',
    border: selectedOption === index ? '1px solid #41d6f0' : '1px solid #3f4b55',
    cursor: 'pointer',
    letterSpacing: '0.3px'
  });
  
  const renderSlider = (value: number) => {
    const width = 200;
    const filled = Math.round((width * value) / 100);
    
    return (
      <div style={{ 
        width: `${width}px`,
        height: '16px',
        background: 'rgba(3, 7, 12, 0.8)',
        borderRadius: '2px',
        overflow: 'hidden',
        border: '1px solid #4f5a63'
      }}>
        <div style={{
          width: `${filled}px`,
          height: '100%',
          background: '#5ed8ef',
          transition: 'width 0.2s ease'
        }} />
      </div>
    );
  };
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      color: '#d7eef4',
      fontFamily: '"Lucida Console", "Courier New", monospace',
      fontSize: '17px',
      zIndex: 100
    }}>
      <h2 style={{ marginBottom: '24px', color: '#f0b555', letterSpacing: '1px' }}>OPTIONS</h2>
      
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={optionStyle(0)} onClick={() => { setSelectedOption(0); adjustValue(1); }}>
          <span>Style + Rules</span>
          <span style={{ color: settings.gameMode === 'classic' ? '#9cff8b' : '#ff74bf' }}>
            {settings.gameMode === 'classic' ? 'APEIRON' : 'APEIRON X'}
          </span>
        </div>

        <div style={optionStyle(1)} onClick={() => { setSelectedOption(1); adjustValue(1); }}>
          <span>Music Volume</span>
          {renderSlider(settings.musicVolume)}
        </div>
        
        <div style={optionStyle(2)} onClick={() => { setSelectedOption(2); adjustValue(1); }}>
          <span>SFX Volume</span>
          {renderSlider(settings.sfxVolume)}
        </div>
        
        <div style={optionStyle(3)} onClick={() => { setSelectedOption(3); adjustValue(1); }}>
          <span>Particle Density</span>
          <span style={{ color: '#31dcff' }}>{settings.particleDensity.toUpperCase()}</span>
        </div>
        
        <div style={optionStyle(4)} onClick={() => { setSelectedOption(4); adjustValue(1); }}>
          <span>Screen Shake</span>
          <span style={{ color: settings.screenShake ? '#31dcff' : '#666' }}>
            {settings.screenShake ? 'ON' : 'OFF'}
          </span>
        </div>
        
        <div style={optionStyle(5)} onClick={() => { setSelectedOption(5); adjustValue(1); }}>
          <span>Show Hitboxes</span>
          <span style={{ color: settings.showHitboxes ? '#31dcff' : '#666' }}>
            {settings.showHitboxes ? 'ON' : 'OFF'}
          </span>
        </div>
        
        <div style={optionStyle(6)} onClick={() => { setSelectedOption(6); adjustValue(1); }}>
          <span>Show FPS</span>
          <span style={{ color: settings.showFPS ? '#31dcff' : '#666' }}>
            {settings.showFPS ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
      
      <div 
        onClick={() => { onApply(settings); onClose(); }}
        style={{
          marginTop: '30px',
          padding: '10px 20px',
          border: '2px solid #41d6f0',
          borderRadius: '2px',
          cursor: 'pointer',
          color: '#b8e8f3',
          background: selectedOption === 7 ? 'rgba(0, 185, 230, 0.12)' : 'rgba(0,0,0,0.28)'
        }}
      >
        APPLY & CLOSE
      </div>
    </div>
  );
}
