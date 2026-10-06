import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RunnerScene } from './scenes/RunnerScene';

/** Creates the Phaser game: a 1280x720 logical canvas scaled smoothly to the window (16:9, letterboxed). */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    backgroundColor: '#4fb6ff',
    antialias: true,
    fps: { target: 60 },
    render: { powerPreference: 'high-performance' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloadScene, RunnerScene],
  });
}
