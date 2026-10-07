// Global tunables. Physics velocities are in px per fixed 60Hz step (Matter units).

export const VIEW_W = 960;
export const VIEW_H = 640;
export const WORLD_W = 2400;
export const HOUSE_X = WORLD_W / 2;

/** y of the walkable surface (feet rest here). */
export const GROUND_Y = 548;

export const PHYSICS = {
  gravityY: 2.0,
  positionIterations: 8,
  velocityIterations: 6,
  /** Hard clamp on any zombie part speed; prevents tunnelling. */
  maxPartSpeed: 40,
};

export const FLICK = {
  /** Window of pointer history used to compute release velocity. */
  sampleWindowMs: 80,
  /** Multiplier from finger speed (px/step) to throw speed. */
  scale: 1.0,
  maxSpeed: 38,
  /** Spring from finger to grabbed part. */
  grabStiffness: 0.2,
  grabDamping: 0.1,
  /** Extra hit radius around zombie parts for fat fingers (design px). */
  touchSlop: 24,
  maxSimultaneousGrabs: 2,
};

export const DAMAGE = {
  /** Ground impacts below this speed do nothing. */
  safeImpact: 5,
  /** HP lost per px/step of impact above safeImpact. ~14 px/step kills a walker. */
  impactDamagePerSpeed: 11,
  /** Part impact speed above which a joint may tear. */
  dismemberImpact: 15,
  dismemberChance: 0.55,
  /** A flung zombie hitting another deals this fraction of the victim's max HP. */
  thrownBumpDamage: 0.08,
  /** Minimum relative speed for a thrown-zombie bump to count. */
  thrownBumpMinSpeed: 4,
  /** Impact on a walking zombie needed to knock it into ragdoll. */
  knockdownImpact: 6,
};

export const ZOMBIE_AI = {
  /** Distance from house centre where zombies stop and attack. */
  attackRange: 100,
  /** Settled-on-ground check before getting back up. */
  settleSpeed: 1.0,
  settleTimeMs: 400,
  recoverTimeMs: 600,
};

export const PERF = {
  maxRagdolls: 25,
  maxLooseParts: 60,
  corpseLifetimeMs: 9000,
  partLifetimeMs: 12000,
  fadeMs: 1000,
  maxDecals: 400,
};

export const CAMERA = {
  autoPanRate: 1.5, // fraction of the gap closed per second
  deadZone: 40,
  manualOverrideMs: 2500,
};

/** Matter collision categories. */
export const CAT = {
  GROUND: 0x0001,
  ZOMBIE_WALK: 0x0002,
  ZOMBIE_FLY: 0x0004,
  PART: 0x0008,
  WEAPON: 0x0010,
  PROJECTILE: 0x0020,
  SENSOR: 0x0040,
  HOUSE: 0x0080,
} as const;

export const MASK = {
  GROUND: 0xffff,
  // Puppeted walkers don't touch the ground (the controller holds them up) or each other.
  ZOMBIE_WALK: CAT.WEAPON | CAT.ZOMBIE_FLY | CAT.PROJECTILE | CAT.SENSOR | CAT.HOUSE,
  // Ragdolled but alive (grabbed, airborne, knocked down, getting up).
  ZOMBIE_FLY: CAT.GROUND | CAT.ZOMBIE_WALK | CAT.ZOMBIE_FLY | CAT.WEAPON | CAT.SENSOR,
  PART: CAT.GROUND | CAT.WEAPON | CAT.PART,
  WEAPON: CAT.GROUND | CAT.ZOMBIE_WALK | CAT.ZOMBIE_FLY | CAT.PART,
  SENSOR: CAT.ZOMBIE_WALK | CAT.ZOMBIE_FLY,
};
