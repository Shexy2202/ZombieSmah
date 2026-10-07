import Phaser from 'phaser';
import { artImage, artWide } from '../assets/art';
import { FX } from '../config/display';
import { VIEW_W, WORLD_W } from '../config/game';
import { LAYOUT } from './layout';

/** Parallax night sky, moon, clouds, hills, trees, with haze between layers. Depths 0-9. */
export class Backdrop {
  private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  constructor(private scene: Phaser.Scene) {
    const s = scene;
    for (const img of artWide(s, 0, 0, 'sky')) img.setScrollFactor(0).setDepth(0);
    const dim = artWide(s, 0, 0, 'stars_dim');
    const bright = artWide(s, 0, 0, 'stars_bright');
    for (const img of dim) img.setScrollFactor(0.02).setDepth(1);
    for (const img of bright) img.setScrollFactor(0.03).setDepth(1);
    // Twinkle: the two star layers breathe out of phase.
    s.tweens.add({ targets: bright, alpha: { from: 1, to: 0.45 }, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    s.tweens.add({ targets: dim, alpha: { from: 0.6, to: 1 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    artImage(s, 330, 125, 'moon').setScrollFactor(0.05).setDepth(2);

    const cloudDefs: [string, number, number][] = [
      ['cloud1', 120, 165], ['cloud2', 520, 95], ['cloud3', 900, 185], ['cloud1', 1300, 120], ['cloud2', 1650, 210],
    ];
    for (const [key, x, y] of cloudDefs) {
      const img = artImage(s, x, y, key).setScrollFactor(0.2).setDepth(3).setAlpha(0.92);
      this.clouds.push({ img, speed: 3 + Math.random() * 4 });
    }

    for (const img of artWide(s, 0, LAYOUT.fenceY + 14, 'hills', 1)) img.setScrollFactor(0.4).setDepth(4);
    this.haze(LAYOUT.fenceY - 60, 4.5, 0.8);

    const treeSpan = VIEW_W + (WORLD_W - VIEW_W) * 0.6;
    const trees: [string, number, number][] = [['tree1', 0.05, 1], ['tree2', 0.19, 0.9], ['tree1', 0.45, 1.1], ['tree2', 0.57, 1], ['tree1', 0.78, 0.95], ['tree2', 0.93, 1.05]];
    for (const [key, f, sc] of trees) {
      const t = artImage(s, f * treeSpan, LAYOUT.fenceY + 10, key).setOrigin(0.5, 1).setScrollFactor(0.6).setDepth(5);
      t.setScale(t.scaleX * sc);
      if (FX.treeSway) {
        s.tweens.add({
          targets: t, angle: { from: -0.8, to: 0.8 }, duration: Phaser.Math.Between(2600, 3600),
          yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Phaser.Math.Between(0, 2000),
        });
      }
    }
    this.haze(LAYOUT.fenceY - 40, 6, 0.55);
  }

  /** Horizontal band of haze for aerial perspective, spanning the visible layer. */
  private haze(y: number, depth: number, alpha: number): void {
    const img = artImage(this.scene, 0, y, 'haze').setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
    img.displayWidth = VIEW_W;
  }

  update(dtMs: number): void {
    const cam = this.scene.cameras.main;
    const span = VIEW_W + (WORLD_W - VIEW_W) * 0.2 + 300;
    for (const c of this.clouds) {
      c.img.x += (c.speed * dtMs) / 1000;
      if (c.img.x - cam.scrollX * 0.2 > span) c.img.x -= span + 300;
    }
  }
}
