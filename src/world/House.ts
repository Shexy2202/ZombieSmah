import Phaser from 'phaser';
import { artImage } from '../assets/art';
import { HOUSE_X } from '../config/game';
import { LAYOUT } from './layout';

/** Farmhouse, windmill and chimney smoke. Depth 8-9 (behind the fence line foreground). */
export class House {
  readonly image: Phaser.GameObjects.Image;
  readonly chimneyTop: Phaser.Math.Vector2;
  private blades: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    artImage(scene, LAYOUT.windmillX, LAYOUT.fenceY + 30, 'windmill_tower').setOrigin(0.5, 1).setDepth(9);
    this.blades = artImage(scene, LAYOUT.windmillX, LAYOUT.fenceY + 30 - 158, 'windmill_blades').setDepth(9);

    this.image = artImage(scene, HOUSE_X, LAYOUT.houseBaseY, 'house').setOrigin(0.5, 1).setDepth(12);
    const w = 230, h = 215;
    this.chimneyTop = new Phaser.Math.Vector2(HOUSE_X + (0.61 - 0.5) * w, LAYOUT.houseBaseY - h + 0.03 * h);

    scene.add.particles(this.chimneyTop.x, this.chimneyTop.y, 'smoke', {
      speedY: { min: -32, max: -22 },
      speedX: { min: 4, max: 16 },
      scale: { start: 0.35, end: 1.5 },
      alpha: { start: 0.55, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 3200,
      frequency: 160,
    }).setDepth(7);
  }

  update(dtMs: number): void {
    this.blades.rotation += dtMs * 0.0006;
  }
}
