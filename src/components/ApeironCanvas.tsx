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
    onGameStateUpdate({
      mode: engine.mode,
      score: engine.score,
      highScore: engine.highScore,
      level: engine.level
    });
    
    // Start engine
    engine.start();
    return () => engine.destroy();
  }, [width, height]);
  
  // Handle game state changes
  useEffect(() => {
    if (!engineRef.current) return;
    
    // Update engine mode
    if (gameState.mode === 'playing') {
      if (engineRef.current.mode === 'title' || engineRef.current.mode === 'gameover') {
        engineRef.current.startNewGame();
      } else if (engineRef.current.mode === 'pause') {
        engineRef.current.resume();
      }
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
        background: '#101010',
        border: 'none',
        boxShadow: 'none',
        position: 'relative',
        zIndex: 1
      }}
    />
  );
}
