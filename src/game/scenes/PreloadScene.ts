import Phaser from 'phaser';
import { APP_CONFIG } from '../../config/appConfig';
import { THEMES } from '../../config/theme';
import { GAME_CONFIG } from '../config/gameConfig';
import { queueImages } from '../art/assets';

/** Loads the bundled art, then derives the composed textures (ground, sky, particles) and animations. */
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload(): void {
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear().fillStyle(0x16324f, 1).fillRect(width / 2 - 200, height / 2 - 8, 400, 16)
        .fillStyle(0xffc928, 1).fillRect(width / 2 - 200, height / 2 - 8, 400 * p, 16);
    });
    queueImages(this);
  }

  create(): void {
    const theme = THEMES[APP_CONFIG.theme];
    this.buildGround(theme.world.ground);
    this.buildSky(theme.world.skyTop, theme.world.skyBottom);
    this.buildParticles();
    this.buildAnimations();
    this.scene.start('Runner');
  }

  private buildGround(kind: string): void {
    const top = this.textures.get(`tile-${kind}-top`).getSourceImage() as HTMLImageElement;
    const fill = this.textures.get(`tile-${kind}-fill`).getSourceImage() as HTMLImageElement;
    const tex = this.textures.createCanvas('ground', top.width, top.height * 2);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.drawImage(top, 0, 0);
    ctx.drawImage(fill, 0, top.height);
    tex.refresh();
  }

  private buildSky(top: string, bottom: string): void {
    const tex = this.textures.createCanvas('sky', 4, GAME_CONFIG.height);
    if (!tex) return;
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.groundY);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, GAME_CONFIG.height);
    tex.refresh();
  }

  private buildParticles(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture('dot', 16, 16);
    g.destroy();
  }

  private buildAnimations(): void {
    const frames = (...keys: string[]) => keys.map((key) => ({ key }));
    this.anims.create({ key: 'player-run', frames: frames('player-walk1', 'player-walk2'), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'slime-move', frames: frames('slimeWalk1', 'slimeWalk2'), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'fly-flap', frames: frames('flyFly1', 'flyFly2'), frameRate: 10, repeat: -1 });
  }
}
