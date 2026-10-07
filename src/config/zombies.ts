export type ZombieTypeId = 'walker' | 'jumper' | 'mutant' | 'gunner';

export interface ZombieTypeDef {
  id: ZombieTypeId;
  name: string;
  hp: number;
  /** Overall size multiplier for the ragdoll. */
  scale: number;
  /** Body density multiplier (heavier = harder to fling, hits harder). */
  massMul: number;
  /** Walking speed in px/step. */
  speed: number;
  /** House damage per second while attacking. */
  dps: number;
  flickable: boolean;
  stars: number;
  /** Texture key prefix in the asset manifest: `${art}_head`, `${art}_torso`... */
  art: string;
  showHpBar: boolean;
}

export const ZOMBIES: Record<ZombieTypeId, ZombieTypeDef> = {
  walker: {
    id: 'walker', name: 'Walker', hp: 100, scale: 1, massMul: 1, speed: 0.7, dps: 2,
    flickable: true, stars: 3, art: 'walker', showHpBar: false,
  },
  jumper: {
    id: 'jumper', name: 'Witch', hp: 80, scale: 0.95, massMul: 0.9, speed: 0.9, dps: 2,
    flickable: true, stars: 5, art: 'jumper', showHpBar: false,
  },
  mutant: {
    id: 'mutant', name: 'Super Mutant', hp: 900, scale: 2.4, massMul: 3, speed: 0.45, dps: 8,
    flickable: false, stars: 25, art: 'mutant', showHpBar: true,
  },
  gunner: {
    id: 'gunner', name: 'Zombie Tom', hp: 110, scale: 1, massMul: 1, speed: 0.6, dps: 0,
    flickable: true, stars: 8, art: 'gunner', showHpBar: false,
  },
};
