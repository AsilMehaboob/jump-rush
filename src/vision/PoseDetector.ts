import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { VISION_CONFIG as C } from './visionConfig';
import { computeBodyMetrics } from './metrics';
import type { BodyMetrics, Landmark } from './types';
import type { CameraService } from './CameraService';
import { runtimeStats } from '../utils/runtimeStats';

export type MetricsListener = (m: BodyMetrics, landmarks: Landmark[] | null) => void;

const assetUrl = (p: string): string => new URL(p, document.baseURI).toString();

/** Runs MediaPipe Pose Landmarker locally on the camera video at a capped rate. */
export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private listeners = new Set<MetricsListener>();
  private running = false;
  private lastRun = 0;
  private lastVideoTime = -1;
  private frames = 0;
  private fpsSince = performance.now();
  private loopId = 0;

  constructor(private camera: CameraService) {}

  get ready(): boolean { return this.landmarker !== null; }

  onFrame(cb: MetricsListener): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }

  async init(): Promise<void> {
    if (this.landmarker) return;
    const fileset = await FilesetResolver.forVisionTasks(assetUrl(C.wasmPath));
    const make = (delegate: 'GPU' | 'CPU') => PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: assetUrl(C.modelPath), delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: C.minPoseConfidence,
      minPosePresenceConfidence: C.minPoseConfidence,
      minTrackingConfidence: C.minPoseConfidence,
    });
    try { this.landmarker = await make('GPU'); } catch { this.landmarker = await make('CPU'); }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastVideoTime = -1;
    this.schedule();
  }

  stop(): void { this.running = false; this.loopId++; }

  private schedule(): void {
    const id = ++this.loopId;
    const v = this.camera.video;
    const tick = () => { if (this.running && id === this.loopId) { this.process(); this.schedule(); } };
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(tick);
    else setTimeout(tick, 1000 / C.targetFps);
  }

  private process(): void {
    const v = this.camera.video;
    const now = performance.now();
    if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    if (now - this.lastRun < 1000 / C.targetFps - 2) return;
    this.lastRun = now;
    this.lastVideoTime = v.currentTime;

    let lm: Landmark[] | null = null;
    try {
      const res = this.landmarker.detectForVideo(v, now);
      lm = (res.landmarks[0] as Landmark[] | undefined) ?? null;
    } catch {
      lm = null; // a bad frame must never crash the game
    }
    this.frames++;
    if (now - this.fpsSince >= 1000) {
      runtimeStats.poseFps = Math.round((this.frames * 1000) / (now - this.fpsSince));
      this.frames = 0;
      this.fpsSince = now;
    }
    const metrics = computeBodyMetrics(lm, now);
    this.listeners.forEach((l) => l(metrics, lm));
  }
}
