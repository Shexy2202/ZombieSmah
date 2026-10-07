import Phaser from 'phaser';
import { texRes } from '../assets/art';
import { GROUND_Y, WORLD_W } from '../config/game';

const TOP = GROUND_Y - 48;
const HEIGHT = 70;

/** Persistent ground decals (blood, scorch) baked into one RenderTexture. */
export class DecalLayer {
  private rt: Phaser.GameObjects.RenderTexture;

  constructor(private scene: Phaser.Scene) {
    this.rt = scene.add.renderTexture(0, TOP, WORLD_W, HEIGHT).setOrigin(0).setDepth(11.5);
  }

  /** Stamp a texture centred at world (x, y). y is clamped onto the walk strip. */
  stamp(key: string, x: number, y: number, opts: { angle?: number; scale?: number; alpha?: number; tint?: number } = {}): void {
    const res = texRes(this.scene, key);
    const ly = Phaser.Math.Clamp(y, GROUND_Y - 30, GROUND_Y + 4) - TOP;
    this.rt.stamp(key, undefined, x, ly, {
      angle: opts.angle ?? 0,
      scale: (opts.scale ?? 1) / res,
      alpha: opts.alpha ?? 1,
      tint: opts.tint ?? 0xffffff,
      originX: 0.5,
      originY: 0.5,
    });
  }

  bloodSplat(x: number, size = 1): void {
    const key = Phaser.Utils.Array.GetRandom(['blood_splat1', 'blood_splat2', 'blood_splat3']);
    this.stamp(key, x + Phaser.Math.Between(-6, 6), GROUND_Y - 4 + Phaser.Math.Between(-10, 3), {
      scale: size * Phaser.Math.FloatBetween(0.7, 1.3),
      alpha: Phaser.Math.FloatBetween(0.75, 1),
    });
  }

  clear(): void {
    this.rt.clear();
  }
}
