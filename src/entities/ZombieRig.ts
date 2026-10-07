import Phaser from 'phaser';
import { segLayout, SegKind } from '../assets/gen/zombie';
import { texRes } from '../assets/art';
import { GROUND_Y } from '../config/game';
import { ZombieTypeId, ZOMBIES } from '../config/zombies';
import { PartName, Ragdoll, RagdollPart } from './Ragdoll';
import { BendParams, BendSpring, along, squashAt, stepBend } from './rigMath';

type Limb = 'armBack' | 'armFront' | 'legBack' | 'legFront';
const LIMBS: Limb[] = ['armBack', 'armFront', 'legBack', 'legFront'];

/** Local depth offsets (×0.01 of the per-zombie depth slot). Outlines sit under all fills. */
const D = {
  backOutline: 0.02,
  armBackLower: 0.1, armBackUpper: 0.11,
  legBackLower: 0.2, legBackUpper: 0.21,
  frontOutline: 0.25,
  torso: 0.3, stumpTorso: 0.31,
  legFrontLower: 0.4, legFrontUpper: 0.41,
  head: 0.5,
  armFrontLower: 0.6, armFrontUpper: 0.61,
};

const KNEE: BendParams = { stiffness: 260, damping: 16, min: 0, max: 2.1 };
const ELBOW: BendParams = { stiffness: 200, damping: 12, min: 0, max: 2.3 };
const BACK_SHADE = 0xa7adc4;

interface LimbVis {
  upper: Phaser.GameObjects.Image;
  upperOl: Phaser.GameObjects.Image;
  lower: Phaser.GameObjects.Image;
  lowerOl: Phaser.GameObjects.Image;
  upperLen: number;
  spring: BendSpring;
  lastAngle: number;
  lastAngVel: number;
  stump?: Phaser.GameObjects.Image;
  stumpTorso?: Phaser.GameObjects.Image;
}

/**
 * Draws a Ragdoll as one cartoon character: a unified outline layer under all
 * fill layers, two-segment arms and legs with sprung elbows/knees for secondary
 * motion, squash-and-stretch, hit flash, torn-joint stumps and a contact shadow.
 */
export class ZombieRig {
  /** Target bend per limb, set each frame by the zombie's pose (radians). */
  readonly bendTarget: Record<Limb, number> = { armBack: 0.35, armFront: 0.35, legBack: 0.1, legFront: 0.1 };
  /** 0 = loose ragdoll (springs soft), 1 = puppeted (springs track the pose tightly). */
  drive = 1;
  private limbs = {} as Record<Limb, LimbVis>;
  private head: Phaser.GameObjects.Image[];
  private torso: Phaser.GameObjects.Image[];
  private shadow: Phaser.GameObjects.Image;
  private facing: 1 | -1;
  private squashAmt = 0;
  private squashT = 0;
  private breath = Math.random() * 10;
  private flashUntil = 0;
  private baseDepth: number;

  constructor(private scene: Phaser.Scene, private rag: Ragdoll, type: ZombieTypeId, facing: 1 | -1, slot: number) {
    this.facing = facing;
    this.baseDepth = 20 + slot * 0.01;
    const art = ZOMBIES[type].art as ZombieTypeId;
    const mk = (kind: SegKind, outline: boolean, depth: number, part: PartName, tint?: number) => {
      const key = `${art}_${kind}${outline ? '_ol' : ''}`;
      const L = segLayout(art, kind);
      const img = scene.add.image(0, 0, key).setOrigin(L.ox, L.oy).setScale(1 / texRes(scene, key));
      img.setDepth(this.baseDepth + depth * 0.01).setFlipX(facing < 0);
      if (tint !== undefined) img.setTint(tint);
      rag.byName[part].sprites.push(img);
      return img;
    };

    this.torso = [mk('torso', true, D.frontOutline, 'torso'), mk('torso', false, D.torso, 'torso')];
    this.head = [mk('head', true, D.frontOutline, 'head'), mk('head', false, D.head, 'head')];
    for (const limb of LIMBS) {
      const back = limb.endsWith('Back');
      const isArm = limb.startsWith('arm');
      const upperKind: SegKind = isArm ? 'upperArm' : 'thigh';
      const lowerKind: SegKind = isArm ? 'foreArm' : 'shin';
      const olDepth = back ? D.backOutline : D.frontOutline;
      const lowerD = D[`${limb}Lower` as keyof typeof D];
      const upperD = D[`${limb}Upper` as keyof typeof D];
      const tint = back ? BACK_SHADE : undefined;
      this.limbs[limb] = {
        lowerOl: mk(lowerKind, true, olDepth, limb),
        upperOl: mk(upperKind, true, olDepth, limb),
        lower: mk(lowerKind, false, lowerD, limb, tint),
        upper: mk(upperKind, false, upperD, limb, tint),
        upperLen: segLayout(art, upperKind).len,
        spring: { b: this.bendTarget[limb], v: 0 },
        lastAngle: rag.byName[limb].body.angle,
        lastAngVel: 0,
      };
    }
    this.shadow = scene.add.image(0, GROUND_Y - 1, 'shadow').setDepth(11.6);
    this.shadow.setScale(1 / texRes(scene, 'shadow'));
    rag.byName.torso.sprites.push(this.shadow);
  }

  setFacing(f: 1 | -1): void {
    if (f === this.facing) return;
    this.facing = f;
    for (const p of this.rag.parts) for (const s of p.sprites) if (s !== this.shadow) s.setFlipX(f < 0);
  }

  /** Landing squash; amount ~0.1-0.3. */
  squash(amount: number): void {
    if (amount > this.squashAmt * Math.exp(-this.squashT * 9)) {
      this.squashAmt = amount;
      this.squashT = 0;
    }
  }

  flash(ms = 70): void {
    this.flashUntil = this.scene.time.now + ms;
  }

  /** Torn joint: raw stump on the torso and on the severed limb's end. */
  addStump(part: RagdollPart): void {
    const mkStump = (owner: RagdollPart, depth: number) => {
      const img = this.scene.add.image(0, 0, 'stump').setScale(1 / texRes(this.scene, 'stump'));
      img.setDepth(depth);
      owner.sprites.push(img);
      return img;
    };
    if (part.name === 'head') {
      this.headStump = mkStump(this.rag.byName.torso, this.baseDepth + D.stumpTorso * 0.01);
      return;
    }
    const v = this.limbs[part.name as Limb];
    if (!v) return;
    v.stumpTorso = mkStump(this.rag.byName.torso, this.baseDepth + D.stumpTorso * 0.01);
    v.stump = mkStump(part, v.upper.depth + 0.00005);
  }

  private headStump?: Phaser.GameObjects.Image;

  /** Per render frame. */
  sync(dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    const rag = this.rag;
    const flash = this.scene.time.now < this.flashUntil;

    // Squash & breathing on torso and head.
    this.squashT += dt;
    const sq = squashAt(this.squashAmt, this.squashT);
    this.breath += dt * 2.2;
    const breathe = 1 + Math.sin(this.breath) * 0.015 * this.drive;

    const torsoB = rag.torso;
    for (const s of this.torso) {
      const r = 1 / texRes(this.scene, s.texture.key);
      s.setPosition(torsoB.position.x, torsoB.position.y).setRotation(torsoB.angle);
      s.setScale(r * (1 + sq), r * (1 - sq) * breathe);
    }
    const headP = rag.byName.head;
    if (!headP.removed) {
      for (const s of this.head) {
        const r = 1 / texRes(this.scene, s.texture.key);
        s.setPosition(headP.body.position.x, headP.body.position.y).setRotation(headP.body.angle);
        s.setScale(r * (1 + sq * 0.6), r * (1 - sq * 0.6));
      }
    }
    if (this.headStump) {
      const a = Ragdoll.worldOf(torsoB, headP.torsoAnchor);
      this.headStump.setPosition(a.x, a.y).setRotation(torsoB.angle);
    }

    for (const limb of LIMBS) {
      const part = rag.byName[limb];
      if (part.removed) continue;
      const v = this.limbs[limb];
      const b = part.body;
      const piv = rag.pivotWorld(part);
      const a1 = b.angle;

      // Feed the limb's angular acceleration into the lower segment so it lags behind swings.
      const angVel = Phaser.Math.Angle.Wrap(a1 - v.lastAngle) / Math.max(dt, 1e-3);
      const angAcc = (angVel - v.lastAngVel) / Math.max(dt, 1e-3);
      v.lastAngle = a1;
      v.lastAngVel = angVel;
      const isLeg = limb.startsWith('leg');
      // Knees fold backward, elbows forward, relative to facing.
      const sign = isLeg ? this.facing : -this.facing;
      const params = isLeg ? KNEE : ELBOW;
      const drive = part.attached ? this.drive : 0;
      const p: BendParams = { ...params, stiffness: params.stiffness * (0.25 + drive * 0.75) };
      const target = part.attached ? Phaser.Math.Linear(isLeg ? 0.25 : 0.5, this.bendTarget[limb], drive) : 0.6;
      stepBend(v.spring, target, -angAcc * 0.35 * sign * (1 - drive * 0.8), p, dt);

      const a2 = a1 + v.spring.b * sign;
      const elbow = along(piv.x, piv.y, a1, v.upperLen);
      for (const s of [v.upper, v.upperOl]) s.setPosition(piv.x, piv.y).setRotation(a1);
      for (const s of [v.lower, v.lowerOl]) s.setPosition(elbow.x, elbow.y).setRotation(a2);
      if (v.stump) v.stump.setPosition(piv.x, piv.y).setRotation(a1);
      if (v.stumpTorso) {
        const a = Ragdoll.worldOf(torsoB, part.torsoAnchor);
        v.stumpTorso.setPosition(a.x, a.y).setRotation(torsoB.angle + Math.PI / 2);
      }
    }

    // Flash all fills white on hit.
    for (const p of rag.parts) {
      for (const s of p.sprites) {
        if (s === this.shadow || s.texture.key.endsWith('_ol') || s.texture.key === 'stump') continue;
        if (flash) s.setTintFill(0xffffff);
        else if (s.tintFill) {
          s.clearTint();
          if (p.name.endsWith('Back')) s.setTint(BACK_SHADE);
        }
      }
    }

    // Contact shadow: shrinks and fades with height above the ground.
    let lowest = -Infinity;
    for (const p of rag.parts) if (p.attached && !p.removed) lowest = Math.max(lowest, p.body.bounds.max.y);
    const h = Math.max(0, GROUND_Y - lowest);
    const k = Math.max(0, 1 - h / 260);
    const r = 1 / texRes(this.scene, 'shadow');
    this.shadow.setPosition(torsoB.position.x, GROUND_Y - 1);
    this.shadow.setScale(r * (0.55 + 0.45 * k) * (rag.dims.torsoW / 18), r * (0.55 + 0.45 * k));
    this.shadow.setAlpha(0.15 + 0.6 * k);
  }
}
