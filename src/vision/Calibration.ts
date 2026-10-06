import { VISION_CONFIG as C } from './visionConfig';
import type { Baseline, BodyMetrics } from './types';

export interface CalibrationResult { progress: number; done: boolean; baseline: Baseline | null }

const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;

/** Collects frames of the player standing still and derives their personal baseline. */
export class Calibration {
  private samples: BodyMetrics[] = [];

  reset(): void { this.samples = []; }

  add(m: BodyMetrics): CalibrationResult {
    const need = C.calibration.framesRequired;
    if (!m.fullBody) {
      this.samples = [];
      return { progress: 0, done: false, baseline: null };
    }
    this.samples.push(m);
    if (this.samples.length > need) this.samples.shift();

    const torso = mean(this.samples.map((s) => s.torsoLength));
    const ys = this.samples.map((s) => s.centerY);
    const centerY = mean(ys);
    const noise = Math.sqrt(mean(ys.map((y) => (y - centerY) ** 2))) / torso;
    if (noise > C.calibration.maxStdDev) {
      // Player is moving: restart the window with only the latest frame.
      this.samples = [m];
      return { progress: 0, done: false, baseline: null };
    }
    const progress = this.samples.length / need;
    if (this.samples.length < need) return { progress, done: false, baseline: null };
    return { progress: 1, done: true, baseline: { centerY, torsoLength: torso, noise } };
  }
}
