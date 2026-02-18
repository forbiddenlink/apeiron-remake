export function applyLifeLoss(lives: number): { lives: number; gameOver: boolean } {
  const nextLives = lives - 1;
  return {
    lives: nextLives,
    gameOver: nextLives <= 0
  };
}
