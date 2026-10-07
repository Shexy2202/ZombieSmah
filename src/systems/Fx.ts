import Phaser from 'phaser';
import { GROUND_Y } from '../config/game';
import { Ragdoll, RagdollPart } from '../entities/Ragdoll';
import { DecalLayer } from '../world/DecalLayer';
import { texRes } from '../assets/art';

type Particle = Phaser.GameObjects.Particles.Particle;

/** Feedback effects: blood, stains, spurts, screen shake, hit-stop. */
export class Fx {
  private blood: Phaser.GameObjects.Particles.ParticleEmitter;
  private mist: Phaser.GameObjects.Particles.ParticleEmitter;
  private stopUntil = 0;

  constructor(private scene: Phaser.Scene, private decals: DecalLayer) {
    const r = 1 / texRes(scene, 'blood_drop');
    // Teardrops that point along their velocity and stretch with speed.
    this.blood = scene.add.particles(0, 0, 'blood_drop', {
      speed: { min: 80, max: 330 },
      angle: { min: 200, max: 340 },
      gravityY: 1100,
      lifespan: { min: 600, max: 1100 },
      rotate: { onEmit: () => 0, onUpdate: (p: Particle) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) },
      scaleX: { onEmit: () => r, onUpdate: (p: Particle) => r * Phaser.Math.Clamp(Math.hypot(p.velocityX, p.velocityY) / 260, 0.5, 1.6) },
      scaleY: { onEmit: () => r * Phaser.Math.FloatBetween(0.6, 1.1), onUpdate: (p: Particle, _k: string, _t: number, v: number) => v },
      emitting: false,
    }).setDepth(25);
    // Each drop that hits the walk strip leaves a small stain exactly where it lands.
    this.blood.addDeathZone({ type: 'onEnter', source: new Phaser.Geom.Rectangle(-1000, GROUND_Y - 1, 6000, 400) });
    this.blood.on(Phaser.GameObjects.Particles.Events.DEATH_ZONE, (_e: unknown, p: Particle) => {
      if (Math.random() < 0.55) this.decals.droplet(p.x, GROUND_Y - Phaser.Math.Between(0, 14));
    });

    const mr = 1 / texRes(scene, 'smoke');
    this.mist = scene.add.particles(0, 0, 'smoke', {
      speed: { min: 10, max: 60 },
      scale: { start: mr * 0.15, end: mr * 0.7 },
      alpha: { start: 0.45, end: 0 },
      tint: 0x9a0f18,
      lifespan: 420,
      emitting: false,
    }).setDepth(24);
  }

  get stopped(): boolean {
    return this.scene.time.now < this.stopUntil;
  }

  bloodBurst(x: number, y: number, amount = 14): void {
    this.blood.explode(amount, x, y);
    if (amount >= 14) this.mist.explode(3, x, y);
    // A pool forms under big bursts that happen near the ground.
    if (amount >= 14 && y > GROUND_Y - 80) {
      this.scene.time.delayedCall(180, () => this.decals.bloodSplat(x, 0.45 + amount / 60));
    }
  }

  /** Pulsing jet from a freshly torn joint, following the torso as it tumbles. */
  bloodSpurt(rag: Ragdoll, part: RagdollPart): void {
    const pulses = 6;
    for (let i = 0; i < pulses; i++) {
      this.scene.time.delayedCall(i * 85, () => {
        if (rag.byName.torso.removed) return;
        const a = rag.anchorWorld(part);
        const t = rag.torso;
        // Spray outward from the wound, away from the torso centre.
        const dir = Math.atan2(a.y - t.position.y, a.x - t.position.x);
        const deg = Phaser.Math.RadToDeg(dir);
        for (let k = 0; k < 3 - Math.floor(i / 3); k++) {
          const p = this.blood.emitParticleAt(a.x, a.y, 1);
          if (p) {
            const sp = Phaser.Math.Between(140, 260) * (1 - i / (pulses + 2));
            const ang = Phaser.Math.DegToRad(deg + Phaser.Math.Between(-18, 18));
            p.velocityX = Math.cos(ang) * sp + t.velocity.x * 60;
            p.velocityY = Math.sin(ang) * sp + t.velocity.y * 60;
          }
        }
      });
    }
  }

  shake(intensity = 0.004, ms = 90): void {
    this.scene.cameras.main.shake(ms, intensity, false);
  }

  /** Freeze physics briefly so big hits land with weight. */
  hitStop(ms: number): void {
    const world = this.scene.matter.world;
    if (this.stopped) return;
    this.stopUntil = this.scene.time.now + ms;
    world.pause();
    this.scene.time.delayedCall(ms, () => world.resume());
  }
}
