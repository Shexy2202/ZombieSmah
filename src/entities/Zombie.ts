import Phaser from 'phaser';
import { M } from '../physics/matter';
import { CAT, GROUND_Y, HOUSE_X, MASK, PHYSICS, ZOMBIE_AI } from '../config/game';
import { ZOMBIES, ZombieTypeDef, ZombieTypeId } from '../config/zombies';
import { partDims } from './partDims';
import { Ragdoll, RagdollPart } from './Ragdoll';
import { ZombieRig } from './ZombieRig';

const Wrap = Phaser.Math.Angle.Wrap;

export type ZombieState = 'WALK' | 'ATTACK' | 'GRABBED' | 'AIRBORNE' | 'RECOVER' | 'CRAWL' | 'DEAD';

export interface ZombieHost {
  bloodBurst(x: number, y: number, amount?: number): void;
  /** Short pulsing stream from a freshly torn joint. */
  bloodSpurt(z: Zombie, part: RagdollPart): void;
  /** Brief physics freeze on big hits. */
  hitStop(ms: number): void;
  shake(intensity?: number, ms?: number): void;
  onZombieKilled(z: Zombie): void;
  onHouseDamage(z: Zombie, amount: number): void;
}

/** Lookup from a Matter body back to its zombie + part. */
const owners = new WeakMap<MatterJS.BodyType, { zombie: Zombie; part: RagdollPart }>();
export function ownerOf(body: MatterJS.BodyType): { zombie: Zombie; part: RagdollPart } | undefined {
  return owners.get(body.parent ?? body);
}

let nextId = 1;

export class Zombie {
  readonly id = nextId++;
  readonly def: ZombieTypeDef;
  readonly rag: Ragdoll;
  readonly rig: ZombieRig;
  state: ZombieState = 'WALK';
  hp: number;
  /** +1 walks right (spawned on the left), -1 walks left. */
  dir: 1 | -1;
  diedAt = 0;
  private phase = Math.random() * Math.PI * 2;
  private settleMs = 0;
  private recoverMs = 0;
  private speedMul = 1;
  /** Per-zombie gait variation so crowds never march in step. */
  private stride = Phaser.Math.FloatBetween(0.85, 1.2);
  private readonly standY: number;
  private readonly crawlY: number;

  constructor(private scene: Phaser.Scene, private host: ZombieHost, type: ZombieTypeId, x: number, dir: 1 | -1, speedMul = 1) {
    this.def = ZOMBIES[type];
    this.hp = this.def.hp;
    this.dir = dir;
    this.speedMul = speedMul * Phaser.Math.FloatBetween(0.85, 1.15);
    const dims = partDims(type);
    this.standY = GROUND_Y - dims.legH - dims.torsoH / 2 + dims.legW;
    this.crawlY = GROUND_Y - dims.torsoW / 2 - 1;
    this.rag = new Ragdoll(scene, type, x, this.standY);
    this.rig = new ZombieRig(scene, this.rag, type, dir, this.id % 400);
    for (const p of this.rag.parts) owners.set(p.body, { zombie: this, part: p });
  }

  get alive(): boolean {
    return this.state !== 'DEAD';
  }

  get x(): number {
    return this.rag.torso.position.x;
  }

  get y(): number {
    return this.rag.torso.position.y;
  }

  get legless(): boolean {
    return !this.rag.byName.legBack.attached && !this.rag.byName.legFront.attached;
  }

  /** Puppeted states hold the ragdoll upright and ignore ground collision. */
  private get puppeted(): boolean {
    return this.state === 'WALK' || this.state === 'ATTACK' || this.state === 'CRAWL';
  }

  // ---------------------------------------------------------------- state changes

  setState(s: ZombieState): void {
    if (this.state === 'DEAD') return;
    this.state = s;
    this.settleMs = 0;
    this.recoverMs = 0;
    switch (s) {
      case 'WALK':
      case 'ATTACK':
      case 'CRAWL':
        this.faceHouse();
        this.rag.setCollision(CAT.ZOMBIE_WALK, MASK.ZOMBIE_WALK);
        break;
      case 'GRABBED':
      case 'AIRBORNE':
      case 'RECOVER':
        if (s === 'RECOVER') this.faceHouse();
        this.rag.setCollision(CAT.ZOMBIE_FLY, MASK.ZOMBIE_FLY);
        break;
      case 'DEAD':
        this.rag.setCollision(CAT.PART, MASK.PART);
        break;
    }
  }

  /** Zombies flung past the house turn around. */
  private faceHouse(): void {
    const d: 1 | -1 = this.x < HOUSE_X ? 1 : -1;
    if (d === this.dir) return;
    this.dir = d;
    this.rig.setFacing(d);
  }

  /** Switch to loose ragdoll after a hit (no-op for heavy unflickable types unless forced). */
  knockDown(force = false): void {
    if (!this.alive || this.state === 'GRABBED') return;
    if (!this.def.flickable && !force) return;
    this.setState('AIRBORNE');
  }

  damage(amount: number, at?: { x: number; y: number }): void {
    if (!this.alive || amount <= 0) return;
    this.hp -= amount;
    if (amount > 4) this.rig.flash();
    if (at && amount > 15) this.host.bloodBurst(at.x, at.y, Math.min(24, 6 + amount / 6));
    if (this.hp <= 0) this.kill();
  }

  private impactWindowStart = -1e9;
  private impactWindowDmg = 0;

  /**
   * Impact damage from hitting the ground. All parts landing within a short window
   * count as one impact (the hardest one), so six limbs don't multiply damage.
   */
  impact(dmg: number, at: { x: number; y: number }): void {
    const now = this.scene.time.now;
    if (now - this.impactWindowStart > 150) {
      this.impactWindowStart = now;
      this.impactWindowDmg = 0;
    }
    const extra = dmg - this.impactWindowDmg;
    if (extra <= 0) return;
    this.impactWindowDmg = dmg;
    this.damage(extra, at);
  }

  /** Any ground contact (alive or dead): squash and settle. */
  onGroundContact(speed: number, part: RagdollPart): void {
    if (speed < 3) return;
    if (part.name === 'torso' || part.name === 'head') this.rig.squash(Math.min(0.28, speed * 0.018));
  }

  kill(): void {
    if (!this.alive) return;
    this.hp = 0;
    this.setState('DEAD');
    this.diedAt = this.scene.time.now;
    this.host.bloodBurst(this.x, this.y, 18);
    this.host.onZombieKilled(this);
  }

  /** Tear off a limb or head. Losing the head kills; losing both legs makes a crawler. */
  dismember(part: RagdollPart): void {
    if (part.name === 'torso') return;
    const at = this.rag.anchorWorld(part);
    if (!this.rag.detach(part)) return;
    this.rig.addStump(part);
    this.host.bloodBurst(at.x, at.y, 16);
    this.host.bloodSpurt(this, part);
    if (part.name === 'head') {
      this.kill();
    } else if (this.legless && this.alive && this.puppeted) {
      this.setState('CRAWL');
    }
  }

  // ---------------------------------------------------------------- grabbing

  canGrab(): boolean {
    return this.alive && this.def.flickable;
  }

  grab(): void {
    this.setState('GRABBED');
  }

  /** Throw with velocity in px/step (already scaled and clamped). */
  release(v: { x: number; y: number }): void {
    if (this.state !== 'GRABBED') return;
    this.rag.forEachAttached((p) => {
      M.Body.setVelocity(p.body, v);
      M.Body.setAngularVelocity(p.body, p.body.angularVelocity + Phaser.Math.FloatBetween(-0.05, 0.05));
    });
    this.setState('AIRBORNE');
  }

  // ---------------------------------------------------------------- per physics step

  /** Called from Matter 'beforeupdate' at the fixed physics rate. */
  physicsStep(dtMs: number): void {
    const rag = this.rag;
    // Clamp speeds and keep everything above ground.
    for (const p of rag.parts) {
      if (p.removed) continue;
      const v = p.body.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > PHYSICS.maxPartSpeed) M.Body.setVelocity(p.body, { x: (v.x / sp) * PHYSICS.maxPartSpeed, y: (v.y / sp) * PHYSICS.maxPartSpeed });
      if (p.body.position.y > GROUND_Y + 12 && (p.body.collisionFilter.mask & CAT.GROUND)) {
        M.Body.setPosition(p.body, { x: p.body.position.x, y: GROUND_Y - 4 });
        M.Body.setVelocity(p.body, { x: p.body.velocity.x, y: 0 });
      }
    }

    if (this.state === 'DEAD') {
      this.loose();
      return;
    }

    const dist = Math.abs(this.x - HOUSE_X);
    const gaitRate = 0.0065 * this.speedMul * this.stride;
    switch (this.state) {
      case 'WALK': {
        if (dist <= ZOMBIE_AI.attackRange) this.setState('ATTACK');
        this.phase += dtMs * gaitRate;
        // Lurch: surge forward as the lead leg swings through.
        const surge = 0.7 + 0.6 * Math.max(0, Math.cos(this.phase));
        this.puppet(1, this.dir * this.def.speed * this.speedMul * surge, 'walk');
        break;
      }
      case 'ATTACK':
        this.phase += dtMs * 0.007;
        this.puppet(1, 0, 'attack');
        this.host.onHouseDamage(this, (this.def.dps * dtMs) / 1000);
        break;
      case 'CRAWL':
        this.phase += dtMs * 0.005;
        this.puppet(1, dist <= ZOMBIE_AI.attackRange ? 0 : this.dir * this.def.speed * 0.35 * this.speedMul * (0.5 + Math.max(0, Math.sin(this.phase))), 'crawl');
        if (dist <= ZOMBIE_AI.attackRange) this.host.onHouseDamage(this, (this.def.dps * 0.5 * dtMs) / 1000);
        break;
      case 'GRABBED':
        this.loose();
        break;
      case 'AIRBORNE': {
        this.loose();
        const v = rag.torso.velocity;
        const settled = Math.hypot(v.x, v.y) < ZOMBIE_AI.settleSpeed && this.y > GROUND_Y - this.rag.dims.torsoH * 1.5;
        this.settleMs = settled ? this.settleMs + dtMs : 0;
        if (this.settleMs >= ZOMBIE_AI.settleTimeMs) {
          this.setState('RECOVER');
        }
        break;
      }
      case 'RECOVER': {
        this.recoverMs += dtMs;
        const t = Math.min(1, this.recoverMs / ZOMBIE_AI.recoverTimeMs);
        // Smoothstep with a crouch that straightens out: a visible struggle to stand.
        const gain = t * t * (3 - 2 * t);
        this.phase += dtMs * 0.004;
        this.puppet(gain, 0, this.legless ? 'crawl' : 'walk', 1 - t);
        if (t >= 1) this.setState(this.legless ? 'CRAWL' : 'WALK');
        break;
      }
    }
  }

  /** Free ragdoll: joint limits, soft relaxed knees/elbows. */
  private loose(): void {
    this.rag.enforceLimits();
    this.rig.drive = 0;
  }

  /**
   * Drive the ragdoll toward a procedural pose by setting velocities.
   * gain 0 = free ragdoll, 1 = fully puppeted. `crouch` 0..1 bends the knees (getting up).
   */
  private puppet(gain: number, vx: number, pose: 'walk' | 'attack' | 'crawl', crouch = 0): void {
    const rag = this.rag;
    const torso = rag.torso;
    const dir = this.dir;
    const ph = this.phase;
    const gStep = PHYSICS.gravityY * 0.001 * (1000 / 60) ** 2;
    const crawling = pose === 'crawl';
    const rel: Record<string, number> = {};
    const bend = this.rig.bendTarget;
    let targetY = crawling ? this.crawlY : this.standY;
    let targetA = crawling ? dir * (Math.PI / 2) : dir * 0.2;

    if (pose === 'walk') {
      const s = Math.sin(ph), c = Math.cos(ph);
      // Body dips when the legs are spread, lolls side to side.
      targetY += 1.8 * Math.abs(s) + crouch * this.rag.dims.legH * 0.35;
      targetA += dir * (0.05 * Math.sin(2 * ph) + crouch * 0.35);
      rel.legFront = -dir * 0.5 * s;
      rel.legBack = dir * 0.42 * s;
      bend.legFront = 0.08 + 0.6 * Math.pow(Math.max(0, c), 1.5) + crouch * 1.3;
      // Back leg drags: a shuffle with a weaker lift.
      bend.legBack = 0.06 + 0.32 * Math.max(0, -c) + crouch * 1.3;
      rel.armFront = -dir * (1.3 + 0.12 * Math.sin(ph + 1));
      rel.armBack = -dir * (1.12 - 0.12 * Math.sin(ph + 1));
      bend.armFront = 0.22 + 0.15 * Math.sin(ph + 2);
      bend.armBack = 0.38 + 0.12 * Math.sin(ph + 2.6);
      rel.head = dir * (0.22 + 0.14 * Math.sin(2 * ph + 0.5));
    } else if (pose === 'attack') {
      // Two-fisted overhead pound: slow wind-up (anticipation), fast strike, recover.
      const t = (ph / (Math.PI * 2)) % 1;
      const ease = (x: number) => 1 - (1 - x) * (1 - x);
      let raise: number;
      if (t < 0.55) raise = ease(t / 0.55);
      else if (t < 0.68) raise = 1 - (t - 0.55) / 0.13;
      else raise = 0;
      const arm = Phaser.Math.Linear(0.95, 2.75, raise);
      rel.armFront = -dir * arm;
      rel.armBack = -dir * (arm - 0.15);
      bend.armFront = bend.armBack = Phaser.Math.Linear(0.15, 0.9, raise);
      targetA = dir * Phaser.Math.Linear(0.32, -0.06, raise);
      targetY += Phaser.Math.Linear(2, 0, raise);
      rel.legFront = -dir * 0.18;
      rel.legBack = dir * 0.2;
      bend.legFront = 0.3;
      bend.legBack = 0.15;
      rel.head = dir * Phaser.Math.Linear(0.3, -0.1, raise);
    } else {
      // Crawl: torso flat, arms paddle toward the house.
      const s = Math.sin(ph);
      rel.armFront = -dir * (2.0 + s * 0.6);
      rel.armBack = -dir * (2.0 - s * 0.6);
      bend.armFront = 0.5 + 0.5 * Math.max(0, s);
      bend.armBack = 0.5 + 0.5 * Math.max(0, -s);
      rel.head = -dir * 0.6;
      rel.legFront = 0;
      rel.legBack = 0;
      targetY += Math.abs(s) * -1.5;
    }
    this.rig.drive = gain;

    const tv = torso.velocity;
    const wantVy = (targetY - torso.position.y) * 0.2 - gStep;
    M.Body.setVelocity(torso, {
      x: Phaser.Math.Linear(tv.x, vx, gain),
      y: Phaser.Math.Linear(tv.y, wantVy, gain),
    });
    const wantAv = Wrap(targetA - torso.angle) * 0.25;
    M.Body.setAngularVelocity(torso, Phaser.Math.Linear(torso.angularVelocity, wantAv, gain));

    rag.forEachAttached((p) => {
      if (p.name === 'torso') return;
      const want = Wrap(torso.angle + (rel[p.name] ?? 0) - p.body.angle) * 0.3;
      M.Body.setAngularVelocity(p.body, Phaser.Math.Linear(p.body.angularVelocity, want, gain));
    });
  }

  /** Sprite sync, once per render frame. */
  render(dtMs: number): void {
    this.rig.sync(dtMs);
  }

  destroy(): void {
    this.rag.destroy();
  }
}
