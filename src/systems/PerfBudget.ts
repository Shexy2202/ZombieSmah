import Phaser from 'phaser';
import { PERF } from '../config/game';
import { RagdollPart } from '../entities/Ragdoll';
import { Zombie } from '../entities/Zombie';

/**
 * Keeps ragdoll and loose-limb counts bounded: corpses and torn limbs fade
 * out after their lifetime, or early (oldest first) when over the caps.
 */
export class PerfBudget {
  private fading = new Set<RagdollPart>();

  constructor(private scene: Phaser.Scene) {}

  update(zombies: Zombie[]): Zombie[] {
    const now = this.scene.time.now;
    const corpses = zombies.filter((z) => !z.alive).sort((a, b) => a.diedAt - b.diedAt);
    const loose: RagdollPart[] = [];
    for (const z of zombies) for (const p of z.rag.parts) if (!p.attached && !p.removed && p.name !== 'torso') loose.push(p);
    loose.sort((a, b) => a.detachedAt - b.detachedAt);

    let excessCorpses = corpses.length - PERF.maxRagdolls;
    for (const z of corpses) {
      if (excessCorpses-- > 0 || now - z.diedAt > PERF.corpseLifetimeMs) {
        for (const p of z.rag.parts) if (p.attached) this.fade(z, p);
      }
    }
    let excessParts = loose.length - PERF.maxLooseParts;
    for (const p of loose) {
      if (excessParts-- > 0 || now - p.detachedAt > PERF.partLifetimeMs) {
        const z = zombies.find((zz) => zz.rag.parts.includes(p));
        if (z) this.fade(z, p);
      }
    }

    // Drop zombies whose every part is gone.
    return zombies.filter((z) => {
      if (z.rag.allRemoved) {
        z.destroy();
        return false;
      }
      return true;
    });
  }

  private fade(z: Zombie, p: RagdollPart): void {
    if (this.fading.has(p) || p.removed) return;
    this.fading.add(p);
    this.scene.tweens.add({
      targets: p.sprite,
      alpha: 0,
      duration: PERF.fadeMs,
      onComplete: () => {
        this.fading.delete(p);
        z.rag.removePart(p);
      },
    });
  }
}
