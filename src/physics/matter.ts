import Phaser from 'phaser';

/** The Matter.js namespace bundled inside Phaser (not exposed in Phaser's typings). */
export const M = (Phaser.Physics.Matter as unknown as { Matter: typeof MatterJS }).Matter;

/** Minimal shape of a Matter collision pair as delivered in collision events. */
export interface CollisionPair {
  bodyA: MatterJS.BodyType;
  bodyB: MatterJS.BodyType;
  collision: { normal: { x: number; y: number }; supports?: { x: number; y: number }[] };
}
