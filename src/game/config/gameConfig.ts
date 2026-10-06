/** All tunable gameplay values. Distances are in world pixels (1280x720 logical canvas), time in seconds. */
export const GAME_CONFIG = {
  width: 1280,
  height: 720,
  groundY: 600,
  playerX: 230,
  fontFamily: '"Lilita One", "Fredoka", sans-serif',
} as const;

export const PHYSICS_CONFIG = {
  gravity: 3600,
  jumpVelocity: 1150,
  /** Player hit box in world px, centred horizontally on the sprite and sitting on its feet. */
  playerHitbox: { width: 38, height: 78 },
} as const;

export const difficultyConfig = {
  startingSpeed: 400,
  maximumSpeed: 1060,
  /** px/s gained per second of play. */
  speedIncreaseRate: 11,
  /** Seconds of travel between obstacle clusters (edge to edge) at the start / at max speed. */
  startingSpawnInterval: 2.6,
  minimumSpawnInterval: 1.15,
  /** Hard floor on the gap so a human can land, crouch and jump again. */
  minReactionGapStart: 0.95,
  minReactionGapEnd: 0.75,
  /** Seconds of empty track before the first obstacle. */
  firstObstacleDelay: 2.2,
} as const;

export const SCORE_CONFIG = {
  pointsPerPixel: 0.033,
  coinValue: 50,
} as const;

export type ObstacleKind = 'rock' | 'cactus' | 'spikes' | 'slime' | 'fly';

export interface ObstacleSpec {
  /** Texture key of the first frame; animated kinds also list `frames`. */
  texture: string;
  frames?: string[];
  scale: number;
  /** Height of the visible sprite bottom above the ground. */
  lift: number;
  /** Hitbox shrink (px) applied on each side of the visible bounds. */
  inset: number;
  /** Vertical bob amplitude (px) for flying obstacles. */
  bob?: number;
}

export const OBSTACLE_SPECS: Record<ObstacleKind, ObstacleSpec> = {
  rock: { texture: 'rock', scale: 1.15, lift: 0, inset: 6 },
  cactus: { texture: 'cactus', scale: 1.3, lift: 0, inset: 8 },
  spikes: { texture: 'spikes', scale: 1.1, lift: 0, inset: 7 },
  slime: { texture: 'slimeWalk1', frames: ['slimeWalk1', 'slimeWalk2'], scale: 1.5, lift: 0, inset: 6 },
  fly: { texture: 'flyFly1', frames: ['flyFly1', 'flyFly2'], scale: 1.2, lift: 40, inset: 8, bob: 10 },
};

export interface PatternItem {
  kind: ObstacleKind;
  /** Edge-to-edge distance from the previous item in the pattern, in px. Ignored for the first item. */
  gap?: number;
}

export interface PatternDef {
  id: string;
  weight: number;
  /** Difficulty level (0..1) at which the pattern becomes available. */
  minLevel: number;
  items: PatternItem[];
}

/** Patterns are validated against the current speed before use, so impossible clusters never spawn. */
export const PATTERNS: PatternDef[] = [
  { id: 'rock', weight: 4, minLevel: 0, items: [{ kind: 'rock' }] },
  { id: 'cactus', weight: 4, minLevel: 0, items: [{ kind: 'cactus' }] },
  { id: 'slime', weight: 3, minLevel: 0.04, items: [{ kind: 'slime' }] },
  { id: 'spikes', weight: 3, minLevel: 0.08, items: [{ kind: 'spikes' }] },
  { id: 'fly', weight: 3, minLevel: 0.12, items: [{ kind: 'fly' }] },
  { id: 'rock-rock', weight: 3, minLevel: 0.25, items: [{ kind: 'rock' }, { kind: 'rock', gap: 50 }] },
  { id: 'cactus-slime', weight: 2, minLevel: 0.35, items: [{ kind: 'cactus' }, { kind: 'slime', gap: 45 }] },
  { id: 'slime-fly', weight: 2, minLevel: 0.45, items: [{ kind: 'slime' }, { kind: 'fly', gap: 70 }] },
  { id: 'spikes-cactus', weight: 2, minLevel: 0.6, items: [{ kind: 'spikes' }, { kind: 'cactus', gap: 60 }] },
];

export const COLLECTIBLE_CONFIG = {
  /** Chance a cluster gets a coin arc over it / a ground coin row in the gap after it. */
  arcChance: 0.4,
  rowChance: 0.25,
  size: 58,
  spacing: 70,
} as const;

export const SCENERY_CONFIG = {
  /** Decorative bushes/plants along the ground: spacing range in px. */
  minSpacing: 260,
  maxSpacing: 700,
  poolSize: 10,
  keys: ['bush', 'plant', 'mushroomRed'],
} as const;
