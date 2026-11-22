import { runtime } from './runtime';

export const cv = runtime.canvas as HTMLCanvasElement;
export const ctx = (() => {
  const c = runtime.ctx as CanvasRenderingContext2D;
  c.imageSmoothingEnabled = false;
  return c;
})();
