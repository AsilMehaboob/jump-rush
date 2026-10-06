import type { Box } from '../entities/Player';

export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Pure AABB queries; the scene decides what a hit means. */
export class CollisionSystem {
  firstHit<T extends { active: boolean; hitbox: Box }>(player: Box, items: readonly T[]): T | null {
    for (const it of items) if (it.active && overlaps(player, it.hitbox)) return it;
    return null;
  }
}
