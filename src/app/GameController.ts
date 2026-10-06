import { APP_CONFIG } from '../config/appConfig';
import { VISION_CONFIG } from '../vision/visionConfig';
import { CameraError, CameraService } from '../vision/CameraService';
import { PoseDetector } from '../vision/PoseDetector';
import { JumpDetector } from '../vision/JumpDetector';
import { Calibration } from '../vision/Calibration';
import type { BodyMetrics, PlayerAction } from '../vision/types';
import { HighScoreStore } from '../storage/HighScoreStore';
import { audio } from '../audio/AudioManager';
import { bus, type GameOverPayload } from '../utils/EventBus';
import { runtimeStats } from '../utils/runtimeStats';
import { AppStore, type CountdownLabel, type PauseReason } from './AppStore';
import { GameStateMachine, type GameState } from './GameStateMachine';

type CountdownPurpose = 'start' | 'resume';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Orchestrates camera, pose detection, jump detection, audio, storage and the Phaser scene. */
export class GameController {
  readonly machine = new GameStateMachine();
  readonly store = new AppStore(APP_CONFIG.debug.enabled);
  readonly camera = new CameraService();
  readonly pose = new PoseDetector(this.camera);
  readonly jump = new JumpDetector();
  readonly scores = new HighScoreStore();
  private calibration = new Calibration();

  private token = 0;
  private lostSince: number | null = null;
  private foundSince: number | null = null;
  private gameOverAt = 0;
  lastMetrics: BodyMetrics | null = null;
  /** Most recent action from either the pose detector or the keyboard (debug overlay). */
  lastAction: PlayerAction = 'IDLE';

  constructor() {
    this.machine.onChange((state) => {
      this.store.set({ state, canRestartByJump: state === 'GAME_OVER' && !this.store.getSnapshot().keyboardOnly });
    });
    this.pose.onFrame((m) => this.onPoseFrame(m));
    this.jump.onAction((a) => this.onJumpAction(a));
    this.camera.onDisconnect(() => this.onCameraLost());
    this.camera.onDevicesChanged(() => void this.refreshDevices());
    bus.on('game:over', (p) => this.onGameOver(p));
  }

  // ---------- lifecycle ----------

  async boot(): Promise<void> {
    const data = await this.scores.load();
    audio.setMuted(data.settings.muted);
    void audio.preload();
    runtimeStats.best = data.highScore;
    this.store.set({ best: data.highScore, muted: data.settings.muted, showPreview: data.settings.showPreview, cameraId: data.settings.cameraId });
    try { await Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('20px "Fredoka"')]); } catch { /* fall back to monospace */ }
    document.title = APP_CONFIG.title;
    this.machine.go('MENU');
    // Warm the pose model in the background so START is fast.
    this.pose.init().then(() => this.store.set({ poseReady: true })).catch(() => { /* reported when camera starts */ });
  }

  // ---------- menu / camera ----------

  async startGame(): Promise<void> {
    if (!this.machine.is('MENU')) return;
    audio.unlock();
    audio.start();
    this.store.set({ keyboardOnly: false });
    await this.connectCamera();
  }

  startKeyboardOnly(): void {
    if (!APP_CONFIG.keyboardFallback || !this.machine.is('MENU', 'CAMERA_ERROR')) return;
    audio.unlock();
    this.store.set({ keyboardOnly: true, cameraError: null });
    this.startCountdown('start');
  }

  async retryCamera(): Promise<void> {
    if (!this.machine.is('CAMERA_ERROR')) return;
    this.store.set({ cameraError: null });
    await this.connectCamera();
  }

  private async connectCamera(): Promise<void> {
    const token = ++this.token;
    this.store.set({ cameraError: null, cameraErrorMessage: '' });
    this.machine.go('CAMERA_SETUP');
    try {
      await this.camera.start(this.store.getSnapshot().cameraId ?? undefined);
      await this.pose.init();
      this.store.set({ poseReady: true });
      if (token !== this.token) return;
      await this.refreshDevices();
      this.pose.start();
      this.beginCalibration();
    } catch (e) {
      if (token !== this.token) return;
      this.camera.stop();
      const err = e instanceof CameraError ? e : new CameraError('unknown', 'Pose model failed to load');
      this.failCamera(err.kind, err.message);
    }
  }

  private failCamera(kind: CameraError['kind'], message: string): void {
    this.token++;
    this.pose.stop();
    bus.emit('scene:pause', undefined);
    audio.stopMusic();
    this.store.set({ cameraError: kind, cameraErrorMessage: message });
    this.machine.go('CAMERA_ERROR');
  }

  private onCameraLost(): void {
    if (this.store.getSnapshot().keyboardOnly) return;
    if (this.machine.is('CALIBRATION', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'GAME_OVER', 'CAMERA_SETUP')) {
      this.camera.stop();
      this.failCamera('disconnected', 'Camera disconnected');
    }
  }

  async refreshDevices(): Promise<void> {
    try {
      const devices = await this.camera.listDevices();
      this.store.set({ devices, cameraId: this.camera.currentDeviceId() ?? this.store.getSnapshot().cameraId });
    } catch { /* enumeration is optional */ }
  }

  async selectCamera(id: string): Promise<void> {
    this.scores.updateSettings({ cameraId: id });
    this.store.set({ cameraId: id });
    if (!this.camera.active) return;
    try {
      await this.camera.start(id);
      this.calibration.reset();
      this.store.set({ calibrationProgress: 0 });
      if (this.machine.is('PAUSED', 'GAME_OVER')) this.beginCalibration();
    } catch (e) {
      this.camera.stop();
      const err = e instanceof CameraError ? e : new CameraError('unknown', 'Camera error');
      this.failCamera(err.kind, err.message);
    }
  }

  // ---------- calibration & countdown ----------

  private beginCalibration(): void {
    this.token++;
    this.calibration.reset();
    this.lostSince = this.foundSince = null;
    this.store.set({ calibrationProgress: 0, pauseReason: null, countdown: null });
    bus.emit('scene:prepare', undefined);
    audio.stopMusic();
    this.machine.go('CALIBRATION');
  }

  private async startCountdown(purpose: CountdownPurpose): Promise<void> {
    const token = ++this.token;
    this.store.set({ pauseReason: null });
    if (purpose === 'start') bus.emit('scene:prepare', undefined);
    this.machine.go('COUNTDOWN');
    const steps: Array<[CountdownLabel, number]> = [['READY', 900], ['3', 800], ['2', 800], ['1', 800], ['GO', 600]];
    for (const [label, ms] of purpose === 'resume' ? steps.slice(1) : steps) {
      this.store.set({ countdown: label });
      if (label === 'GO') audio.go(); else if (label !== 'READY') audio.blip();
      await sleep(ms);
      if (token !== this.token) return;
    }
    this.store.set({ countdown: null });
    this.jump.reset();
    this.machine.go('PLAYING');
    if (purpose === 'start') bus.emit('scene:start', undefined); else bus.emit('scene:resume', undefined);
  }

  // ---------- pose frames & actions ----------

  private onPoseFrame(m: BodyMetrics): void {
    this.lastMetrics = m;
    const st = this.machine.state;
    this.store.set({ playerDetected: m.detected });

    if (st === 'CALIBRATION') {
      const res = this.calibration.add(m);
      this.store.set({ calibrationProgress: Math.round(res.progress * 20) / 20 });
      if (res.done && res.baseline) {
        this.jump.setBaseline(res.baseline);
        void this.startCountdown('start');
      }
      return;
    }

    this.jump.update(m);

    if (st === 'PLAYING') {
      if (m.detected) { this.lostSince = null; return; }
      this.lostSince ??= m.time;
      if (m.time - this.lostSince > VISION_CONFIG.lostPauseMs) this.pauseGame('player-lost');
    } else if (st === 'PAUSED' && this.store.getSnapshot().pauseReason === 'player-lost') {
      if (!m.detected) { this.foundSince = null; return; }
      this.foundSince ??= m.time;
      if (m.time - this.foundSince > VISION_CONFIG.foundResumeMs) void this.startCountdown('resume');
    }
  }

  private onJumpAction(a: PlayerAction): void {
    this.lastAction = a;
    if (a === 'JUMP') this.triggerJump();
    else if (a === 'LAND') bus.emit('action', 'LAND');
  }

  /** Single entry for a jump from the pose detector or the keyboard fallback. */
  triggerJump(): void {
    if (this.machine.is('PLAYING')) {
      bus.emit('action', 'JUMP');
    } else if (this.machine.is('GAME_OVER') && !this.store.getSnapshot().keyboardOnly && Date.now() - this.gameOverAt > APP_CONFIG.restartLockoutMs) {
      this.restart();
    }
  }

  // ---------- game flow ----------

  pauseGame(reason: PauseReason): void {
    if (!this.machine.is('PLAYING')) return;
    this.lostSince = this.foundSince = null;
    this.store.set({ pauseReason: reason });
    bus.emit('scene:pause', undefined);
    this.machine.go('PAUSED');
  }

  resumeGame(): void {
    if (this.machine.is('PAUSED')) void this.startCountdown('resume');
  }

  togglePause(): void {
    if (this.machine.is('PLAYING')) this.pauseGame('user');
    else if (this.machine.is('PAUSED')) this.resumeGame();
  }

  restart(): void {
    if (!this.machine.is('PLAYING', 'PAUSED', 'GAME_OVER', 'COUNTDOWN')) return;
    audio.unlock();
    audio.start();
    if (this.store.getSnapshot().keyboardOnly || !this.camera.active) void this.startCountdown('start');
    else this.beginCalibration();
  }

  quitToMenu(): void {
    this.token++;
    this.pose.stop();
    this.camera.stop();
    audio.stopMusic();
    this.store.set({ countdown: null, pauseReason: null, calibrationProgress: 0, playerDetected: false, keyboardOnly: false, cameraError: null });
    this.machine.go('MENU');
    bus.emit('scene:attract', undefined);
  }

  private onGameOver(p: GameOverPayload): void {
    if (!this.machine.is('PLAYING', 'PAUSED')) return;
    const newBest = this.scores.submit(p.score, p.distance);
    const best = this.scores.data.highScore;
    runtimeStats.best = best;
    bus.emit('game:best', best);
    this.gameOverAt = Date.now();
    this.jump.reset();
    this.store.set({ score: p.score, distance: p.distance, coins: p.coins, best, newBest, pauseReason: null });
    this.machine.go('GAME_OVER');
  }

  // ---------- settings ----------

  toggleMute(): void {
    const muted = !this.store.getSnapshot().muted;
    audio.setMuted(muted);
    this.scores.updateSettings({ muted });
    this.store.set({ muted });
  }

  togglePreview(): void {
    const showPreview = !this.store.getSnapshot().showPreview;
    this.scores.updateSettings({ showPreview });
    this.store.set({ showPreview });
  }

  toggleDebug(): void {
    if (APP_CONFIG.debug.hotkey) this.store.set({ debug: !this.store.getSnapshot().debug });
  }

  async toggleFullscreen(): Promise<void> {
    if (window.humanRunner) { await window.humanRunner.toggleFullscreen(); return; }
    if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
  }

  // ---------- keyboard fallback (developer / testing) ----------

  handleKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const st: GameState = this.machine.state;
    if (e.key === 'F11') { e.preventDefault(); void this.toggleFullscreen(); return; }
    if (e.key === 'F3') { this.toggleDebug(); return; }
    if (e.key.toLowerCase() === 'm') { this.toggleMute(); return; }
    if (!APP_CONFIG.keyboardFallback) return;
    if (e.code === 'Space') { e.preventDefault(); this.triggerKeyboardJump(); }
    else if (e.key === 'Escape') this.togglePause();
    else if (e.key.toLowerCase() === 'r') this.restart();
    else if (e.key === 'Enter' && st === 'MENU') void this.startGame();
    else if (e.key.toLowerCase() === 'k' && this.store.getSnapshot().debug) this.startKeyboardOnly();
  };

  private triggerKeyboardJump(): void {
    this.lastAction = 'JUMP';
    if (this.machine.is('MENU')) { void this.startGame(); return; }
    if (this.machine.is('GAME_OVER')) { if (Date.now() - this.gameOverAt > APP_CONFIG.restartLockoutMs) this.restart(); return; }
    this.triggerJump();
  }
}

export const controller = new GameController();
