import Phaser from 'phaser';
import { texRes } from '../assets/art';
import { MAX_TEX, RENDER_SCALE } from '../config/display';
import { GROUND_Y, WORLD_W } from '../config/game';

const TOP = GROUND_Y - 48;
const HEIGHT = 64;
const MARGIN = 400;

/**
 * Persistent ground decals (blood, scorch) baked into render textures at full
 * screen resolution. Split into GPU-safe chunks; stamps near a seam go into both.
 */
export class DecalLayer {
  private chunks: { x: number; rt: Phaser.GameObjects.RenderTexture }[] = [];
  private chunkW: number;

  constructor(private scene: Phaser.Scene) {
    const R = RENDER_SCALE;
    this.chunkW = Math.floor(MAX_TEX / R);
    for (let x = -MARGIN; x < WORLD_W + MARGIN; x += this.chunkW) {
      const rt = scene.add.renderTexture(x, TOP, this.chunkW * R, HEIGHT * R).setOrigin(0).setScale(1 / R).setDepth(11.5);
      this.chunks.push({ x, rt });
    }
  }

  /** Stamp a texture centred at world (x, y). y is clamped onto the walk strip. */
  stamp(key: string, x: number, y: number, opts: { angle?: number; scale?: number; alpha?: number; scaleY?: number } = {}): void {
    const R = RENDER_SCALE;
    const res = texRes(this.scene, key);
    const ly = Phaser.Math.Clamp(y, GROUND_Y - 34, GROUND_Y + 2) - TOP;
    const frame = this.scene.textures.getFrame(key);
    const s = ((opts.scale ?? 1) * R) / res;
    const halfW = (frame.width * s) / R / 2 + 2;
    for (const c of this.chunks) {
      if (x + halfW < c.x || x - halfW > c.x + this.chunkW) continue;
      c.rt.stamp(key, undefined, (x - c.x) * R, ly * R, {
        angle: opts.angle ?? 0,
        scaleX: s,
        scaleY: s * (opts.scaleY ?? 1),
        alpha: opts.alpha ?? 1,
        originX: 0.5,
        originY: 0.5,
      });
    }
  }

  /** Pool of blood flattened by perspective onto the walk strip. */
  bloodSplat(x: number, size = 1): void {
    const key = Phaser.Utils.Array.GetRandom(['blood_splat1', 'blood_splat2', 'blood_splat3']);
    this.stamp(key, x + Phaser.Math.Between(-6, 6), GROUND_Y - 6 + Phaser.Math.Between(-12, 4), {
      scale: size * Phaser.Math.FloatBetween(0.8, 1.25),
      alpha: Phaser.Math.FloatBetween(0.65, 0.85),
    });
  }

  /** A single drop stain. */
  droplet(x: number, y: number): void {
    this.stamp('blood_splat2', x, y, { scale: Phaser.Math.FloatBetween(0.12, 0.3), alpha: 0.9, angle: Phaser.Math.Between(-10, 10) });
  }

  clear(): void {
    for (const c of this.chunks) c.rt.clear();
  }
}
