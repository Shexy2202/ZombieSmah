import { DAMAGE } from '../config/game';

/** Damage from a ground or body impact speed (px/step). */
export function impactDamage(speed: number): number {
  return Math.max(0, (speed - DAMAGE.safeImpact) * DAMAGE.impactDamagePerSpeed);
}
