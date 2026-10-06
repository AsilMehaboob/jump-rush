import { VISION_CONFIG as C } from './visionConfig';
import { LM, type BodyMetrics, type Landmark } from './types';

const vis = (l: Landmark | undefined): number => l?.visibility ?? 0;

export function computeBodyMetrics(lm: Landmark[] | null, time: number): BodyMetrics {
  const none: BodyMetrics = { time, detected: false, fullBody: false, confidence: 0, centerY: 0, torsoLength: 0, box: null };
  if (!lm || lm.length < 29) return none;

  const core = [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip].map((i) => lm[i]);
  const limbs = [LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle].map((i) => lm[i]);
  const coreVis = core.reduce((s, l) => s + vis(l), 0) / core.length;
  const limbVis = limbs.reduce((s, l) => s + vis(l), 0) / limbs.length;
  const detected = coreVis >= C.coreVisibility && core.every((l) => vis(l) > 0.3);

  const shoulderY = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2;
  const hipY = (lm[LM.lHip].y + lm[LM.rHip].y) / 2;
  const torsoLength = Math.abs(hipY - shoulderY);
  const inFrame = limbs.every((l) => l.y < 1.02 && l.y > -0.02);
  const fullBody = detected && limbVis >= C.limbVisibility && inFrame && torsoLength > 0.05;

  const pts = [lm[LM.nose], ...core, ...limbs];
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  return {
    time, detected: detected && torsoLength > 0.03, fullBody,
    confidence: (coreVis * 4 + limbVis * 4 + vis(lm[LM.nose])) / 9,
    centerY: (shoulderY + hipY) / 2, torsoLength,
    box: { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY },
  };
}
