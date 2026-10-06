import { SCORE_CONFIG } from '../config/gameConfig';

export class ScoreManager {
  private distance = 0;
  private bonus = 0;
  coins = 0;

  reset(): void { this.distance = 0; this.bonus = 0; this.coins = 0; }

  addDistance(px: number): void { this.distance += px; }

  addCoin(): void { this.coins++; this.bonus += SCORE_CONFIG.coinValue; }

  get score(): number { return Math.floor(this.distance * SCORE_CONFIG.pointsPerPixel + this.bonus); }
  get meters(): number { return Math.floor(this.distance / 10); }
}
