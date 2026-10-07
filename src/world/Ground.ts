import Phaser from 'phaser';
import { artImage, artWide } from '../assets/art';
import { FX } from '../config/display';
import { CAT, GROUND_Y, MASK, WORLD_W } from '../config/game';
import { LAYOUT } from './layout';

/** Fence, road strip, soil band, drifting ground fog and the static ground body. */
export class Ground {
  readonly body: MatterJS.BodyType;
  private fog: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    for (const img of artWide(scene, -200, LAYOUT.fenceY, 'fence')) img.setDepth(10);
    for (const img of artWide(scene, -200, LAYOUT.roadTop, 'road')) img.setDepth(11);
    for (const img of artWide(scene, -200, LAYOUT.soilTop, 'soil')) img.setDepth(30);

    if (FX.fog) {
      for (let x = -300; x < WORLD_W + 300; x += 420) {
        const f = artImage(scene, x, LAYOUT.roadTop - 6, 'fog').setOrigin(0, 0.5).setDepth(11.8).setAlpha(0.85);
        this.fog.push(f);
      }
    }

    const thickness = 200;
    this.body = scene.matter.add.rectangle(WORLD_W / 2, GROUND_Y + thickness / 2, WORLD_W + 4000, thickness, {
      isStatic: true,
      friction: 0.9,
      label: 'ground',
      collisionFilter: { category: CAT.GROUND, mask: MASK.GROUND, group: 0 },
    });
  }

  update(dtMs: number): void {
    for (const f of this.fog) {
      f.x += dtMs * 0.008;
      if (f.x > WORLD_W + 300) f.x -= this.fog.length * 420;
    }
  }
}
