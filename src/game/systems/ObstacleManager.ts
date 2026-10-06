import Phaser from 'phaser';
import {
  COLLECTIBLE_CONFIG, GAME_CONFIG, OBSTACLE_SPECS, PATTERNS, PHYSICS_CONFIG, difficultyConfig,
  type ObstacleKind, type PatternDef,
} from '../config/gameConfig';
import { Obstacle } from '../entities/Obstacle';
import { Collectible } from '../entities/Collectible';
import type { DifficultyManager } from './DifficultyManager';
import { rand } from '../../utils/math';

const SPAWN_X = GAME_CONFIG.width + 120;
/** Extra clearance (px) required beyond the player's body when validating a cluster. */
const SAFETY_MARGIN = 24;
const FLY_EXTRA_LIFT = 30;
const KINDS = Object.keys(OBSTACLE_SPECS) as ObstacleKind[];

/** Time (s) the jump arc spends above a given height. */
function airTimeAbove(height: number): number {
  const v = PHYSICS_CONFIG.jumpVelocity, g = PHYSICS_CONFIG.gravity;
  const disc = v * v - 2 * g * height;
  return disc <= 0 ? 0 : (2 * Math.sqrt(disc)) / g;
}

/** Procedural, pooled obstacle + coin spawning with reaction-safe gaps. */
export class ObstacleManager {
  readonly obstacles: Obstacle[] = [];
  readonly coins: Collectible[] = [];
  private lastEndX = SPAWN_X;
  private pendingGap = 0;
  private readonly bySize = new Map<ObstacleKind, Obstacle>();

  constructor(scene: Phaser.Scene, private difficulty: DifficultyManager) {
    for (const kind of KINDS) {
      for (let i = 0; i < 4; i++) this.obstacles.push(new Obstacle(scene, kind));
      this.bySize.set(kind, this.obstacles.find((o) => o.kind === kind) as Obstacle);
    }
    for (let i = 0; i < 16; i++) this.coins.push(new Collectible(scene));
  }

  reset(): void {
    this.obstacles.forEach((o) => o.despawn());
    this.coins.forEach((c) => c.despawn());
    this.lastEndX = SPAWN_X;
    this.pendingGap = difficultyConfig.startingSpeed * difficultyConfig.firstObstacleDelay;
  }

  update(dt: number, speed: number): void {
    const dx = speed * dt;
    for (const o of this.obstacles) if (o.active) { o.update(dt, dx); if (o.right < -20) o.despawn(); }
    for (const c of this.coins) if (c.active) { c.update(dt, dx); if (c.sprite.x < -60) c.despawn(); }

    this.lastEndX -= dx;
    if (this.lastEndX + this.pendingGap <= SPAWN_X) this.spawnCluster(speed);
  }

  private spec(kind: ObstacleKind): { width: number; reach: number } {
    const o = this.bySize.get(kind) as Obstacle;
    return { width: o.width, reach: o.reach + (kind === 'fly' ? FLY_EXTRA_LIFT : 0) };
  }

  private pickPattern(speed: number): PatternDef {
    const level = this.difficulty.level;
    const fits = PATTERNS.filter((p) => p.minLevel <= level && this.isSafe(p, speed));
    const pool = fits.length ? fits : PATTERNS.filter((p) => p.items.length === 1);
    let r = Math.random() * pool.reduce((s, p) => s + p.weight, 0);
    for (const p of pool) { r -= p.weight; if (r <= 0) return p; }
    return pool[0];
  }

  /** A cluster is only legal if one jump clears its whole width (plus the player body) at this speed. */
  private isSafe(p: PatternDef, speed: number): boolean {
    let width = 0, tallest = 0;
    p.items.forEach((it, i) => {
      const s = this.spec(it.kind);
      width += s.width + (i > 0 ? it.gap ?? 0 : 0);
      tallest = Math.max(tallest, s.reach);
    });
    return width + PHYSICS_CONFIG.playerHitbox.width + SAFETY_MARGIN <= speed * airTimeAbove(tallest);
  }

  private acquireObstacle(kind: ObstacleKind): Obstacle | null {
    return this.obstacles.find((o) => !o.active && o.kind === kind) ?? null;
  }

  private spawnCluster(speed: number): void {
    const pattern = this.pickPattern(speed);
    let x = SPAWN_X, tallest = 0;
    pattern.items.forEach((item, i) => {
      if (i > 0) x += item.gap ?? 0;
      const o = this.acquireObstacle(item.kind);
      const s = this.spec(item.kind);
      if (o) o.spawn(x, item.kind === 'fly' ? Math.round(rand(0, FLY_EXTRA_LIFT)) : 0);
      x += s.width;
      tallest = Math.max(tallest, s.reach);
    });
    const width = x - SPAWN_X;

    const d = this.difficulty;
    const gapSeconds = Math.max(d.spawnInterval * rand(1.0, 1.35), d.minReactionGap);
    this.pendingGap = gapSeconds * speed;
    this.lastEndX = SPAWN_X + width;

    if (Math.random() < COLLECTIBLE_CONFIG.arcChance) this.spawnArc(SPAWN_X + width / 2, tallest);
    else if (Math.random() < COLLECTIBLE_CONFIG.rowChance) this.spawnRow(this.lastEndX + this.pendingGap * 0.5);
  }

  /** Three coins following the jump arc over a cluster. */
  private spawnArc(centerX: number, tallest: number): void {
    const maxPeak = PHYSICS_CONFIG.jumpVelocity ** 2 / (2 * PHYSICS_CONFIG.gravity);
    const peak = Math.min(tallest + 70, maxPeak - 30);
    const s = COLLECTIBLE_CONFIG.spacing;
    [[-s, 0.8], [0, 1], [s, 0.8]].forEach(([dx, f]) => {
      this.acquireCoin()?.spawn(centerX + dx, GAME_CONFIG.groundY - peak * f);
    });
  }

  private spawnRow(centerX: number): void {
    const s = COLLECTIBLE_CONFIG.spacing;
    for (let i = -1; i <= 1; i++) this.acquireCoin()?.spawn(centerX + i * s, GAME_CONFIG.groundY - 70);
  }

  private acquireCoin(): Collectible | null {
    return this.coins.find((c) => !c.active) ?? null;
  }
}
