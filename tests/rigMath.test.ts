import { describe, expect, it } from 'vitest';
import { along, squashAt, stepBend } from '../src/entities/rigMath';

describe('stepBend', () => {
  const p = { stiffness: 260, damping: 16, min: 0, max: 2 };

  it('settles on the target without leaving its limits', () => {
    const s = { b: 0, v: 0 };
    for (let i = 0; i < 240; i++) {
      stepBend(s, 0.8, 0, p, 1 / 60);
      expect(s.b).toBeGreaterThanOrEqual(0);
      expect(s.b).toBeLessThanOrEqual(2);
    }
    expect(s.b).toBeCloseTo(0.8, 2);
  });

  it('lags behind when the parent limb is kicked', () => {
    const s = { b: 0.5, v: 0 };
    stepBend(s, 0.5, 400, p, 1 / 60);
    expect(s.v).toBeGreaterThan(0);
  });
});

describe('along', () => {
  it('matches Matter rotation (positive angle swings the end to -x)', () => {
    const e = along(0, 0, Math.PI / 2, 10);
    expect(e.x).toBeCloseTo(-10);
    expect(e.y).toBeCloseTo(0);
  });
});

describe('squashAt', () => {
  it('decays to rest', () => {
    expect(Math.abs(squashAt(0.3, 1))).toBeLessThan(0.001);
    expect(squashAt(0.3, 0)).toBeCloseTo(0.3);
  });
});
