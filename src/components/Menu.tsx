import React, { useState, useEffect } from 'react';
import { SCORE } from '../game/Constants';

interface MenuProps {
  mode: 'title' | 'pause' | 'gameover';
  score: number;
  highScore: number;
  level: number;
  onStart: () => void;
  onResume?: () => void;
  onOptions: () => void;
}

export function Menu({ mode, score, highScore, level, onStart, onResume, onOptions }: MenuProps) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [titlePhase, setTitlePhase] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Psychedelic color cycling for title
  useEffect(() => {
    const interval = setInterval(() => {
      setTitlePhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  const getTitleStyle = (offset: number = 0) => ({
    color: `hsl(${(titlePhase + offset) % 360}, 100%, 50%)`,
    textShadow: '0 0 10px currentColor',
    transition: 'color 0.1s ease-in-out'
  });
  
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
    background: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '24px',
    textAlign: 'center',
    zIndex: 100
  };
  
  const optionStyle = (index: number): React.CSSProperties => ({
    cursor: 'pointer',
    padding: '10px 20px',
    margin: '5px 0',
    border: '2px solid transparent',
    borderRadius: '5px',
    transition: 'all 0.2s ease',
    background: selectedOption === index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    borderColor: selectedOption === index ? '#fff' : 'transparent',
    textShadow: selectedOption === index ? '0 0 10px #fff' : 'none'
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
  
  const handleSelect = () => {
    switch(mode) {
      case 'title':
        if (selectedOption === 0) onStart();
        else if (selectedOption === 1) setShowTutorial(true);
        else if (selectedOption === 2) onOptions();
        break;
      case 'pause':
        if (selectedOption === 0) onResume?.();
        else if (selectedOption === 1) onOptions();
        break;
      case 'gameover':
        if (selectedOption === 0) onStart();
        else if (selectedOption === 1) onOptions();
        break;
    }
  };
  
  const renderTitle = () => (
    <>
      <h1 style={{ fontSize: '48px', marginBottom: '40px' }}>
        <span style={getTitleStyle(0)}>A</span>
        <span style={getTitleStyle(30)}>P</span>
        <span style={getTitleStyle(60)}>E</span>
        <span style={getTitleStyle(90)}>I</span>
        <span style={getTitleStyle(120)}>R</span>
        <span style={getTitleStyle(150)}>O</span>
        <span style={getTitleStyle(180)}>N</span>
      </h1>
      <div onClick={() => { setSelectedOption(0); handleSelect(); }} style={optionStyle(0)}>START GAME</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(); }} style={optionStyle(1)}>TUTORIAL</div>
      <div onClick={() => { setSelectedOption(2); handleSelect(); }} style={optionStyle(2)}>OPTIONS</div>
      <div style={{ marginTop: '40px', fontSize: '18px' }}>HIGH SCORE: {highScore}</div>
    </>
  );
  
  const renderPause = () => (
    <>
      <h2 style={{ marginBottom: '30px' }}>GAME PAUSED</h2>
      <div style={{ marginBottom: '30px' }}>
        <div>SCORE: {score}</div>
        <div>LEVEL: {level}</div>
      </div>
      <div onClick={() => { setSelectedOption(0); handleSelect(); }} style={optionStyle(0)}>RESUME</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(); }} style={optionStyle(1)}>OPTIONS</div>
    </>
  );
  
  const renderGameOver = () => (
    <>
      <h2 style={{ marginBottom: '30px', color: '#ff4081' }}>GAME OVER</h2>
      <div style={{ marginBottom: '30px' }}>
        <div>FINAL SCORE: {score}</div>
        <div>HIGH SCORE: {highScore}</div>
        <div>LEVEL REACHED: {level}</div>
      </div>
      <div onClick={() => { setSelectedOption(0); handleSelect(); }} style={optionStyle(0)}>PLAY AGAIN</div>
      <div onClick={() => { setSelectedOption(1); handleSelect(); }} style={optionStyle(1)}>OPTIONS</div>
    </>
  );
  
  const renderTutorial = () => (
    <div style={{ padding: '20px', maxWidth: '600px', fontSize: '16px', lineHeight: '1.5' }}>
      <h2 style={{ marginBottom: '20px' }}>HOW TO PLAY</h2>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ff4081' }}>CONTROLS</h3>
        <p>Arrow Keys: Move</p>
        <p>Space: Fire</p>
        <p>Shift: Activate Power-up</p>
        <p>Esc: Pause</p>
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ff4081' }}>POWER-UPS</h3>
        <p>Autofire: Continuous shooting</p>
        <p>Spread Shot: Fire in three directions</p>
        <p>Rapid Fire: Increased fire rate</p>
        <p>Shield: Temporary invincibility</p>
        <p>Warp Speed: Enhanced movement</p>
        <p>Phase Shift: Pass through enemies</p>
        <p>Mega Blast: Charged super shot</p>
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#ff4081' }}>SCORING</h3>
        <p>Chain hits for multipliers</p>
        <p>Perfect field bonus: +{SCORE.PERFECT_CLEAR}</p>
        <p>Speed clear bonus: +{SCORE.SPEED_CLEAR}</p>
        <p>No-hit bonus: +{SCORE.NO_HIT}</p>
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
