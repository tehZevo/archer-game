import { describe, expect, it } from 'vitest';
import { archerFrame, climbPhase, GRIDS, POSE_FPS } from '../src/archer';
import { POSES } from '../src/ghost';

describe('archer sprite sheet', () => {
  it('every frame is 16x24, except lying flat which is 24x24', () => {
    for (const [pose, frames] of Object.entries(GRIDS)) {
      const width = pose === 'prone' ? 24 : 16;
      expect(frames.length).toBeGreaterThan(0);
      for (const grid of frames) {
        expect(grid.length).toBe(24);
        for (const row of grid) expect(row.length).toBe(width);
      }
    }
  });

  it('the head lying flat is as tall as the standing head', () => {
    const headRows = (grid: string[]): number => grid.filter((row) => /[hs]/.test(row)).length;
    const standing = headRows(GRIDS.idle[0].slice(0, 10));
    expect(headRows(GRIDS.prone[0])).toBeGreaterThanOrEqual(standing - 1);
  });

  it('every networked pose has frames and a frame rate', () => {
    for (const pose of POSES) {
      expect(GRIDS[pose].length).toBeGreaterThan(0);
      expect(POSE_FPS[pose]).toBeGreaterThan(0);
    }
  });

  it('new poses go on the end of the networked list (older clients show them as idle)', () => {
    expect(POSES[0]).toBe('idle');
    expect(POSES.indexOf('prone')).toBe(7);
    expect(POSES.indexOf('vanish')).toBe(10);
    expect(POSES.indexOf('fall')).toBe(POSES.length - 1);
  });
});

describe('climbing animation', () => {
  it('holds its frame while you hang still, and steps as you climb', () => {
    const frames = { ...GRIDS, climb: [['a'], ['b']] } as never;
    const frameAt = (feet: number): unknown => archerFrame(frames, 'climb', climbPhase(feet));
    expect(frameAt(100)).toBe(frameAt(100));
    expect(frameAt(103)).toBe(frameAt(100));
    expect(frameAt(108)).not.toBe(frameAt(100));
  });
});
