import Phaser from 'phaser';
import { APP_CONFIG } from '../../config/appConfig';
import { THEMES, hexToNumber } from '../../config/theme';
import { GAME_CONFIG, SCENERY_CONFIG, difficultyConfig } from '../config/gameConfig';
import { opaqueBounds } from '../art/assets';
import { Player } from '../entities/Player';
import { DifficultyManager } from '../systems/DifficultyManager';
import { ObstacleManager } from '../systems/ObstacleManager';
import { ScoreManager } from '../systems/ScoreManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { bus } from '../../utils/EventBus';
import { runtimeStats } from '../../utils/runtimeStats';
import { pad6, rand } from '../../utils/math';
import { audio } from '../../audio/AudioManager';

type Mode = 'ATTRACT' | 'READY' | 'RUNNING' | 'DYING' | 'PAUSED';

const MAX_DT = 0.05;
const W = GAME_CONFIG.width;
const GROUND_Y = GAME_CONFIG.groundY;

interface ScrollLayer { sprite: Phaser.GameObjects.TileSprite; factor: number }
interface Scenery { sprite: Phaser.GameObjects.Image; foreground: boolean; active: boolean }

/** Gameplay scene: world scrolling, player, obstacles, scoring. Driven by the controller through the bus. */
export class RunnerScene extends Phaser.Scene {
  private mode: Mode = 'ATTRACT';
  private resumeMode: Mode = 'READY';
  private player!: Player;
  private difficulty = new DifficultyManager();
  private score = new ScoreManager();
  private collisions = new CollisionSystem();
  private obstacles!: ObstacleManager;
  private layers: ScrollLayer[] = [];
  private clouds: Array<{ sprite: Phaser.GameObjects.Image; speed: number }> = [];
  private scenery: Scenery[] = [];
  private nextSceneryIn = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private crash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private best = 0;
  private shownScore = -1;
  private speed = 0;
  private unsubscribe: Array<() => void> = [];

  constructor() { super('Runner'); }

  create(): void {
    const theme = THEMES[APP_CONFIG.theme];
    this.buildWorld(theme.world.background, theme.world.hillTint);

    this.player = new Player(this);
    this.player.onJump = (x, y) => this.dust.explode(7, x - 10, y);
    this.player.onLand = (x, y) => { this.dust.explode(9, x - 10, y); audio.land(); };
    this.obstacles = new ObstacleManager(this, this.difficulty);
    this.buildEffects();

    this.best = runtimeStats.best;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: GAME_CONFIG.fontFamily, fontSize: '44px', color: '#ffffff', stroke: theme.ui.ink, strokeThickness: 8,
    };
    this.scoreText = this.add.text(36, 26, 'SCORE: 000000', style).setDepth(30).setVisible(false);
    this.bestText = this.add.text(W - 36, 26, `BEST: ${pad6(this.best)}`, { ...style, color: theme.ui.accent }).setOrigin(1, 0).setDepth(30).setVisible(false);

    this.unsubscribe = [
      bus.on('scene:attract', () => this.enterAttract()),
      bus.on('scene:prepare', () => this.prepare()),
      bus.on('scene:start', () => this.begin()),
      bus.on('scene:pause', () => this.pause()),
      bus.on('scene:resume', () => this.resume()),
      bus.on('game:best', (b) => { this.best = b; this.bestText.setText(`BEST: ${pad6(b)}`); }),
      bus.on('action', (a) => { if (a === 'JUMP' && this.mode === 'RUNNING' && this.player.jump()) audio.jump(); }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe.forEach((u) => u()));
    this.enterAttract();
  }

  private buildWorld(bgKey: string, hillTint: string): void {
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(W, GAME_CONFIG.height).setDepth(0);

    const bgTex = `bg-${bgKey}`;
    const src = this.textures.get(bgTex).getSourceImage();
    const bgScale = W / src.width;
    const hills = (alpha: number, tint: number | null, factor: number, depth: number, yOffset: number) => {
      const s = this.add.tileSprite(0, GROUND_Y + yOffset, W, src.height * bgScale, bgTex).setOrigin(0, 1).setDepth(depth).setAlpha(alpha);
      s.setTileScale(bgScale, bgScale);
      if (tint !== null) s.setTint(tint);
      this.layers.push({ sprite: s, factor });
    };
    hills(0.4, null, 0.05, 1, 20);
    hills(0.55, hexToNumber(hillTint), 0.14, 2, 40);

    const cloudKeys = ['cloud1', 'cloud2', 'cloud3'];
    for (let i = 0; i < 5; i++) {
      const sprite = this.add.image(i * 280 + rand(0, 120), rand(50, 230), cloudKeys[i % 3]).setScale(rand(0.8, 1.4)).setAlpha(0.95).setDepth(1);
      this.clouds.push({ sprite, speed: rand(8, 22) });
    }

    const ground = this.add.tileSprite(0, GROUND_Y - 4, W, GAME_CONFIG.height - GROUND_Y + 4, 'ground').setOrigin(0, 0).setDepth(4);
    this.layers.push({ sprite: ground, factor: 1 });

    for (let i = 0; i < SCENERY_CONFIG.poolSize; i++) {
      const key = SCENERY_CONFIG.keys[i % SCENERY_CONFIG.keys.length];
      const foreground = i % 4 === 3;
      const b = opaqueBounds(this, key);
      const img = this.add.image(0, 0, key).setOrigin(0.5, 1).setVisible(false).setDepth(foreground ? 15 : 3);
      img.setData('padBottom', img.height - (b.y + b.h));
      this.scenery.push({ sprite: img, foreground, active: false });
    }
  }

  private buildEffects(): void {
    const theme = THEMES[APP_CONFIG.theme];
    this.dust = this.add.particles(0, 0, 'dot', {
      lifespan: 450, speedX: { min: -160, max: 40 }, speedY: { min: -110, max: -10 },
      scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0xf3ead2, emitting: false,
    }).setDepth(9);
    this.sparkle = this.add.particles(0, 0, 'star', {
      lifespan: 520, speed: { min: 120, max: 320 }, scale: { start: 0.55, end: 0 }, rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(11);
    this.crash = this.add.particles(0, 0, 'dot', {
      lifespan: 800, speed: { min: 200, max: 640 }, gravityY: 1200, scale: { start: 1.1, end: 0 },
      tint: [hexToNumber(theme.ui.danger), hexToNumber(theme.ui.accent), 0xffffff], emitting: false,
    }).setDepth(12);
  }

  private scrollWorld(dt: number, speed: number): void {
    for (const l of this.layers) l.sprite.tilePositionX += (speed * l.factor * dt) / l.sprite.tileScaleX;
    for (const c of this.clouds) {
      c.sprite.x -= (c.speed + speed * 0.02) * dt;
      if (c.sprite.x < -180) { c.sprite.x = W + 180; c.sprite.y = rand(50, 230); }
    }
    this.nextSceneryIn -= speed * dt;
    for (const s of this.scenery) {
      if (!s.active) continue;
      s.sprite.x -= speed * dt * (s.foreground ? 1.25 : 1);
      if (s.sprite.x < -150) { s.active = false; s.sprite.setVisible(false); }
    }
    if (this.nextSceneryIn <= 0) this.spawnScenery();
  }

  private spawnScenery(): void {
    this.nextSceneryIn = rand(SCENERY_CONFIG.minSpacing, SCENERY_CONFIG.maxSpacing);
    const s = this.scenery.find((it) => !it.active);
    if (!s) return;
    const pad = (s.sprite.getData('padBottom') as number) ?? 0;
    s.active = true;
    s.sprite.setPosition(W + 100, GROUND_Y + 6 + pad + (s.foreground ? 22 : 0)).setScale(s.foreground ? 1.3 : 1).setVisible(true);
  }

  private enterAttract(): void {
    this.mode = 'ATTRACT';
    this.resetRun();
    this.player.setMode('running');
    this.setHud(false);
  }

  private prepare(): void {
    this.mode = 'READY';
    this.resetRun();
    this.player.setMode('idle');
    this.setHud(true);
  }

  private begin(): void {
    this.mode = 'RUNNING';
    this.player.setMode('running');
    audio.startMusic();
  }

  private pause(): void {
    if (this.mode !== 'RUNNING' && this.mode !== 'READY' && this.mode !== 'DYING') return;
    this.resumeMode = this.mode;
    this.mode = 'PAUSED';
    audio.pauseMusic();
  }

  private resume(): void {
    if (this.mode !== 'PAUSED') return;
    this.mode = this.resumeMode;
    if (this.mode === 'RUNNING') audio.startMusic();
  }

  private resetRun(): void {
    this.difficulty.reset();
    this.score.reset();
    this.obstacles.reset();
    this.player.reset();
    this.speed = difficultyConfig.startingSpeed;
    this.shownScore = -1;
    this.refreshScore();
  }

  private setHud(visible: boolean): void {
    this.scoreText.setVisible(visible);
    this.bestText.setVisible(visible);
  }

  private refreshScore(): void {
    const s = this.score.score;
    if (s !== this.shownScore) { this.shownScore = s; this.scoreText.setText(`SCORE: ${pad6(s)}`); }
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    runtimeStats.fps = Math.round(this.game.loop.actualFps);

    switch (this.mode) {
      case 'ATTRACT':
        this.speed = 300;
        this.scrollWorld(dt, this.speed);
        break;
      case 'RUNNING':
        this.updateRunning(dt);
        break;
      case 'DYING':
        this.player.update(dt);
        break;
      default:
        break;
    }
    runtimeStats.gameSpeed = this.mode === 'RUNNING' ? Math.round(this.speed) : 0;
  }

  private updateRunning(dt: number): void {
    this.difficulty.update(dt);
    this.speed = this.difficulty.speed;
    this.scrollWorld(dt, this.speed);
    this.score.addDistance(this.speed * dt);
    this.player.update(dt);
    this.obstacles.update(dt, this.speed);

    const box = this.player.hitbox;
    const coin = this.collisions.firstHit(box, this.obstacles.coins);
    if (coin) {
      coin.despawn();
      this.score.addCoin();
      this.sparkle.explode(8, coin.sprite.x, coin.sprite.y);
      audio.coin();
    }
    if (this.collisions.firstHit(box, this.obstacles.obstacles)) { this.die(); return; }
    this.refreshScore();
  }

  private die(): void {
    this.mode = 'DYING';
    this.player.die();
    audio.stopMusic();
    audio.hit();
    this.crash.explode(26, this.player.x, this.player.feetY - 40);
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(140, 255, 255, 255);
    this.time.delayedCall(900, () => {
      audio.gameOver();
      bus.emit('game:over', { score: this.score.score, distance: this.score.meters, coins: this.score.coins });
    });
  }
}
