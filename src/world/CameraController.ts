import Phaser from 'phaser';
import { CAMERA, HOUSE_X, VIEW_W, WORLD_W } from '../config/game';
import { Zombie } from '../entities/Zombie';

/** Auto-pans toward the most threatened side of the house; drag to pan manually. */
export class CameraController {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private lastManual = -1e9;
  private panStart: { px: number; scroll: number } | null = null;
  private moving = false;
  /** While true (e.g. holding a zombie) auto-pan is paused. */
  hold = false;

  constructor(private scene: Phaser.Scene) {
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, WORLD_W, scene.scale.height);
    this.cam.scrollX = HOUSE_X - VIEW_W / 2;
  }

  panStartAt(screenX: number): void {
    this.panStart = { px: screenX, scroll: this.cam.scrollX };
    this.lastManual = this.scene.time.now;
  }

  panMoveTo(screenX: number): void {
    if (!this.panStart) return;
    this.cam.scrollX = this.panStart.scroll - (screenX - this.panStart.px);
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
    const gap = target - this.cam.scrollX;
    if (!this.moving && Math.abs(gap) < CAMERA.deadZone) return;
    this.moving = Math.abs(gap) > 2;
    this.cam.scrollX += gap * Math.min(1, CAMERA.autoPanRate * (dtMs / 1000));
  }
}
