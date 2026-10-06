import { useEffect, useRef } from 'react';
import { controller } from '../app/GameController';
import { runtimeStats } from '../utils/runtimeStats';

/** Updates a <pre> directly four times a second; never triggers React renders. */
export function DebugOverlay() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const m = controller.lastMetrics;
      const j = controller.jump;
      const b = j.baseline;
      const lines = [
        `FPS: ${runtimeStats.fps}`,
        `POSE FPS: ${runtimeStats.poseFps}`,
        '',
        `PLAYER: ${m?.detected ? 'DETECTED' : 'NOT DETECTED'}${m?.fullBody ? ' (FULL BODY)' : ''}`,
        `CONFIDENCE: ${(m?.confidence ?? 0).toFixed(2)}`,
        '',
        `STATE: ${j.state}`,
        `ACTION: ${controller.lastAction}`,
        `RISE: ${j.rise.toFixed(2)}  VEL: ${j.velocity.toFixed(2)}`,
        `BASELINE: ${b ? `${b.centerY.toFixed(3)} / ${b.torsoLength.toFixed(3)}` : 'none'}`,
        `GAME SPEED: ${runtimeStats.gameSpeed}`,
        `APP: ${controller.machine.state}`,
      ];
      if (ref.current) ref.current.textContent = lines.join('\n');
    }, 250);
    return () => clearInterval(id);
  }, []);

  return <pre className="debug" ref={ref} />;
}
