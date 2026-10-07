import Phaser from 'phaser';
import { artImage } from '../assets/art';
import { VIEW_W, WORLD_W } from '../config/game';
import { LAYOUT } from './layout';

/** Parallax night sky, moon, clouds, hills, trees. Depths 0-9. */
export class Backdrop {
  private clouds: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  constructor(private scene: Phaser.Scene) {
    const s = scene;
    s.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(0);
    s.add.image(0, 0, 'stars').setOrigin(0).setScrollFactor(0).setDepth(1);
    artImage(s, 330, 125, 'moon').setScrollFactor(0.05).setDepth(2);

    const cloudDefs: [string, number, number][] = [
      ['cloud1', 120, 150], ['cloud2', 520, 95], ['cloud3', 900, 175], ['cloud1', 1300, 120], ['cloud2', 1650, 200],
    ];
    for (const [key, x, y] of cloudDefs) {
      const img = artImage(s, x, y, key).setScrollFactor(0.2).setDepth(3).setAlpha(0.85);
      this.clouds.push({ img, speed: 3 + Math.random() * 4 });
    }

    s.add.image(0, LAYOUT.fenceY + 12, 'hills').setOrigin(0, 1).setScrollFactor(0.4).setDepth(4);

    const treeSpan = VIEW_W + (WORLD_W - VIEW_W) * 0.6;
    const trees: [string, number][] = [['tree1', 0.06], ['tree2', 0.2], ['tree1', 0.46], ['tree2', 0.58], ['tree1', 0.78], ['tree2', 0.93]];
    for (const [key, f] of trees) {
      artImage(s, f * treeSpan, LAYOUT.fenceY + 8, key).setOrigin(0.5, 1).setScrollFactor(0.6).setDepth(5);
    }
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
