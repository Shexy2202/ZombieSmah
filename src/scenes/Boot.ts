import Phaser from 'phaser';
import { GEN_RES, MANIFEST } from '../assets/manifest';

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
        const tex = this.textures.createCanvas(key, Math.ceil(def.w * res), Math.ceil(def.h * res));
        if (!tex) continue;
        const ctx = tex.getContext();
        ctx.save();
        ctx.scale(res, res);
        def.draw(ctx, def.w, def.h);
        ctx.restore();
        tex.refresh();
        tex.customData = { res };
      } else {
        this.textures.get(key).customData = { res: def.res ?? 1 };
      }
    }
    this.scene.start('Game');
  }
}
