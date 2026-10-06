export interface Settings { muted: boolean; showPreview: boolean; cameraId: string | null }

export interface StoredData {
  highScore: number;
  bestDistance: number;
  bestAt: string | null;
  settings: Settings;
}

const LS_KEY = 'human-runner-data';

const defaults = (): StoredData => ({
  highScore: 0, bestDistance: 0, bestAt: null,
  settings: { muted: false, showPreview: false, cameraId: null },
});

/** Persists scores + settings locally: a JSON file via Electron, localStorage as fallback. */
export class HighScoreStore {
  data: StoredData = defaults();

  async load(): Promise<StoredData> {
    let raw: unknown = null;
    try {
      raw = window.humanRunner ? await window.humanRunner.readStore() : null;
      if (!raw) raw = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null');
    } catch { raw = null; }
    const d = defaults();
    if (raw && typeof raw === 'object') {
      const r = raw as Partial<StoredData>;
      this.data = {
        highScore: Number(r.highScore) || 0,
        bestDistance: Number(r.bestDistance) || 0,
        bestAt: typeof r.bestAt === 'string' ? r.bestAt : null,
        settings: { ...d.settings, ...(r.settings ?? {}) },
      };
    }
    return this.data;
  }

  /** Records a finished run; returns true when it is a new high score. */
  submit(score: number, distance: number): boolean {
    const isBest = score > this.data.highScore;
    if (isBest) { this.data.highScore = score; this.data.bestAt = new Date().toISOString(); }
    if (distance > this.data.bestDistance) this.data.bestDistance = distance;
    void this.save();
    return isBest;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.data.settings = { ...this.data.settings, ...patch };
    void this.save();
  }

  private async save(): Promise<void> {
    try {
      if (window.humanRunner) await window.humanRunner.writeStore(this.data);
      localStorage.setItem(LS_KEY, JSON.stringify(this.data));
    } catch { /* storage unavailable: scores stay in memory for this session */ }
  }
}
