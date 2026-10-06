import { APP_CONFIG } from '../config/appConfig';

export type CameraErrorKind = 'permission' | 'not-found' | 'in-use' | 'disconnected' | 'unknown';
export interface CameraDevice { id: string; label: string }

export class CameraError extends Error {
  constructor(readonly kind: CameraErrorKind, message: string) { super(message); }
}

function toCameraError(e: unknown): CameraError {
  const name = (e as DOMException)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return new CameraError('permission', 'Camera permission denied');
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return new CameraError('not-found', 'No camera found');
  if (name === 'NotReadableError' || name === 'AbortError') return new CameraError('in-use', 'Camera is in use or unavailable');
  return new CameraError('unknown', (e as Error)?.message ?? 'Camera error');
}

/** Owns the webcam stream and the hidden <video> that the pose detector reads. */
export class CameraService {
  readonly video: HTMLVideoElement;
  stream: MediaStream | null = null;
  private disconnectCbs = new Set<() => void>();
  private deviceCbs = new Set<() => void>();

  constructor() {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    // Must live in the DOM (invisible) or Chromium will not deliver video frame callbacks.
    Object.assign(this.video.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(this.video);
    navigator.mediaDevices?.addEventListener?.('devicechange', () => this.deviceCbs.forEach((c) => c()));
  }

  get active(): boolean { return !!this.stream?.getVideoTracks().some((t) => t.readyState === 'live'); }

  onDisconnect(cb: () => void): () => void { this.disconnectCbs.add(cb); return () => { this.disconnectCbs.delete(cb); }; }
  onDevicesChanged(cb: () => void): () => void { this.deviceCbs.add(cb); return () => { this.deviceCbs.delete(cb); }; }

  async start(deviceId?: string): Promise<void> {
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unknown', 'Camera API unavailable');
    const { width, height, frameRate } = APP_CONFIG.camera;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: frameRate }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
      });
    } catch (e) {
      throw toCameraError(e);
    }
    const stream = this.stream;
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (this.stream === stream) this.disconnectCbs.forEach((c) => c());
    });
    this.video.srcObject = stream;
    await this.waitForVideo();
  }

  /** Resolves once frames are flowing; never blocks forever if autoplay stalls. */
  private waitForVideo(): Promise<void> {
    const v = this.video;
    void v.play().catch(() => undefined);
    return new Promise((resolve) => {
      if (v.readyState >= 2) { resolve(); return; }
      const done = () => { v.removeEventListener('loadeddata', done); clearTimeout(timer); resolve(); };
      const timer = setTimeout(done, 4000);
      v.addEventListener('loadeddata', done);
    });
  }

  stop(): void {
    const s = this.stream;
    this.stream = null; // clear first so 'ended' handlers don't report a disconnect
    s?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
  }

  currentDeviceId(): string | undefined {
    return this.stream?.getVideoTracks()[0]?.getSettings().deviceId;
  }

  async listDevices(): Promise<CameraDevice[]> {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
  }
}
