import Phaser from 'phaser';
import { GEN_RES, MANIFEST } from '../assets/manifest';
import { MAX_TEX } from '../config/display';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [key, def] of Object.entries(MANIFEST)) {
      if (def.kind === 'image') this.load.image(key, def.url);
    }
  }

  create(): void {
    for (const [key, def] of Object.entries(MANIFEST)) {
      if (def.kind === 'gen') {
        const res = def.res ?? GEN_RES;
        const pw = Math.ceil(def.w * res), ph = Math.ceil(def.h * res);
        const src = document.createElement('canvas');
        src.width = pw;
        src.height = ph;
        const ctx = src.getContext('2d')!;
        ctx.scale(res, res);
        def.draw(ctx, def.w, def.h);
        if (pw <= MAX_TEX) {
          const tex = this.textures.addCanvas(key, src)!;
          tex.customData = { res };
        } else {
          // Slice into GPU-safe strips; see artWide().
          const n = Math.ceil(pw / MAX_TEX);
          const sw = Math.ceil(pw / n);
          for (let i = 0; i < n; i++) {
            const w = Math.min(sw, pw - i * sw);
            const slice = document.createElement('canvas');
            slice.width = w;
            slice.height = ph;
            slice.getContext('2d')!.drawImage(src, -i * sw, 0);
            const tex = this.textures.addCanvas(`${key}#${i}`, slice)!;
            tex.customData = { res };
          }
        }
      } else {
        this.textures.get(key).customData = { res: def.res ?? 1 };
      }
    }
    this.scene.start('Game');
  }
}
