import React, { useEffect, useRef } from 'react';
import { Engine } from '../game/Engine';
import { GameSettings } from './Options';

interface ApeironCanvasProps {
  width: number;
  height: number;
  gameState: {
    mode: 'title' | 'playing' | 'pause' | 'gameover';
    score: number;
    highScore: number;
    level: number;
  };
  onGameStateUpdate: (state: ApeironCanvasProps['gameState']) => void;
  settings: GameSettings;
}

export function ApeironCanvas({ width, height, gameState, onGameStateUpdate, settings }: ApeironCanvasProps) {
  const ref = useRef<HTMLCanvasElement|null>(null);
  const engineRef = useRef<Engine|null>(null);
  
  // Initialize engine
  useEffect(() => {
    if (!ref.current) return;
    const engine = new Engine(ref.current, width, height);
    engineRef.current = engine;
    
    // Set up game state sync
    engine.onStateChange = (state) => {
      onGameStateUpdate({
        mode: state.mode,
        score: state.score,
        highScore: state.highScore,
        level: state.level
      });
    };
    
    // Start engine
    engine.start();
    return () => engine.destroy();
  }, [width, height]);
  
  // Handle game state changes
  useEffect(() => {
    if (!engineRef.current) return;
    
    // Update engine mode
    if (gameState.mode === 'playing' && engineRef.current.mode !== 'playing') {
      engineRef.current.resume();
    } else if (gameState.mode === 'pause' && engineRef.current.mode === 'playing') {
      engineRef.current.pause();
    }
  }, [gameState.mode]);
  
  // Handle settings changes
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateSettings(settings);
  }, [settings]);
  
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{
        background: '#02030a',
        border: '2px solid #3940ff',
        boxShadow: '0 0 20px rgba(57,64,255,.35)',
        position: 'relative',
        zIndex: 1
      }}
    />
  );
}
