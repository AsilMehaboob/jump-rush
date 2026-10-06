import { useEffect, useRef } from 'react';
import { createGame } from '../game/Game';

/** Mounts the Phaser game once. React never re-renders per frame. */
export function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const game = createGame(host.current as HTMLElement);
    return () => game.destroy(true);
  }, []);

  return <div className="game-host" ref={host} />;
}
