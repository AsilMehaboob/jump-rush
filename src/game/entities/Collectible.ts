import Phaser from 'phaser';
import { COLLECTIBLE_CONFIG } from '../config/gameConfig';
import type { Box } from './Player';

/** Pooled coin that "spins" by squashing its width. */
export class Collectible {
  readonly sprite: Phaser.GameObjects.Image;
  active = false;
  private phase = 0;
  private readonly baseScale: number;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'coin').setOrigin(0.5).setDepth(6).setVisible(false).setActive(false);
    this.baseScale = COLLECTIBLE_CONFIG.size / this.sprite.width;
    this.sprite.setScale(this.baseScale);
  }

  /** (x, y) is the coin centre. */
  spawn(x: number, y: number): void {
    this.active = true;
    this.phase = Math.random() * Math.PI * 2;
    this.sprite.setPosition(x, y).setVisible(true).setActive(true);
  }

  despawn(): void {
    this.active = false;
    this.sprite.setVisible(false).setActive(false);
  }

  update(dt: number, dx: number): void {
    this.sprite.x -= dx;
    this.phase += dt * 6;
    this.sprite.setScale(this.baseScale * (0.25 + 0.75 * Math.abs(Math.cos(this.phase))), this.baseScale);
  }

  get hitbox(): Box {
    const s = COLLECTIBLE_CONFIG.size * 0.8;
    return { x: this.sprite.x - s / 2, y: this.sprite.y - s / 2, w: s, h: s };
  }
}
