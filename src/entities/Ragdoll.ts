import Phaser from 'phaser';
import { M } from '../physics/matter';
import { CAT, MASK } from '../config/game';
import { ZOMBIES, ZombieTypeId } from '../config/zombies';
import { PartDims, partDims } from './partDims';

export type PartName = 'head' | 'torso' | 'armBack' | 'armFront' | 'legBack' | 'legFront';
export type JointKind = 'neck' | 'shoulder' | 'hip';

export interface RagdollPart {
  name: PartName;
  body: MatterJS.BodyType;
  /** Display objects belonging to this part (owned by the rig, faded/destroyed with the part). */
  sprites: Phaser.GameObjects.Image[];
  /** Constraint to the torso (null for torso or once detached). */
  joint: MatterJS.ConstraintType | null;
  jointKind: JointKind | null;
  /** Joint anchor on the part, in the part's local frame (fixed at creation). */
  pivotLocal: { x: number; y: number };
  /** Joint anchor on the torso, in the torso's local frame. */
  torsoAnchor: { x: number; y: number };
  /** Soft limit on angle relative to torso while attached. */
  limit: number;
  attached: boolean;
  /** Time (scene ms) when detached, for lifetime fading. */
  detachedAt: number;
  removed: boolean;
}

/**
 * Six-body ragdoll (head, torso, 2 arms, 2 legs) joined by pin constraints.
 * Physics only: ZombieRig draws it.
 */
export class Ragdoll {
  readonly parts: RagdollPart[] = [];
  readonly byName = {} as Record<PartName, RagdollPart>;
  readonly dims: PartDims;
  readonly group: number;
  private category: number = CAT.ZOMBIE_WALK;
  private mask: number = MASK.ZOMBIE_WALK;

  constructor(private scene: Phaser.Scene, readonly type: ZombieTypeId, x: number, torsoY: number) {
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

    const shoulderLocal = -d.torsoH / 2 + d.armW * 0.6;
    const hipLocal = d.torsoH / 2 - d.legW * 0.5;
    const torso = scene.matter.add.rectangle(x, torsoY, d.torsoW, d.torsoH, { ...common('torso'), chamfer: { radius: d.torsoW * 0.3 } });

    const add = (name: PartName, body: MatterJS.BodyType, jointKind: JointKind | null, torsoLocalY: number, partLocalY: number, limit: number) => {
      const joint = jointKind
        ? scene.matter.add.constraint(torso, body, 0, 0.9, { pointA: { x: 0, y: torsoLocalY }, pointB: { x: 0, y: partLocalY }, damping: 0.05 })
        : null;
      const part: RagdollPart = {
        name, body, sprites: [], joint, jointKind, limit,
        pivotLocal: { x: 0, y: partLocalY }, torsoAnchor: { x: 0, y: torsoLocalY },
        attached: true, detachedAt: 0, removed: false,
      };
      this.parts.push(part);
      this.byName[name] = part;
    };

    add('torso', torso, null, 0, 0, 0);
    const head = scene.matter.add.circle(x, torsoY - d.torsoH / 2 - d.headR * 0.8, d.headR, common('head'));
    add('head', head, 'neck', -d.torsoH / 2, d.headR * 0.8, 0.6);
    for (const name of ['armBack', 'armFront'] as PartName[]) {
      const b = scene.matter.add.rectangle(x, torsoY + shoulderLocal + d.armH / 2 - d.armW / 2, d.armW, d.armH, { ...common(name), chamfer: { radius: d.armW * 0.45 } });
      add(name, b, 'shoulder', shoulderLocal, -d.armH / 2 + d.armW / 2, 3.0);
    }
    for (const name of ['legBack', 'legFront'] as PartName[]) {
      const b = scene.matter.add.rectangle(x, torsoY + hipLocal + d.legH / 2 - d.legW / 2, d.legW, d.legH, { ...common(name), chamfer: { radius: d.legW * 0.4 } });
      add(name, b, 'hip', hipLocal, -d.legH / 2 + d.legW / 2, 1.7);
    }
  }

  get torso(): MatterJS.BodyType {
    return this.byName.torso.body;
  }

  /** World position of a point given in a body's local (unrotated) frame. */
  static worldOf(body: MatterJS.BodyType, local: { x: number; y: number }): { x: number; y: number } {
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    return { x: body.position.x + local.x * c - local.y * s, y: body.position.y + local.x * s + local.y * c };
  }

  /** World position of a part's joint pivot (where it attaches / attached to the torso). */
  pivotWorld(part: RagdollPart): { x: number; y: number } {
    return Ragdoll.worldOf(part.body, part.pivotLocal);
  }

  /** World position of a part's anchor on the torso. */
  anchorWorld(part: RagdollPart): Phaser.Math.Vector2 {
    const p = Ragdoll.worldOf(this.torso, part.torsoAnchor);
    return new Phaser.Math.Vector2(p.x, p.y);
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

  removePart(p: RagdollPart): void {
    if (p.removed) return;
    p.removed = true;
    if (p.joint) this.scene.matter.world.removeConstraint(p.joint);
    p.joint = null;
    this.scene.matter.world.remove(p.body);
    for (const s of p.sprites) s.destroy();
    p.sprites.length = 0;
  }

  destroy(): void {
    for (const p of this.parts) this.removePart(p);
  }

  get allRemoved(): boolean {
    return this.parts.every((p) => p.removed);
  }
}
