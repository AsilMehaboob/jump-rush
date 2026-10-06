import { VISION_CONFIG } from './visionConfig';
import type { Baseline, BodyMetrics, JumpState, PlayerAction } from './types';
import { clamp } from '../utils/math';

type ActionListener = (action: PlayerAction) => void;
const J = VISION_CONFIG.jump;

/**
 * Relative-motion jump detector. Works in torso-length units so it adapts to any
 * player height / camera distance. STANDING -> TAKEOFF -> AIRBORNE -> LANDING -> STANDING;
 * a new jump can only start from STANDING, so one physical jump emits exactly one JUMP.
 */
export class JumpDetector {
  state: JumpState = 'STANDING';
  lastAction: PlayerAction = 'IDLE';
  /** Smoothed rise above baseline in torso lengths (debug). */
  rise = 0;
  velocity = 0;
  baseline: Baseline | null = null;

  private listeners = new Set<ActionListener>();
  private takeoffThreshold: number = J.takeoffThreshold;
  private prevRise = 0;
  private prevTime = 0;
  private stateSince = 0;
  private lastJumpAt = -Infinity;
  private lostSince: number | null = null;
  private primed = false;

  onAction(cb: ActionListener): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  setBaseline(b: Baseline): void {
    this.baseline = { ...b };
    this.takeoffThreshold = clamp(b.noise * J.noiseMultiplier, J.takeoffThreshold, J.maxTakeoffThreshold);
    this.reset();
  }

  reset(): void {
    this.state = 'STANDING';
    this.rise = 0; this.velocity = 0; this.prevRise = 0;
    this.primed = false; this.lostSince = null;
    this.lastAction = 'IDLE';
  }

  update(m: BodyMetrics): void {
    const b = this.baseline;
    if (!b) return;
    const t = m.time;

    if (!m.detected) {
      this.lostSince ??= t;
      if (t - this.lostSince > J.lostResetMs) this.reset();
      return;
    }
    this.lostSince = null;

    const raw = (b.centerY - m.centerY) / b.torsoLength;
    if (!this.primed) {
      this.rise = raw; this.prevRise = raw; this.prevTime = t; this.primed = true; this.stateSince = t;
      return;
    }
    const dt = Math.max((t - this.prevTime) / 1000, 1 / 120);
    this.rise += (raw - this.rise) * J.smoothing;
    const instVel = (this.rise - this.prevRise) / dt;
    this.velocity += (instVel - this.velocity) * J.smoothing;
    this.prevRise = this.rise;
    this.prevTime = t;

    switch (this.state) {
      case 'STANDING':
        if (Math.abs(this.rise) < 0.06 && Math.abs(this.velocity) < 0.3) {
          // Follow slow drift (player shuffles closer/further) without chasing real jumps.
          b.centerY += (m.centerY - b.centerY) * J.baselineDrift;
          b.torsoLength += (m.torsoLength - b.torsoLength) * J.baselineDrift;
        }
        if (this.rise >= this.takeoffThreshold && this.velocity >= J.minTakeoffVelocity && t - this.lastJumpAt >= J.minJumpIntervalMs) {
          this.lastJumpAt = t;
          this.enter('TAKEOFF', t);
          this.emit('JUMP');
        }
        break;
      case 'TAKEOFF':
        this.enter('AIRBORNE', t);
        break;
      case 'AIRBORNE': {
        const airMs = t - this.stateSince;
        const falling = this.rise < this.takeoffThreshold * J.landFraction && this.velocity < 0;
        if ((falling && airMs >= J.minAirborneMs) || airMs > J.maxAirborneMs) this.enter('LANDING', t);
        break;
      }
      case 'LANDING':
        if (this.rise < J.landedBand || t - this.stateSince > J.landingTimeoutMs) {
          this.enter('STANDING', t);
          this.emit('LAND');
        }
        break;
    }
  }

  private enter(s: JumpState, t: number): void { this.state = s; this.stateSince = t; }

  private emit(a: PlayerAction): void {
    this.lastAction = a;
    this.listeners.forEach((l) => l(a));
  }
}
