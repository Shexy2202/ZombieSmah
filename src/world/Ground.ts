import Phaser from 'phaser';
import { CAT, GROUND_Y, MASK, WORLD_W } from '../config/game';
import { LAYOUT } from './layout';

/** Fence, road strip, soil band and the static ground body. Depths 10-12. */
export class Ground {
  readonly body: MatterJS.BodyType;

  constructor(scene: Phaser.Scene) {
    scene.add.image(-200, LAYOUT.fenceY, 'fence').setOrigin(0).setDepth(10);
    scene.add.image(-200, LAYOUT.roadTop, 'road').setOrigin(0).setDepth(11);
    scene.add.image(-200, LAYOUT.soilTop, 'soil').setOrigin(0).setDepth(30);

    const thickness = 200;
    this.body = scene.matter.add.rectangle(WORLD_W / 2, GROUND_Y + thickness / 2, WORLD_W + 4000, thickness, {
      isStatic: true,
      friction: 0.9,
      label: 'ground',
      collisionFilter: { category: CAT.GROUND, mask: MASK.GROUND, group: 0 },
    });
  }
}
