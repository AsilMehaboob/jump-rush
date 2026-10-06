export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const pad6 = (n: number): string => Math.floor(n).toString().padStart(6, '0');
