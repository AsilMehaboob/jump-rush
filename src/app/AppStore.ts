import type { GameState } from './GameStateMachine';
import type { CameraDevice, CameraErrorKind } from '../vision/CameraService';

export type PauseReason = 'user' | 'player-lost';
export type CountdownLabel = 'READY' | '3' | '2' | '1' | 'GO' | null;

/** Coarse UI state. High-frequency data (pose frames, score) never goes through here. */
export interface AppSnapshot {
  state: GameState;
  pauseReason: PauseReason | null;
  cameraError: CameraErrorKind | null;
  cameraErrorMessage: string;
  countdown: CountdownLabel;
  calibrationProgress: number;
  playerDetected: boolean;
  poseReady: boolean;
  score: number;
  best: number;
  distance: number;
  coins: number;
  newBest: boolean;
  muted: boolean;
  showPreview: boolean;
  debug: boolean;
  keyboardOnly: boolean;
  devices: CameraDevice[];
  cameraId: string | null;
  canRestartByJump: boolean;
}

export const initialSnapshot = (debug: boolean): AppSnapshot => ({
  state: 'BOOT', pauseReason: null, cameraError: null, cameraErrorMessage: '', countdown: null,
  calibrationProgress: 0, playerDetected: false, poseReady: false, score: 0, best: 0, distance: 0, coins: 0,
  newBest: false, muted: false, showPreview: false, debug, keyboardOnly: false, devices: [], cameraId: null,
  canRestartByJump: false,
});

export class AppStore {
  private snap: AppSnapshot;
  private listeners = new Set<() => void>();

  constructor(debug: boolean) { this.snap = initialSnapshot(debug); }

  getSnapshot = (): AppSnapshot => this.snap;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  };

  set(patch: Partial<AppSnapshot>): void {
    const changed = (Object.keys(patch) as Array<keyof AppSnapshot>).some((k) => patch[k] !== this.snap[k]);
    if (!changed) return;
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }
}
