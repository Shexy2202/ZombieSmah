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

const BASE: PartDims = { headR: 10.5, torsoW: 17, torsoH: 28, armW: 6.5, armH: 28, legW: 7.5, legH: 32 };

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

/** Distance from a limb's joint pivot to its far end (physics capsule). */
export function limbReach(len: number, width: number): number {
  return len - width / 2;
}

/** Visual segment lengths for a two-bone limb drawn over one physics body. */
export function segmentLengths(len: number, width: number): { upper: number; lower: number } {
  const reach = limbReach(len, width);
  return { upper: reach * 0.5, lower: reach * 0.5 };
}

/** Outline thickness (design px) for a zombie type: bold cartoon line, thicker on big types. */
export function outlineWidth(type: ZombieTypeId): number {
  return 1.6 * Math.sqrt(ZOMBIES[type].scale);
}
