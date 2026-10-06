import type { ThemeName } from './theme';

/** Single place to rename the game, change the look, or toggle presentation features. */
export const APP_CONFIG = {
  title: 'HUMAN RUNNER',
  /** meadow | desert | castle | shroom */
  theme: 'meadow' as ThemeName,
  /** Optional retro scanline/vignette overlay (off by default). */
  crtEffect: false,
  /** Developer keyboard controls (SPACE jump, ESC pause, R restart). */
  keyboardFallback: true,
  debug: {
    /** Overlay with FPS / pose / jump state. Off in packaged arcade builds. */
    enabled: import.meta.env.DEV,
    /** Allow F3 to toggle the overlay at runtime. */
    hotkey: true,
  },
  camera: { width: 640, height: 480, frameRate: 30 },
  audio: { masterVolume: 0.7, musicVolume: 0.3 },
  /** Delay before a freshly-dead player can restart with a jump, so a late landing jump is not misread. */
  restartLockoutMs: 1800,
} as const;
