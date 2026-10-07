import Phaser from 'phaser';
import { artImage, texRes } from '../assets/art';
import { HOUSE_X } from '../config/game';
import { LAYOUT } from './layout';

const HOUSE_W = 230, HOUSE_H = 215;

/** Farmhouse with flickering window light, windmill and chimney smoke. */
export class House {
  readonly image: Phaser.GameObjects.Image;
  readonly chimneyTop: Phaser.Math.Vector2;
  private blades: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    artImage(scene, LAYOUT.windmillX, LAYOUT.fenceY + 30, 'windmill_tower').setOrigin(0.5, 1).setDepth(9);
    this.blades = artImage(scene, LAYOUT.windmillX, LAYOUT.fenceY + 30 - 158, 'windmill_blades').setDepth(9);

    this.image = artImage(scene, HOUSE_X, LAYOUT.houseBaseY, 'house').setOrigin(0.5, 1).setDepth(12);
    this.chimneyTop = new Phaser.Math.Vector2(HOUSE_X + (0.61 - 0.5) * HOUSE_W, LAYOUT.houseBaseY - HOUSE_H + 0.03 * HOUSE_H);

    // Warm lamplight spilling from the windows onto the road in front.
    const spill = artImage(scene, HOUSE_X, LAYOUT.houseBaseY + 2, 'glow_warm').setDepth(11.7).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35);
    spill.setScale(spill.scaleX * 1.8, spill.scaleY * 0.6);
    const winY = LAYOUT.houseBaseY - HOUSE_H + HOUSE_H * 0.47 + 20;
    const windows = [0.3, 0.7].map((fx) => {
      const g = artImage(scene, HOUSE_X + (fx - 0.5) * HOUSE_W, winY, 'glow_warm').setDepth(12.1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
      return g.setScale(g.scaleX * 0.35, g.scaleY * 0.9);
    });
    // Lamp flicker.
    scene.tweens.add({
      targets: [...windows, spill],
      alpha: '-=0.08',
      duration: 120,
      yoyo: true,
      repeat: -1,
      repeatDelay: 900,
      ease: 'Stepped',
      onRepeat: (tw) => { tw.timeScale = Phaser.Math.FloatBetween(0.6, 2.2); },
    });

    const res = 1 / texRes(scene, 'smoke');
    scene.add.particles(this.chimneyTop.x, this.chimneyTop.y + 2, 'smoke', {
      speedY: { min: -28, max: -18 },
      speedX: { min: 6, max: 18 },
      accelerationX: 4,
      scale: { start: res * 0.35, end: res * 1.9 },
      alpha: { start: 0.5, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 4200,
      frequency: 140,
    }).setDepth(7);
  }

  update(dtMs: number): void {
    this.blades.rotation += dtMs * 0.0006;
  }
}
