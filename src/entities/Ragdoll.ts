import Phaser from 'phaser';
import { M } from '../physics/matter';
import { texRes } from '../assets/art';
import { CAT, MASK } from '../config/game';
import { ZOMBIES, ZombieTypeId } from '../config/zombies';
import { PartDims, partDims } from './partDims';


export type PartName = 'head' | 'torso' | 'armBack' | 'armFront' | 'legBack' | 'legFront';
export type JointKind = 'neck' | 'shoulder' | 'hip';

export interface RagdollPart {
  name: PartName;
  body: MatterJS.BodyType;
  sprite: Phaser.GameObjects.Image;
  /** Constraint to the torso (null for torso or once detached). */
  joint: MatterJS.ConstraintType | null;
  jointKind: JointKind | null;
  /** Soft limit on angle relative to torso while attached. */
  limit: number;
  attached: boolean;
  /** Time (scene ms) when detached, for lifetime fading. */
  detachedAt: number;
  removed: boolean;
}

const DEPTH: Record<PartName, number> = {
  armBack: 0.1, legBack: 0.2, torso: 0.3, legFront: 0.4, head: 0.5, armFront: 0.6,
};

/**
 * Six-body ragdoll (head, torso, 2 arms, 2 legs) joined by pin constraints.
 * Owns its Matter bodies and the sprites that mirror them.
 */
export class Ragdoll {
  readonly parts: RagdollPart[] = [];
  readonly byName = {} as Record<PartName, RagdollPart>;
  readonly dims: PartDims;
  readonly group: number;
  /** Category/mask currently applied to attached parts. */
  private category: number = CAT.ZOMBIE_WALK;
  private mask: number = MASK.ZOMBIE_WALK;

  constructor(
    private scene: Phaser.Scene,
    readonly type: ZombieTypeId,
    x: number,
    torsoY: number,
    facing: 1 | -1,
    depthBase: number,
  ) {
    const def = ZOMBIES[type];
    const d = (this.dims = partDims(type));
    this.group = M.Body.nextGroup(true);
    const density = 0.002 * def.massMul;
    const common = (label: string): MatterJS.IChamferableBodyDefinition => ({
      label,
      density,
      friction: 0.7,
      frictionAir: 0.012,
      restitution: 0.05,
      collisionFilter: { group: this.group, category: this.category, mask: this.mask },
    });

    const shoulderY = torsoY - d.torsoH / 2 + d.armW * 0.6;
    const hipY = torsoY + d.torsoH / 2 - d.legW * 0.5;
    const neckY = torsoY - d.torsoH / 2;

    const torso = scene.matter.add.rectangle(x, torsoY, d.torsoW, d.torsoH, { ...common('torso'), chamfer: { radius: d.torsoW * 0.3 } });
    const head = scene.matter.add.circle(x, neckY - d.headR * 0.8, d.headR, common('head'));
    const mkArm = (name: PartName) =>
      scene.matter.add.rectangle(x, shoulderY + d.armH / 2 - d.armW / 2, d.armW, d.armH, { ...common(name), chamfer: { radius: d.armW * 0.45 } });
    const mkLeg = (name: PartName) =>
      scene.matter.add.rectangle(x, hipY + d.legH / 2 - d.legW / 2, d.legW, d.legH, { ...common(name), chamfer: { radius: d.legW * 0.4 } });

    const add = (name: PartName, body: MatterJS.BodyType, texPart: string, joint: MatterJS.ConstraintType | null, jointKind: JointKind | null, limit: number) => {
      const key = `${def.art}_${texPart}`;
      const sprite = scene.add.image(body.position.x, body.position.y, key);
      sprite.setScale(1 / texRes(scene, key));
      sprite.setFlipX(facing < 0);
      sprite.setDepth(depthBase + DEPTH[name]);
      if (name === 'armBack' || name === 'legBack') sprite.setTint(0xb8b8c8);
      const part: RagdollPart = { name, body, sprite, joint, jointKind, limit, attached: true, detachedAt: 0, removed: false };
      this.parts.push(part);
      this.byName[name] = part;
    };

    const pin = (b: MatterJS.BodyType, torsoLocalY: number, partLocalY: number) =>
      scene.matter.add.constraint(torso, b, 0, 0.9, {
        pointA: { x: 0, y: torsoLocalY },
        pointB: { x: 0, y: partLocalY },
        damping: 0.05,
      });

    add('torso', torso, 'torso', null, null, 0);
    add('head', head, 'head', pin(head, -d.torsoH / 2, d.headR * 0.8), 'neck', 0.6);
    for (const name of ['armBack', 'armFront'] as PartName[]) {
      const b = mkArm(name);
      add(name, b, 'arm', pin(b, shoulderY - torsoY, -d.armH / 2 + d.armW / 2), 'shoulder', 3.0);
    }
    for (const name of ['legBack', 'legFront'] as PartName[]) {
      const b = mkLeg(name);
      add(name, b, 'leg', pin(b, hipY - torsoY, -d.legH / 2 + d.legW / 2), 'hip', 1.7);
    }
  }

  get torso(): MatterJS.BodyType {
    return this.byName.torso.body;
  }

  /** World position of a part's joint anchor on the torso. */
  jointWorldPos(part: RagdollPart): Phaser.Math.Vector2 {
    if (!part.joint) return new Phaser.Math.Vector2(part.body.position.x, part.body.position.y);
    const t = this.torso;
    const p = part.joint.pointA;
    return new Phaser.Math.Vector2(t.position.x + p.x, t.position.y + p.y);
  }

  setCollision(category: number, mask: number): void {
    this.category = category;
    this.mask = mask;
    for (const p of this.parts) {
      if (p.attached && !p.removed) {
        p.body.collisionFilter.category = category;
        p.body.collisionFilter.mask = mask;
      }
    }
  }

  /** Tear a limb or head off. Returns false if it was already detached. */
  detach(part: RagdollPart): boolean {
    if (!part.attached || !part.joint) return false;
    this.scene.matter.world.removeConstraint(part.joint);
    part.joint = null;
    part.attached = false;
    part.detachedAt = this.scene.time.now;
    part.body.collisionFilter.category = CAT.PART;
    part.body.collisionFilter.mask = MASK.PART;
    return true;
  }

  forEachAttached(fn: (p: RagdollPart) => void): void {
    for (const p of this.parts) if (p.attached && !p.removed) fn(p);
  }

  /** Keep attached limbs within soft angular limits relative to the torso. */
  enforceLimits(): void {
    const ta = this.torso.angle;
    for (const p of this.parts) {
      if (!p.attached || !p.joint || p.removed) continue;
      const rel = Phaser.Math.Angle.Wrap(p.body.angle - ta);
      if (rel > p.limit) M.Body.setAngularVelocity(p.body, p.body.angularVelocity - (rel - p.limit) * 0.25);
      else if (rel < -p.limit) M.Body.setAngularVelocity(p.body, p.body.angularVelocity - (rel + p.limit) * 0.25);
    }
  }

  sync(): void {
    for (const p of this.parts) {
      if (p.removed) continue;
      p.sprite.setPosition(p.body.position.x, p.body.position.y);
      p.sprite.setRotation(p.body.angle);
    }
  }

  removePart(p: RagdollPart): void {
    if (p.removed) return;
    p.removed = true;
    if (p.joint) this.scene.matter.world.removeConstraint(p.joint);
    p.joint = null;
    this.scene.matter.world.remove(p.body);
    p.sprite.destroy();
  }

  destroy(): void {
    for (const p of this.parts) this.removePart(p);
  }

  get allRemoved(): boolean {
    return this.parts.every((p) => p.removed);
  }
}
