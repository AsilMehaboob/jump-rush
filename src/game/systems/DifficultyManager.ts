import { difficultyConfig as D } from '../config/gameConfig';
import { clamp, lerp } from '../../utils/math';

/** Maps elapsed play time to speed / spacing. Everything is driven by difficultyConfig. */
export class DifficultyManager {
  private elapsed = 0;

  reset(): void { this.elapsed = 0; }
  update(dt: number): void { this.elapsed += dt; }

  get time(): number { return this.elapsed; }

  get speed(): number {
    return Math.min(D.maximumSpeed, D.startingSpeed + D.speedIncreaseRate * this.elapsed);
  }

  /** 0 at start, 1 at maximum speed. */
  get level(): number {
    return clamp((this.speed - D.startingSpeed) / (D.maximumSpeed - D.startingSpeed), 0, 1);
  }

  /** Seconds of travel between clusters (before randomisation). */
  get spawnInterval(): number {
    return lerp(D.startingSpawnInterval, D.minimumSpawnInterval, this.level);
  }

  get minReactionGap(): number {
    return lerp(D.minReactionGapStart, D.minReactionGapEnd, this.level);
  }
}
