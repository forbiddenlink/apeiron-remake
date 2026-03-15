import React, { useState, useEffect } from 'react';
import { SCORE } from '../game/Constants';

interface MenuProps {
  mode: 'title' | 'pause' | 'gameover';
  visualProfile: 'classic' | 'x';
  score: number;
  highScore: number;
  level: number;
  onStart: () => void;
  onResume?: () => void;
  onOptions: () => void;
}

export function Menu({ mode, visualProfile, score, highScore, level, onStart, onResume, onOptions }: MenuProps) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const classic = visualProfile === 'classic';
  
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.44)',
    color: '#d6eef4',
    fontFamily: '"Lucida Sans Typewriter", "Courier New", monospace',
    fontSize: '24px',
    textAlign: 'center',
    zIndex: 100
  };
  
  const optionStyle = (index: number): React.CSSProperties => ({
    cursor: 'pointer',
    padding: '8px 20px',
    margin: '6px 0',
    minWidth: '190px',
    border: '2px solid transparent',
    borderRadius: '1px',
    transition: 'all 0.2s ease',
    background: selectedOption === index
      ? (classic ? 'rgba(216, 53, 43, 0.18)' : 'rgba(18, 74, 92, 0.3)')
      : 'rgba(0,0,0,0.3)',
    borderColor: selectedOption === index
      ? (classic ? '#f17159' : '#4bd9ef')
      : '#41525e',
    color: selectedOption === index ? '#f5fdff' : '#d6eef4',
    letterSpacing: '0.5px'
  });
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowUp':
        setSelectedOption(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setSelectedOption(prev => Math.min(mode === 'title' ? 2 : 1, prev + 1));
        break;
      case 'Enter':
      case ' ':
        handleSelect();
        break;
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedOption]);
  
  const handleSelect = (targetIndex: number = selectedOption) => {
    switch(mode) {
      case 'title':
        if (targetIndex === 0) onStart();
        else if (targetIndex === 1) setShowTutorial(true);
        else if (targetIndex === 2) onOptions();
        break;
      case 'pause':
        if (targetIndex === 0) onResume?.();
        else if (targetIndex === 1) onOptions();
        break;
      case 'gameover':
        if (targetIndex === 0) onStart();
        else if (targetIndex === 1) onOptions();
        break;
    }
  };
  
  const renderTitle = () => (
    <>
      <h1 style={{ fontSize: '56px', marginBottom: '36px', color: '#f0b555', letterSpacing: '2px', fontFamily: '"Times New Roman", Georgia, serif' }}>
        {classic ? 'APEIRON' : 'APEIRON X'}
      </h1>
      <div onClick={() => { setSelectedOption(0); handleSelect(0); }} style={optionStyle(0)}>START GAME</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(1); }} style={optionStyle(1)}>TUTORIAL</div>
      <div onClick={() => { setSelectedOption(2); handleSelect(2); }} style={optionStyle(2)}>OPTIONS</div>
      <div style={{ marginTop: '28px', fontSize: '16px', color: '#9fd6e2' }}>HIGH SCORE: {highScore}</div>
    </>
  );
  
  const renderPause = () => (
    <>
      <h2 style={{ marginBottom: '30px' }}>GAME PAUSED</h2>
      <div style={{ marginBottom: '30px' }}>
        <div>SCORE: {score}</div>
        <div>LEVEL: {level}</div>
      </div>
      <div onClick={() => { setSelectedOption(0); handleSelect(0); }} style={optionStyle(0)}>RESUME</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(1); }} style={optionStyle(1)}>OPTIONS</div>
    </>
  );
  
  const renderGameOver = () => (
    <>
      <h2 style={{ marginBottom: '30px', color: '#e2759f' }}>GAME OVER</h2>
      <div style={{ marginBottom: '30px' }}>
        <div>FINAL SCORE: {score}</div>
        <div>HIGH SCORE: {highScore}</div>
        <div>LEVEL REACHED: {level}</div>
      </div>
      <div onClick={() => { setSelectedOption(0); handleSelect(0); }} style={optionStyle(0)}>PLAY AGAIN</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(1); }} style={optionStyle(1)}>OPTIONS</div>
    </>
  );
  
  const renderTutorial = () => (
    <div style={{ padding: '20px', maxWidth: '600px', fontSize: '16px', lineHeight: '1.5' }}>
      <h2 style={{ marginBottom: '20px' }}>HOW TO PLAY</h2>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#78f6ff' }}>CONTROLS</h3>
        <p>Mouse Move: Move (classic)</p>
        <p>Mouse Click / Space: Fire</p>
        <p>P or CapsLock: Pause / Resume</p>
        <p>Esc: Abort game to title</p>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#78f6ff' }}>MODES</h3>
        <p>Classic: faithful scoring/pacing and classic rules</p>
        <p>Enhanced: modern combo and faster enemy pacing</p>
        <p>Switch in Options - Gameplay Mode</p>
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#78f6ff' }}>POWER-UPS</h3>
        <p>Guided Shot (squiggle): bullets track targets</p>
        <p>Diamond: pass through mushrooms</p>
        <p>Machine Gun: rapid fire</p>
        <p>Shield: temporary protection</p>
        <p>Lock: keep Yummies after death</p>
        <p>House Cleaning: clears player zone mushrooms</p>
        <p>Extra Man: +1 life</p>
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#78f6ff' }}>SCORING</h3>
        <p>Poison mushroom hit: +{SCORE.POISON_MUSHROOM_HIT}</p>
        <p>Gecko (scorpion): +{SCORE.SCORPION}</p>
        <p>Extra life every 20,000 points (max 8)</p>
      </section>
      
      <div 
        onClick={() => setShowTutorial(false)}
        style={{ ...optionStyle(0), display: 'inline-block', marginTop: '20px' }}
      >
        BACK
      </div>
    </div>
  );
  
  return (
    <div style={menuStyle}>
      {showTutorial ? renderTutorial() :
       mode === 'title' ? renderTitle() :
       mode === 'pause' ? renderPause() :
       renderGameOver()}
    </div>
  );
}
