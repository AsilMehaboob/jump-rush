import Phaser from 'phaser';

/** Minimal first scene: applies global scene settings then hands over to preloading. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    this.scene.start('Preload');
  }
}
