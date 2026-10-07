/**
 * Asset manifest. Every texture the game uses is listed here by key.
 *
 * To swap placeholder art for real sprites, replace an entry with
 *   { kind: 'image', url: 'assets/whatever.png', res: 2 }
 * where `res` is how many texture pixels map to one design pixel.
 * Entities only reference keys, so nothing else needs to change.
 */
import { ZombieTypeId } from '../config/zombies';
import {
  drawCloud, drawFence, drawFog, drawGlow, drawHaze, drawHills, drawHouse, drawMoon, drawRoad, drawSky,
  drawSmokePuff, drawSoil, drawStars, drawTree, drawWindmillBlades, drawWindmillTower,
} from './gen/scenery';
import {
  SEG_KINDS, drawBloodDrop, drawBloodSplat, drawShadow, drawStump, drawZombieSeg, segLayout,
} from './gen/zombie';
import type { Ctx } from './gen/util';
import { VIEW_H, VIEW_W, WORLD_W } from '../config/game';
import { RENDER_SCALE } from '../config/display';

export type AssetDef =
  | { kind: 'gen'; w: number; h: number; draw: (ctx: Ctx, w: number, h: number) => void; res?: number }
  | { kind: 'image'; url: string; res?: number };

/** Generated textures are drawn at screen resolution (one texel per physical pixel). */
export const GEN_RES = RENDER_SCALE;

export const HILLS_W = Math.ceil(VIEW_W + (WORLD_W - VIEW_W) * 0.4);
export const STRIP_W = WORLD_W + 400;

const manifest: Record<string, AssetDef> = {
  sky: { kind: 'gen', w: VIEW_W, h: VIEW_H, draw: drawSky },
  stars_dim: { kind: 'gen', w: VIEW_W, h: VIEW_H * 0.65, draw: drawStars(false) },
  stars_bright: { kind: 'gen', w: VIEW_W, h: VIEW_H * 0.65, draw: drawStars(true) },
  moon: { kind: 'gen', w: 200, h: 200, draw: drawMoon },
  cloud1: { kind: 'gen', w: 220, h: 80, draw: drawCloud(3) },
  cloud2: { kind: 'gen', w: 150, h: 56, draw: drawCloud(9) },
  cloud3: { kind: 'gen', w: 280, h: 90, draw: drawCloud(17) },
  hills: { kind: 'gen', w: HILLS_W, h: 210, draw: drawHills },
  haze: { kind: 'gen', w: 64, h: 90, draw: drawHaze },
  fog: { kind: 'gen', w: 640, h: 50, draw: drawFog },
  tree1: { kind: 'gen', w: 160, h: 150, draw: drawTree(31) },
  tree2: { kind: 'gen', w: 130, h: 125, draw: drawTree(47) },
  fence: { kind: 'gen', w: STRIP_W, h: 32, draw: drawFence },
  road: { kind: 'gen', w: STRIP_W, h: 40, draw: drawRoad },
  soil: { kind: 'gen', w: STRIP_W, h: 92, draw: drawSoil },
  house: { kind: 'gen', w: 230, h: 215, draw: drawHouse },
  windmill_tower: { kind: 'gen', w: 70, h: 170, draw: drawWindmillTower },
  windmill_blades: { kind: 'gen', w: 88, h: 88, draw: drawWindmillBlades },
  smoke: { kind: 'gen', w: 40, h: 40, draw: drawSmokePuff },
  glow_warm: { kind: 'gen', w: 160, h: 60, draw: drawGlow('255,190,100') },
  shadow: { kind: 'gen', w: 44, h: 10, draw: drawShadow },
  stump: { kind: 'gen', w: 9, h: 7, draw: drawStump },
  blood_drop: { kind: 'gen', w: 9, h: 5, draw: drawBloodDrop },
  blood_splat1: { kind: 'gen', w: 46, h: 13, draw: drawBloodSplat(3) },
  blood_splat2: { kind: 'gen', w: 32, h: 10, draw: drawBloodSplat(77) },
  blood_splat3: { kind: 'gen', w: 58, h: 15, draw: drawBloodSplat(1234) },
};

const ZOMBIE_ART: ZombieTypeId[] = ['walker', 'jumper', 'mutant', 'gunner'];
for (const type of ZOMBIE_ART) {
  for (const kind of SEG_KINDS) {
    const L = segLayout(type, kind);
    manifest[`${type}_${kind}`] = { kind: 'gen', w: L.w, h: L.h, draw: drawZombieSeg(type, kind, false) };
    manifest[`${type}_${kind}_ol`] = { kind: 'gen', w: L.w, h: L.h, draw: drawZombieSeg(type, kind, true) };
  }
}

export const MANIFEST = manifest;
