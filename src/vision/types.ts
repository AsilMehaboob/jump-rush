export type PlayerAction = 'IDLE' | 'JUMP' | 'LAND';
export type JumpState = 'STANDING' | 'TAKEOFF' | 'AIRBORNE' | 'LANDING';

export interface Landmark { x: number; y: number; z: number; visibility: number }

/** Compact, resolution-independent summary of one pose frame. */
export interface BodyMetrics {
  time: number;
  detected: boolean;
  fullBody: boolean;
  confidence: number;
  /** Mean y of shoulders + hips (normalised image coords, 0 = top). */
  centerY: number;
  /** Shoulder-to-hip distance, the per-player scale unit. */
  torsoLength: number;
  box: { x: number; y: number; w: number; h: number } | null;
}

export interface Baseline { centerY: number; torsoLength: number; noise: number }

export const LM = {
  nose: 0, lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24,
  lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
} as const;
