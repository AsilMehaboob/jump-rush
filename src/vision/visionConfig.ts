export const VISION_CONFIG = {
  modelPath: 'models/pose_landmarker.task',
  wasmPath: 'mediapipe/wasm',
  targetFps: 30,
  minPoseConfidence: 0.5,
  /** Core landmarks (shoulders+hips) needed for the player to count as detected. */
  coreVisibility: 0.5,
  /** Knees+ankles needed for a "full body" (required for calibration). */
  limbVisibility: 0.4,
  calibration: {
    framesRequired: 24,
    /** Max std-dev of torso-centre y (in torso lengths) for the pose to count as standing still. */
    maxStdDev: 0.05,
  },
  jump: {
    /** Rise above baseline, in torso lengths, to register take-off (floor; raised by measured noise). */
    takeoffThreshold: 0.15,
    maxTakeoffThreshold: 0.3,
    noiseMultiplier: 6,
    /** Upward speed (torso lengths / second) required with the rise. */
    minTakeoffVelocity: 0.6,
    /** Hysteresis: landing is detected below this fraction of the take-off threshold. */
    landFraction: 0.5,
    landedBand: 0.08,
    smoothing: 0.55,
    minAirborneMs: 140,
    maxAirborneMs: 1400,
    landingTimeoutMs: 450,
    minJumpIntervalMs: 550,
    /** Tracking lost for this long resets the detector. */
    lostResetMs: 500,
    baselineDrift: 0.01,
  },
  /** Player not detected for this long during play pauses the game. */
  lostPauseMs: 700,
  /** Player must be seen continuously this long before an auto-resume. */
  foundResumeMs: 1000,
} as const;
