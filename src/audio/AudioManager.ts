import { APP_CONFIG } from '../config/appConfig';

/** Bundled audio files (see ASSET_LICENSES.md). Replace a file or edit a path to change a sound. */
const SOUND_FILES = {
  jump: 'assets/audio/jump.ogg',
  land: 'assets/audio/land.ogg',
  coin: 'assets/audio/coin.ogg',
  hit: 'assets/audio/hit.ogg',
  gameOver: 'assets/audio/gameover.ogg',
  start: 'assets/audio/start.ogg',
  blip: 'assets/audio/blip.ogg',
  go: 'assets/audio/go.ogg',
} as const;
const MUSIC_FILE = 'assets/audio/music.mp3';

type SoundName = keyof typeof SOUND_FILES;

const SOUND_VOLUME: Record<SoundName, number> = {
  jump: 0.5, land: 0.25, coin: 0.7, hit: 0.9, gameOver: 0.8, start: 0.6, blip: 0.5, go: 0.7,
};

/** Plays locally bundled sound effects and a looping music track through the Web Audio API. */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private muted = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicOffset = 0;
  private musicStartedAt = 0;
  private wantMusic = false;

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : APP_CONFIG.audio.masterVolume;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = APP_CONFIG.audio.musicVolume;
        this.musicGain.connect(this.master);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Decodes every sound once. Safe to call repeatedly. */
  preload(): Promise<void> {
    const ctx = this.ensure();
    if (!ctx) return Promise.resolve();
    this.loading ??= Promise.all(
      [...Object.values(SOUND_FILES), MUSIC_FILE].map(async (path) => {
        try {
          const res = await fetch(new URL(path, document.baseURI).toString());
          this.buffers.set(path, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch { /* a missing sound must never break the game */ }
      }),
    ).then(() => {
      if (this.wantMusic) this.startMusic();
    });
    return this.loading;
  }

  /** Call from a user gesture to make sure audio is unlocked. */
  unlock(): void { void this.preload(); }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : APP_CONFIG.audio.masterVolume;
  }

  private play(name: SoundName, delay = 0): void {
    const ctx = this.ensure();
    const buf = this.buffers.get(SOUND_FILES[name]);
    if (!ctx || !this.master || !buf) return;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = SOUND_VOLUME[name];
    src.buffer = buf;
    src.connect(g).connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  jump(): void { this.play('jump'); }
  land(): void { this.play('land'); }
  coin(): void { this.play('coin'); }
  hit(): void { this.play('hit'); }
  gameOver(): void { this.play('gameOver'); }
  start(): void { this.play('start'); }
  blip(): void { this.play('blip'); }
  go(): void { this.play('go'); }

  startMusic(): void {
    this.wantMusic = true;
    const ctx = this.ensure();
    const buf = this.buffers.get(MUSIC_FILE);
    if (!ctx || !this.musicGain || !buf || this.musicSource) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.musicGain);
    src.start(0, this.musicOffset % buf.duration);
    this.musicStartedAt = ctx.currentTime - this.musicOffset;
    this.musicSource = src;
  }

  /** Stops the music but keeps its position, so a pause resumes where it left off. */
  pauseMusic(): void {
    if (this.musicSource && this.ctx) this.musicOffset = this.ctx.currentTime - this.musicStartedAt;
    this.haltMusic();
  }

  /** Stops the music and rewinds it for the next run. */
  stopMusic(): void {
    this.musicOffset = 0;
    this.haltMusic();
  }

  private haltMusic(): void {
    this.wantMusic = false;
    try { this.musicSource?.stop(); } catch { /* already stopped */ }
    this.musicSource = null;
  }
}

export const audio = new AudioManager();
