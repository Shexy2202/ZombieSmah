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
  drawCloud, drawFence, drawHills, drawHouse, drawMoon, drawRoad, drawSky, drawSmokePuff,
  drawSoil, drawStars, drawTree, drawWindmillBlades, drawWindmillTower,
} from './gen/scenery';
import { PartKind, drawBloodDrop, drawBloodSplat, drawZombiePart, zombiePartSize } from './gen/zombie';
import type { Ctx } from './gen/util';
import { VIEW_H, VIEW_W, WORLD_W } from '../config/game';

export type AssetDef =
  | { kind: 'gen'; w: number; h: number; draw: (ctx: Ctx, w: number, h: number) => void; res?: number }
  | { kind: 'image'; url: string; res?: number };

/** Default supersampling for generated textures (crisp on retina phones). */
export const GEN_RES = 2;

export const HILLS_W = Math.ceil(VIEW_W + (WORLD_W - VIEW_W) * 0.4);

const manifest: Record<string, AssetDef> = {
  sky: { kind: 'gen', w: VIEW_W, h: VIEW_H, draw: drawSky, res: 1 },
  stars: { kind: 'gen', w: VIEW_W, h: VIEW_H, draw: drawStars, res: 1 },
  moon: { kind: 'gen', w: 160, h: 160, draw: drawMoon },
  cloud1: { kind: 'gen', w: 200, h: 70, draw: drawCloud(3) },
  cloud2: { kind: 'gen', w: 140, h: 50, draw: drawCloud(9) },
  cloud3: { kind: 'gen', w: 260, h: 80, draw: drawCloud(17) },
  hills: { kind: 'gen', w: HILLS_W, h: 200, draw: drawHills, res: 1 },
  tree1: { kind: 'gen', w: 150, h: 130, draw: drawTree(31) },
  tree2: { kind: 'gen', w: 120, h: 110, draw: drawTree(47) },
  fence: { kind: 'gen', w: WORLD_W + 400, h: 30, draw: drawFence, res: 1 },
  road: { kind: 'gen', w: WORLD_W + 400, h: 40, draw: drawRoad, res: 1 },
  soil: { kind: 'gen', w: WORLD_W + 400, h: 92, draw: drawSoil, res: 1 },
  house: { kind: 'gen', w: 230, h: 215, draw: drawHouse },
  windmill_tower: { kind: 'gen', w: 70, h: 170, draw: drawWindmillTower },
  windmill_blades: { kind: 'gen', w: 84, h: 84, draw: drawWindmillBlades },
  smoke: { kind: 'gen', w: 32, h: 32, draw: drawSmokePuff },
  blood_drop: { kind: 'gen', w: 6, h: 6, draw: drawBloodDrop },
  blood_splat1: { kind: 'gen', w: 40, h: 14, draw: drawBloodSplat(3) },
  blood_splat2: { kind: 'gen', w: 30, h: 10, draw: drawBloodSplat(77) },
  blood_splat3: { kind: 'gen', w: 50, h: 16, draw: drawBloodSplat(1234) },
};

const ZOMBIE_ART: ZombieTypeId[] = ['walker', 'jumper', 'mutant', 'gunner'];
const PARTS: PartKind[] = ['head', 'torso', 'arm', 'leg'];
for (const type of ZOMBIE_ART) {
  for (const part of PARTS) {
    const [w, h] = zombiePartSize(type, part);
    manifest[`${type}_${part}`] = { kind: 'gen', w, h, draw: drawZombiePart(type, part) };
  }
}

export const MANIFEST = manifest;
