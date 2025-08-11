import React, { useState, useEffect } from 'react';

interface OptionsProps {
  onClose: () => void;
  onApply: (settings: GameSettings) => void;
  initialSettings: GameSettings;
}

export interface GameSettings {
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
        setSelectedOption(prev => Math.min(5, prev + 1));
        break;
      case 'ArrowLeft':
        adjustValue(-1);
        break;
      case 'ArrowRight':
        adjustValue(1);
        break;
      case 'Enter':
        if (selectedOption === 5) {
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
      case 0: // Music Volume
        setSettings(prev => ({
          ...prev,
          musicVolume: Math.max(0, Math.min(100, prev.musicVolume + delta * 10))
        }));
        break;
      case 1: // SFX Volume
        setSettings(prev => ({
          ...prev,
          sfxVolume: Math.max(0, Math.min(100, prev.sfxVolume + delta * 10))
        }));
        break;
      case 2: // Particle Density
        setSettings(prev => ({
          ...prev,
          particleDensity: delta > 0 
            ? prev.particleDensity === 'low' ? 'medium' : 'high'
            : prev.particleDensity === 'high' ? 'medium' : 'low'
        }));
        break;
      case 3: // Screen Shake
        setSettings(prev => ({ ...prev, screenShake: !prev.screenShake }));
        break;
      case 4: // Show Hitboxes
        setSettings(prev => ({ ...prev, showHitboxes: !prev.showHitboxes }));
        break;
      case 5: // Show FPS
        setSettings(prev => ({ ...prev, showFPS: !prev.showFPS }));
        break;
    }
  };
  
  const optionStyle = (index: number): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    margin: '5px 0',
    width: '100%',
    maxWidth: '400px',
    background: selectedOption === index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    borderRadius: '5px',
    cursor: 'pointer'
  });
  
  const renderSlider = (value: number) => {
    const width = 200;
    const filled = Math.round((width * value) / 100);
    
    return (
      <div style={{ 
        width: `${width}px`,
        height: '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${filled}px`,
          height: '100%',
          background: '#ff4081',
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
      background: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '18px',
      zIndex: 100
    }}>
      <h2 style={{ marginBottom: '30px' }}>OPTIONS</h2>
      
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={optionStyle(0)}>
          <span>Music Volume</span>
          {renderSlider(settings.musicVolume)}
        </div>
        
        <div style={optionStyle(1)}>
          <span>SFX Volume</span>
          {renderSlider(settings.sfxVolume)}
        </div>
        
        <div style={optionStyle(2)}>
          <span>Particle Density</span>
          <span style={{ color: '#ff4081' }}>{settings.particleDensity.toUpperCase()}</span>
        </div>
        
        <div style={optionStyle(3)}>
          <span>Screen Shake</span>
          <span style={{ color: settings.screenShake ? '#ff4081' : '#666' }}>
            {settings.screenShake ? 'ON' : 'OFF'}
          </span>
        </div>
        
        <div style={optionStyle(4)}>
          <span>Show Hitboxes</span>
          <span style={{ color: settings.showHitboxes ? '#ff4081' : '#666' }}>
            {settings.showHitboxes ? 'ON' : 'OFF'}
          </span>
        </div>
        
        <div style={optionStyle(5)}>
          <span>Show FPS</span>
          <span style={{ color: settings.showFPS ? '#ff4081' : '#666' }}>
            {settings.showFPS ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
      
      <div 
        onClick={() => { onApply(settings); onClose(); }}
        style={{
          marginTop: '30px',
          padding: '10px 20px',
          border: '2px solid #ff4081',
          borderRadius: '5px',
          cursor: 'pointer',
          color: '#ff4081',
          background: selectedOption === 6 ? 'rgba(255, 64, 129, 0.1)' : 'transparent'
        }}
      >
        APPLY & CLOSE
      </div>
    </div>
  );
}
