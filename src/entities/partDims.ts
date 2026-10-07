import { ZOMBIES, ZombieTypeId } from '../config/zombies';

export interface PartDims {
  headR: number;
  torsoW: number;
  torsoH: number;
  armW: number;
  armH: number;
  legW: number;
  legH: number;
}

const BASE: PartDims = { headR: 11, torsoW: 18, torsoH: 26, armW: 7, armH: 22, legW: 8, legH: 26 };

/** Per-type proportion tweaks on top of the uniform type scale. */
const SHAPE: Partial<Record<ZombieTypeId, Partial<PartDims>>> = {
  mutant: { torsoW: 26, armW: 9, legW: 10, headR: 9 },
  jumper: { torsoW: 16, legW: 7 },
};

export function partDims(type: ZombieTypeId): PartDims {
  const s = ZOMBIES[type].scale;
  const d = { ...BASE, ...SHAPE[type] };
  return {
    headR: d.headR * s,
    torsoW: d.torsoW * s,
    torsoH: d.torsoH * s,
    armW: d.armW * s,
    armH: d.armH * s,
    legW: d.legW * s,
    legH: d.legH * s,
  };
}
