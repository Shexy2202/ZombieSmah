/** Pure helpers for the visual rig (kept Phaser-free for unit tests). */

export interface BendSpring {
  b: number; // current bend (rad, >= 0)
  v: number; // bend velocity (rad/s)
}

export interface BendParams {
  stiffness: number; // 1/s^2
  damping: number; // 1/s
  min: number;
  max: number;
}

/**
 * Advance a damped spring toward `target`. `kick` is an extra angular
 * acceleration (rad/s^2), used to feed in the parent limb's swing so the lower
 * segment lags and flops like a real joint.
 */
export function stepBend(s: BendSpring, target: number, kick: number, p: BendParams, dt: number): void {
  const acc = p.stiffness * (target - s.b) - p.damping * s.v + kick;
  s.v += acc * dt;
  s.b += s.v * dt;
  if (s.b < p.min) {
    s.b = p.min;
    if (s.v < 0) s.v *= -0.3;
  } else if (s.b > p.max) {
    s.b = p.max;
    if (s.v > 0) s.v *= -0.3;
  }
}

/** Point at distance `len` along a limb whose rest direction is +y, rotated by `angle`. */
export function along(x: number, y: number, angle: number, len: number): { x: number; y: number } {
  return { x: x - Math.sin(angle) * len, y: y + Math.cos(angle) * len };
}

/** Damped squash oscillation, 0 when settled. */
export function squashAt(amount: number, tSec: number): number {
  return amount * Math.exp(-tSec * 9) * Math.cos(tSec * 28);
}
