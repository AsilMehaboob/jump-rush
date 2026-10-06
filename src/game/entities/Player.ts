import Phaser from 'phaser';
import { GAME_CONFIG, PHYSICS_CONFIG } from '../config/gameConfig';

export interface Box { x: number; y: number; w: number; h: number }

export type PlayerMode = 'idle' | 'running' | 'dead';

/** Lightweight custom vertical physics: gravity, jump velocity, ground detection. */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  onGround = true;
  private vy = 0;
  /** Feet position (y grows downward). */
  private y: number = GAME_CONFIG.groundY;
  private mode: PlayerMode = 'idle';

  /** Fired the frame the player leaves / returns to the ground. */
  onJump?: (x: number, y: number) => void;
  onLand?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(GAME_CONFIG.playerX, GAME_CONFIG.groundY, 'player-stand').setOrigin(0.5, 1).setDepth(10);
  }

  get hitbox(): Box {
    const h = PHYSICS_CONFIG.playerHitbox;
    return { x: this.sprite.x - h.width / 2, y: this.y - h.height, w: h.width, h: h.height };
  }

  get x(): number { return this.sprite.x; }
  get feetY(): number { return this.y; }

  reset(): void {
    this.y = GAME_CONFIG.groundY;
    this.vy = 0;
    this.onGround = true;
    this.sprite.setAngle(0).setY(this.y);
    this.setMode('idle');
  }

  setMode(mode: PlayerMode): void {
    this.mode = mode;
    if (mode === 'idle') { this.sprite.anims.stop(); this.sprite.setTexture('player-stand'); }
    else if (mode === 'running') this.sprite.play('player-run', true);
    else { this.sprite.anims.stop(); this.sprite.setTexture('player-hurt'); }
  }

  jump(): boolean {
    if (!this.onGround || this.mode !== 'running') return false;
    this.vy = -PHYSICS_CONFIG.jumpVelocity;
    this.onGround = false;
    this.sprite.anims.stop();
    this.sprite.setTexture('player-jump');
    this.onJump?.(this.sprite.x, this.y);
    return true;
  }

  die(): void {
    this.setMode('dead');
    this.vy = -520;
    this.onGround = false;
  }

  update(dt: number): void {
    if (this.mode === 'idle') return;
    if (this.onGround && this.mode !== 'dead') return;
    this.vy += PHYSICS_CONFIG.gravity * dt;
    this.y += this.vy * dt;
    if (this.mode === 'dead') this.sprite.angle += 420 * dt;
    if (this.y >= GAME_CONFIG.groundY) {
      this.y = GAME_CONFIG.groundY;
      this.vy = 0;
      if (this.mode === 'running') {
        this.onGround = true;
        this.sprite.play('player-run', true);
        this.onLand?.(this.sprite.x, this.y);
      } else {
        this.sprite.setAngle(90);
      }
    }
    this.sprite.y = this.y;
  }
}
