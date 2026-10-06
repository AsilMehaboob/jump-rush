import { useEffect, useRef } from 'react';
import { controller } from '../app/GameController';
import { LM } from '../vision/types';

const CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];
const POINTS = [LM.nose, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle];

/** Mirrored webcam preview. Landmarks are drawn straight to a canvas (no React state per frame). */
export function CameraPreview({ large, debug }: { large: boolean; debug: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const v = video.current;
    if (v && v.srcObject !== controller.camera.stream) { v.srcObject = controller.camera.stream; void v.play().catch(() => undefined); }
  });

  useEffect(() => {
    return controller.pose.onFrame((m, lm) => {
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      if (!lm) return;
      const px = (i: number): [number, number] => [(1 - lm[i].x) * c.width, lm[i].y * c.height]; // mirrored like the video
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      for (const [a, b] of CONNECTIONS) { ctx.beginPath(); ctx.moveTo(...px(a)); ctx.lineTo(...px(b)); ctx.stroke(); }
      ctx.fillStyle = m.detected ? '#3bff7a' : '#ff3355';
      for (const i of POINTS) { const [x, y] = px(i); ctx.fillRect(x - 3, y - 3, 6, 6); }
      if (debug && m.box) {
        ctx.strokeStyle = '#ffe600';
        ctx.strokeRect((1 - m.box.x - m.box.w) * c.width, m.box.y * c.height, m.box.w * c.width, m.box.h * c.height);
      }
    });
  }, [debug]);

  return (
    <div className={`preview ${large ? 'preview-large' : ''}`}>
      <video ref={video} muted playsInline />
      <canvas ref={canvas} width={320} height={240} />
    </div>
  );
}
