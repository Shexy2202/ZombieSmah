import Phaser from 'phaser';
import { FX, RENDER_SCALE } from '../config/display';
import { CAMERA, HOUSE_X, VIEW_W, WORLD_W } from '../config/game';
import { Zombie } from '../entities/Zombie';

const MIN_SCROLL = 0;
const MAX_SCROLL = WORLD_W - VIEW_W;

/**
 * Owns the main camera: renders at device resolution (zoom = RENDER_SCALE with a
 * top-left origin, so scroll/UI maths stay in 960x640 design pixels), auto-pans
 * toward the most threatened side with critically-damped spring smoothing, and
 * hands control to the player's finger when they drag.
 */
export class CameraController {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private lastManual = -1e9;
  private panStart: { px: number; scroll: number } | null = null;
  private vel = 0;
  /** While true (e.g. holding a zombie) auto-pan is paused. */
  hold = false;

  constructor(private scene: Phaser.Scene) {
    this.cam = scene.cameras.main;
    this.cam.setOrigin(0, 0).setZoom(RENDER_SCALE);
    this.cam.scrollX = HOUSE_X - VIEW_W / 2;
    this.cam.scrollY = 0;
    if (FX.vignette && this.cam.postFX) this.cam.postFX.addVignette(0.5, 0.5, 0.92, 0.32);
  }

  private set scroll(x: number) {
    this.cam.scrollX = Phaser.Math.Clamp(x, MIN_SCROLL, MAX_SCROLL);
  }

  panStartAt(canvasX: number): void {
    this.panStart = { px: canvasX / RENDER_SCALE, scroll: this.cam.scrollX };
    this.vel = 0;
    this.lastManual = this.scene.time.now;
  }

  panMoveTo(canvasX: number): void {
    if (!this.panStart) return;
    this.scroll = this.panStart.scroll - (canvasX / RENDER_SCALE - this.panStart.px);
    this.lastManual = this.scene.time.now;
  }

  panEnd(): void {
    this.panStart = null;
    this.lastManual = this.scene.time.now;
  }

  update(dtMs: number, zombies: readonly Zombie[]): void {
    if (this.panStart || this.hold) return;
    if (this.scene.time.now - this.lastManual < CAMERA.manualOverrideMs) return;

    let left = 0, right = 0;
    let nearestL = -Infinity, nearestR = Infinity;
    for (const z of zombies) {
      if (!z.alive) continue;
      const d = z.x - HOUSE_X;
      const w = 1 / Math.max(Math.abs(d), 100);
      if (d < 0) {
        left += w;
        nearestL = Math.max(nearestL, z.x);
      } else {
        right += w;
        nearestR = Math.min(nearestR, z.x);
      }
    }
    let target = HOUSE_X - VIEW_W / 2;
    if (left > 0 || right > 0) {
      const focus = left >= right ? nearestL : nearestR;
      const mid = (focus + HOUSE_X) / 2;
      // Keep the house on screen while leaning toward the threat.
      target = Phaser.Math.Clamp(mid - VIEW_W / 2, HOUSE_X - VIEW_W + 130, HOUSE_X - 130);
    }
    const x = this.cam.scrollX;
    const gap = target - x;
    if (Math.abs(gap) < CAMERA.deadZone && Math.abs(this.vel) < 5) {
      this.vel *= 0.8;
      return;
    }
    // Critically damped spring: eases in and out, never overshoots.
    const dt = Math.min(dtMs, 50) / 1000;
    const w = CAMERA.autoPanRate * 2.2;
    this.vel += (gap * w * w - 2 * w * this.vel) * dt;
    this.scroll = x + this.vel * dt;
  }
}
