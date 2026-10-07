import Phaser from 'phaser';
import { CollisionPair, M } from '../physics/matter';
import { CAT, DAMAGE } from '../config/game';
import { impactDamage } from '../entities/damageMath';
import { ownerOf } from '../entities/Zombie';


type Pair = CollisionPair;

/** Relative normal speed of a collision pair, in px/step. */
function impactSpeed(pair: Pair): number {
  const a = pair.bodyA, b = pair.bodyB;
  const n = pair.collision.normal;
  const rvx = a.velocity.x - b.velocity.x;
  const rvy = a.velocity.y - b.velocity.y;
  return Math.abs(rvx * n.x + rvy * n.y);
}

export interface DamageHost {
  shake(intensity?: number, ms?: number): void;
}

/** Resolves collision impacts into zombie damage and dismemberment. */
export class Damage {
  constructor(scene: Phaser.Scene, private host: DamageHost) {
    scene.matter.world.on('collisionstart', (ev: { pairs: Pair[] }) => {
      for (const pair of ev.pairs) this.handle(pair);
    });
  }

  private handle(pair: Pair): void {
    const a = pair.bodyA, b = pair.bodyB;
    const oa = ownerOf(a), ob = ownerOf(b);
    if (!oa && !ob) return;
    const speed = impactSpeed(pair);

    // Zombie part vs ground: falling / thrown impacts.
    const ground = (a.collisionFilter.category & CAT.GROUND) ? a : (b.collisionFilter.category & CAT.GROUND) ? b : null;
    if (ground) {
      const o = oa ?? ob!;
      const z = o.zombie;
      if (!z.alive || (z.state !== 'AIRBORNE' && z.state !== 'GRABBED')) return;
      const dmg = impactDamage(speed);
      if (dmg <= 0) return;
      const contact = pair.collision.supports?.[0] ?? o.part.body.position;
      z.impact(dmg, contact);
      if (speed > DAMAGE.dismemberImpact) {
        this.host.shake(Math.min(0.012, speed * 0.0004), 90);
        if (Math.random() < DAMAGE.dismemberChance) {
          // Tear the limb that hit, or a random limb if the torso landed.
          const part = o.part.name === 'torso' ? Phaser.Utils.Array.GetRandom(z.rag.parts.filter((p) => p.attached && p.name !== 'torso')) : o.part;
          if (part) z.dismember(part);
        }
      }
      return;
    }

    // Flung zombie vs walking zombie: light bump, no chain reaction.
    if (oa && ob && oa.zombie !== ob.zombie) {
      const flyA = oa.zombie.state === 'AIRBORNE' || oa.zombie.state === 'GRABBED';
      const flyB = ob.zombie.state === 'AIRBORNE' || ob.zombie.state === 'GRABBED';
      if (flyA === flyB || speed < DAMAGE.thrownBumpMinSpeed) return;
      const victim = flyA ? ob : oa;
      const thrown = flyA ? oa : ob;
      victim.zombie.damage(victim.zombie.def.hp * DAMAGE.thrownBumpDamage);
      if (speed > DAMAGE.knockdownImpact && victim.zombie.alive) {
        victim.zombie.knockDown();
        const tv = thrown.part.body.velocity;
        victim.zombie.rag.forEachAttached((p) => M.Body.setVelocity(p.body, { x: p.body.velocity.x + tv.x * 0.25, y: p.body.velocity.y + tv.y * 0.15 - 1 }));
      }
    }
  }
}
