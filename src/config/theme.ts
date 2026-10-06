export type ThemeName = 'meadow' | 'desert' | 'castle' | 'shroom';

export type BackgroundKey = 'grasslands' | 'desert' | 'castle' | 'shroom';
export type GroundKey = 'grass' | 'dirt' | 'castle';

export interface Theme {
  world: {
    background: BackgroundKey;
    ground: GroundKey;
    /** Vertical sky gradient behind the background art (top, bottom). */
    skyTop: string;
    skyBottom: string;
    /** Tint for the nearer parallax hills. */
    hillTint: string;
  };
  ui: {
    primary: string;
    accent: string;
    danger: string;
    ink: string;
    panel: string;
    text: string;
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  meadow: {
    world: { background: 'grasslands', ground: 'grass', skyTop: '#4fb6ff', skyBottom: '#c9f0ff', hillTint: '#8fd9a0' },
    ui: { primary: '#2fc4a0', accent: '#ffc928', danger: '#ff5a5f', ink: '#16324f', panel: 'rgba(14, 38, 66, 0.72)', text: '#ffffff' },
  },
  desert: {
    world: { background: 'desert', ground: 'dirt', skyTop: '#ff9f68', skyBottom: '#ffe3b0', hillTint: '#f2b673' },
    ui: { primary: '#ff8a3d', accent: '#ffe066', danger: '#e63946', ink: '#4a2511', panel: 'rgba(70, 30, 10, 0.72)', text: '#ffffff' },
  },
  castle: {
    world: { background: 'castle', ground: 'castle', skyTop: '#46407a', skyBottom: '#c9b8e8', hillTint: '#8c82b8' },
    ui: { primary: '#9d7bff', accent: '#ffd166', danger: '#ff5d73', ink: '#20183f', panel: 'rgba(24, 16, 54, 0.75)', text: '#ffffff' },
  },
  shroom: {
    world: { background: 'shroom', ground: 'grass', skyTop: '#7a5cff', skyBottom: '#ffc4e8', hillTint: '#d9a0e8' },
    ui: { primary: '#ff6fb5', accent: '#fff07a', danger: '#ff4d6d', ink: '#2d1346', panel: 'rgba(40, 14, 62, 0.74)', text: '#ffffff' },
  },
};

export function hexToNumber(color: string): number {
  return parseInt(color.replace('#', ''), 16);
}
