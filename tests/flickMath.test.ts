import { describe, expect, it } from 'vitest';
import { releaseVelocity } from '../src/systems/flickMath';
import { impactDamage } from '../src/entities/damageMath';

describe('releaseVelocity', () => {
  it('converts finger speed to px per physics step', () => {
    // 600 px/s to the right = 10 px/step at 60Hz.
    const s = [{ x: 0, y: 0, t: 0 }, { x: 30, y: 0, t: 50 }];
    const v = releaseVelocity(s, 50, 80, 1, 100);
    expect(v.x).toBeCloseTo(10);
    expect(v.y).toBeCloseTo(0);
  });

  it('only uses samples inside the window', () => {
    const s = [{ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 200 }, { x: 60, y: -60, t: 260 }];
    const v = releaseVelocity(s, 260, 80, 1, 100);
    expect(v.x).toBeCloseTo(16.667, 2);
    expect(v.y).toBeCloseTo(-16.667, 2);
  });

  it('clamps to max speed', () => {
    const s = [{ x: 0, y: 0, t: 0 }, { x: 1000, y: 0, t: 10 }];
    const v = releaseVelocity(s, 10, 80, 1, 38);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(38);
  });

  it('gives no throw when the finger stopped before release', () => {
    const s = [{ x: 0, y: 0, t: 0 }, { x: 50, y: 0, t: 40 }];
    expect(releaseVelocity(s, 400, 80, 1, 38)).toEqual({ x: 0, y: 0 });
  });
});

describe('impactDamage', () => {
  it('is zero below the safe threshold and kills a walker around 14 px/step', () => {
    expect(impactDamage(4)).toBe(0);
    expect(impactDamage(14.2)).toBeGreaterThanOrEqual(100);
  });
});
