import Phaser from 'phaser';
import { GAME_CONFIG, OBSTACLE_SPECS, type ObstacleKind } from '../config/gameConfig';
import { opaqueBounds, type Bounds } from '../art/assets';
import type { Box } from './Player';

const ANIMS: Partial<Record<ObstacleKind, string>> = { slime: 'slime-move', fly: 'fly-flap' };

/** Pooled obstacle. Never destroyed during play; deactivated and reused. */
export class Obstacle {
  readonly sprite: Phaser.GameObjects.Sprite;
  active = false;
  /** Visible width in world px (used for spacing). */
  readonly width: number;
  /** Visible height above the ground line, including lift. */
  readonly reach: number;
  private bounds: Bounds;
  private baseY = 0;
  private bob = 0;

  constructor(scene: Phaser.Scene, readonly kind: ObstacleKind) {
    const spec = OBSTACLE_SPECS[kind];
    this.bounds = opaqueBounds(scene, spec.texture);
    this.sprite = scene.add.sprite(0, 0, spec.texture).setOrigin(0, 1).setScale(spec.scale).setDepth(5).setVisible(false).setActive(false);
    this.width = this.bounds.w * spec.scale;
    this.reach = this.bounds.h * spec.scale + spec.lift;
  }

  spawn(x: number, extraLift = 0): void {
    const spec = OBSTACLE_SPECS[this.kind];
    const padBottom = (this.sprite.height - (this.bounds.y + this.bounds.h)) * spec.scale;
    this.active = true;
    this.bob = Math.random() * Math.PI * 2;
    // Position so the *visible* bottom edge rests at ground level (+ lift).
    this.baseY = GAME_CONFIG.groundY - spec.lift - extraLift + padBottom;
    this.sprite.setPosition(x - this.bounds.x * spec.scale, this.baseY).setVisible(true).setActive(true);
    const anim = ANIMS[this.kind];
    if (anim) this.sprite.play(anim);
  }

  despawn(): void {
    this.active = false;
    this.sprite.setVisible(false).setActive(false);
    this.sprite.anims.stop();
  }

  update(dt: number, dx: number): void {
    this.sprite.x -= dx;
    const amp = OBSTACLE_SPECS[this.kind].bob;
    if (amp) {
      this.bob += dt * 5;
      this.sprite.y = this.baseY + Math.sin(this.bob) * amp;
    }
  }

  /** Right edge of the visible art. */
  get right(): number {
    const spec = OBSTACLE_SPECS[this.kind];
    return this.sprite.x + (this.bounds.x + this.bounds.w) * spec.scale;
  }

  get hitbox(): Box {
    const spec = OBSTACLE_SPECS[this.kind];
    const left = this.sprite.x + this.bounds.x * spec.scale;
    const bottom = this.sprite.y - (this.sprite.height - (this.bounds.y + this.bounds.h)) * spec.scale;
    const w = this.bounds.w * spec.scale, h = this.bounds.h * spec.scale;
    return { x: left + spec.inset, y: bottom - h + spec.inset, w: w - spec.inset * 2, h: h - spec.inset * 2 };
  }
}
