export type GameState =
  | 'BOOT' | 'MENU' | 'CAMERA_SETUP' | 'CAMERA_ERROR' | 'CALIBRATION'
  | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

const TRANSITIONS: Record<GameState, GameState[]> = {
  BOOT: ['MENU'],
  MENU: ['CAMERA_SETUP', 'COUNTDOWN'],
  CAMERA_SETUP: ['CALIBRATION', 'CAMERA_ERROR', 'MENU'],
  CAMERA_ERROR: ['CAMERA_SETUP', 'COUNTDOWN', 'MENU'],
  CALIBRATION: ['COUNTDOWN', 'CAMERA_ERROR', 'MENU'],
  COUNTDOWN: ['PLAYING', 'PAUSED', 'CALIBRATION', 'COUNTDOWN', 'CAMERA_ERROR', 'MENU'],
  PLAYING: ['PAUSED', 'GAME_OVER', 'CALIBRATION', 'COUNTDOWN', 'CAMERA_ERROR', 'MENU'],
  PAUSED: ['COUNTDOWN', 'CALIBRATION', 'GAME_OVER', 'CAMERA_ERROR', 'MENU'],
  GAME_OVER: ['CALIBRATION', 'COUNTDOWN', 'CAMERA_ERROR', 'MENU'],
};

/** Guards state changes so the app can never enter an illegal flow. */
export class GameStateMachine {
  private current: GameState = 'BOOT';
  private listeners = new Set<(next: GameState, prev: GameState) => void>();

  get state(): GameState { return this.current; }

  is(...states: GameState[]): boolean { return states.includes(this.current); }

  onChange(cb: (next: GameState, prev: GameState) => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  go(next: GameState): boolean {
    if (next === this.current) return true;
    if (!TRANSITIONS[this.current].includes(next)) {
      console.warn(`Illegal state transition ${this.current} -> ${next}`);
      return false;
    }
    const prev = this.current;
    this.current = next;
    this.listeners.forEach((l) => l(next, prev));
    return true;
  }
}
