import Phaser from 'phaser';
import { GROUND_Y } from '../config/game';
import { DecalLayer } from '../world/DecalLayer';

/** Feedback effects: blood bursts, screen shake. Sound hooks go through Audio later. */
export class Fx {
  private blood: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene, private decals: DecalLayer) {
    this.blood = scene.add.particles(0, 0, 'blood_drop', {
      speed: { min: 60, max: 260 },
      angle: { min: 200, max: 340 },
      gravityY: 900,
      scale: { start: 0.9, end: 0.4 },
      lifespan: { min: 350, max: 750 },
      emitting: false,
    }).setDepth(25);
    // Drops that fall to the walk strip leave a stain.
    this.blood.addDeathZone({
      type: 'onEnter',
      source: new Phaser.Geom.Rectangle(-1000, GROUND_Y - 2, 6000, 400),
    });
  }

  bloodBurst(x: number, y: number, amount = 14): void {
    this.blood.explode(amount, x, y);
    // Stains land roughly under the burst after a short delay.
    const n = Math.max(1, Math.round(amount / 7));
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(120 + i * 60, () => this.decals.bloodSplat(x + Phaser.Math.Between(-30, 30), 0.6 + amount / 40));
    }
  }

  shake(intensity = 0.004, ms = 90): void {
    this.scene.cameras.main.shake(ms, intensity, false);
  }
}
