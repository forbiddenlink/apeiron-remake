declare module 'sparticles' {
  interface SparticlesOptions {
    count?: number;
    speed?: number;
    color?: string | string[];
    minSize?: number;
    maxSize?: number;
    shape?: 'circle' | 'square' | 'star' | 'line' | 'triangle';
    glow?: number;
    drift?: number;
    rotate?: boolean;
    parallax?: number;
    twinkle?: boolean;
    direction?: number;
    bounce?: boolean;
    alphaSpeed?: number;
    alphaVariance?: number;
    style?: 'fill' | 'stroke';
    randomColor?: boolean;
    randomSize?: boolean;
    randomSpeed?: boolean;
    randomDirection?: boolean;
    randomRotation?: boolean;
  }

  class Sparticles {
    constructor(element: HTMLElement | HTMLCanvasElement, options?: SparticlesOptions);
    destroy(): void;
    setOptions(options: Partial<SparticlesOptions>): void;
  }

  export default Sparticles;
}
