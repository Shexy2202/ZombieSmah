import Phaser from 'phaser';
import { M } from '../physics/matter';
import { FLICK } from '../config/game';
import { RagdollPart } from '../entities/Ragdoll';
import { Zombie } from '../entities/Zombie';
import { Sample, releaseVelocity } from './flickMath';


interface Grab {
  zombie: Zombie;
  part: RagdollPart;
  constraint: MatterJS.ConstraintType;
  samples: Sample[];
}

export interface FlickHost {
  readonly scene: Phaser.Scene;
  zombies(): readonly Zombie[];
  /** Pointer went down on empty space: start panning. */
  onPanStart(pointer: Phaser.Input.Pointer): void;
  onPanMove(pointer: Phaser.Input.Pointer): void;
  onPanEnd(pointer: Phaser.Input.Pointer): void;
  /** Mutants and other unflickable zombies get a tiny nudge instead. */
  onNudge(z: Zombie, v: { x: number; y: number }): void;
}

/** Touch-first grab/drag/throw of zombies. */
export class FlickInput {
  private grabs = new Map<number, Grab>();
  private nudges = new Map<number, { zombie: Zombie; samples: Sample[] }>();
  private panning = new Set<number>();

  constructor(private host: FlickHost) {
    const input = host.scene.input;
    input.addPointer(2);
    input.on('pointerdown', this.down, this);
    input.on('pointermove', this.move, this);
    input.on('pointerup', this.up, this);
    input.on('pointerupoutside', this.up, this);
  }

  get grabbing(): boolean {
    return this.grabs.size > 0;
  }

  private world(p: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return this.host.scene.cameras.main.getWorldPoint(p.x, p.y);
  }

  private down(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.length > 0) return; // UI handled it
    const w = this.world(p);
    const hit = this.pick(w.x, w.y);
    const now = this.host.scene.time.now;
    if (!hit) {
      this.panning.add(p.id);
      this.host.onPanStart(p);
      return;
    }
    if (!hit.zombie.canGrab()) {
      this.nudges.set(p.id, { zombie: hit.zombie, samples: [{ x: w.x, y: w.y, t: now }] });
      return;
    }
    if (this.grabs.size >= FLICK.maxSimultaneousGrabs) return;
    // Re-grab: drop any other pointer holding the same zombie.
    for (const [id, g] of this.grabs) if (g.zombie === hit.zombie) this.drop(id, false);

    const body = hit.part.body;
    const constraint = M.Constraint.create({
      pointA: { x: w.x, y: w.y },
      bodyB: body,
      pointB: { x: w.x - body.position.x, y: w.y - body.position.y },
      stiffness: FLICK.grabStiffness,
      damping: FLICK.grabDamping,
      length: 0,
    });
    this.host.scene.matter.world.add(constraint);
    hit.zombie.grab();
    this.grabs.set(p.id, { zombie: hit.zombie, part: hit.part, constraint, samples: [{ x: w.x, y: w.y, t: now }] });
  }

  private move(p: Phaser.Input.Pointer): void {
    if (this.panning.has(p.id)) {
      this.host.onPanMove(p);
      return;
    }
    const g = this.grabs.get(p.id) ?? this.nudges.get(p.id);
    if (!g) return;
    const w = this.world(p);
    g.samples.push({ x: w.x, y: w.y, t: this.host.scene.time.now });
    if (g.samples.length > 12) g.samples.shift();
  }

  private up(p: Phaser.Input.Pointer): void {
    if (this.panning.delete(p.id)) {
      this.host.onPanEnd(p);
      return;
    }
    const n = this.nudges.get(p.id);
    if (n) {
      this.nudges.delete(p.id);
      this.host.onNudge(n.zombie, releaseVelocity(n.samples, this.host.scene.time.now, FLICK.sampleWindowMs, FLICK.scale, FLICK.maxSpeed));
      return;
    }
    this.drop(p.id, true);
  }

  private drop(id: number, throwIt: boolean): void {
    const g = this.grabs.get(id);
    if (!g) return;
    this.grabs.delete(id);
    this.host.scene.matter.world.removeConstraint(g.constraint);
    const v = throwIt
      ? releaseVelocity(g.samples, this.host.scene.time.now, FLICK.sampleWindowMs, FLICK.scale, FLICK.maxSpeed)
      : g.part.body.velocity;
    g.zombie.release(v);
  }

  /** Per frame: keep grab anchors under the fingers even while the camera moves. */
  update(): void {
    for (const [id, g] of this.grabs) {
      if (!g.zombie.alive || g.part.removed || !g.part.attached) {
        // Zombie died or the held limb tore off mid-drag: let go.
        this.host.scene.matter.world.removeConstraint(g.constraint);
        this.grabs.delete(id);
        if (g.zombie.alive) g.zombie.release(g.part.body.velocity);
        continue;
      }
      const p = this.host.scene.input.manager.pointers.find((pp) => pp.id === id);
      if (!p) continue;
      const w = this.world(p);
      g.constraint.pointA.x = w.x;
      g.constraint.pointA.y = w.y;
    }
  }

  /** Find the zombie part under (x, y), with a fat-finger slop radius. */
  private pick(x: number, y: number): { zombie: Zombie; part: RagdollPart } | null {
    let best: { zombie: Zombie; part: RagdollPart } | null = null;
    let bestD = Infinity;
    for (const z of this.host.zombies()) {
      if (!z.alive) continue;
      for (const part of z.rag.parts) {
        if (part.removed || !part.attached) continue;
        const b = part.body;
        if (M.Bounds.contains(b.bounds, { x, y }) && M.Vertices.contains(b.vertices!, { x, y })) return { zombie: z, part };
        // Distance from point to body bounds.
        const dx = Math.max(b.bounds.min.x - x, 0, x - b.bounds.max.x);
        const dy = Math.max(b.bounds.min.y - y, 0, y - b.bounds.max.y);
        const d = Math.hypot(dx, dy);
        if (d < FLICK.touchSlop && d < bestD) {
          bestD = d;
          best = { zombie: z, part };
        }
      }
    }
    return best;
  }
}
