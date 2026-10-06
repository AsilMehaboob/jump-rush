import Phaser from 'phaser';

/**
 * Asset manifest: every game image lives under public/assets and is listed here,
 * so swapping art only means replacing a file or editing one path.
 * Sources and licences are recorded in ASSET_LICENSES.md.
 */
const base = 'assets';

export const IMAGE_ASSETS: Record<string, string> = {
  // Player (Kenney Platformer Art Deluxe, CC0)
  'player-stand': `${base}/sprites/player_stand.png`,
  'player-walk1': `${base}/sprites/player_walk1.png`,
  'player-walk2': `${base}/sprites/player_walk2.png`,
  'player-jump': `${base}/sprites/player_jump.png`,
  'player-hurt': `${base}/sprites/player_hurt.png`,
  // Obstacles
  rock: `${base}/sprites/rock.png`,
  cactus: `${base}/sprites/cactus.png`,
  spikes: `${base}/sprites/spikes.png`,
  slimeWalk1: `${base}/sprites/slimeWalk1.png`,
  slimeWalk2: `${base}/sprites/slimeWalk2.png`,
  flyFly1: `${base}/sprites/flyFly1.png`,
  flyFly2: `${base}/sprites/flyFly2.png`,
  // Collectibles & effects
  coin: `${base}/sprites/coinGold.png`,
  star: `${base}/sprites/star.png`,
  // Environment
  bush: `${base}/sprites/bush.png`,
  plant: `${base}/sprites/plant.png`,
  mushroomRed: `${base}/sprites/mushroomRed.png`,
  cloud1: `${base}/sprites/cloud1.png`,
  cloud2: `${base}/sprites/cloud2.png`,
  cloud3: `${base}/sprites/cloud3.png`,
  'tile-grass-top': `${base}/sprites/tile_grassMid.png`,
  'tile-grass-fill': `${base}/sprites/tile_grassCenter.png`,
  'tile-dirt-top': `${base}/sprites/tile_dirtMid.png`,
  'tile-dirt-fill': `${base}/sprites/tile_dirtCenter.png`,
  'tile-castle-top': `${base}/sprites/tile_castleMid.png`,
  'tile-castle-fill': `${base}/sprites/tile_castleCenter.png`,
  'bg-grasslands': `${base}/backgrounds/bg_grasslands.png`,
  'bg-desert': `${base}/backgrounds/bg_desert.png`,
  'bg-castle': `${base}/backgrounds/bg_castle.png`,
  'bg-shroom': `${base}/backgrounds/bg_shroom.png`,
};

export function queueImages(scene: Phaser.Scene): void {
  for (const [key, path] of Object.entries(IMAGE_ASSETS)) scene.load.image(key, path);
}

export interface Bounds { x: number; y: number; w: number; h: number }

const boundsCache = new Map<string, Bounds>();

/** Opaque pixel bounds of a texture, so hit boxes and ground contact ignore transparent padding. */
export function opaqueBounds(scene: Phaser.Scene, key: string): Bounds {
  const cached = boundsCache.get(key);
  if (cached) return cached;
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  let b: Bounds = { x: 0, y: 0, w: img.width, h: img.height };
  if (ctx) {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX >= 0) b = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
  boundsCache.set(key, b);
  return b;
}
