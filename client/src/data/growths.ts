import type { DB, Growths, Unit } from "../types";
import { GROWTH_STATS } from "../types";

export function growthTotal(g: Growths): number {
  return GROWTH_STATS.reduce((s, k) => s + (g[k] ?? 0), 0);
}

export function growthAvg(g: Growths): number {
  return growthTotal(g) / GROWTH_STATS.length;
}

export function hasGrowths(u: Unit): boolean {
  return !!u.growths && GROWTH_STATS.some((k) => typeof u.growths![k] === "number");
}

export function growthUnits(db: DB): Unit[] {
  return db.units.filter(hasGrowths);
}

// Diverging blue → cream → red heat color for a normalized value t in [0, 1].
export function heatColor(t: number): string {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.5));
  const low = [70, 108, 176];
  const mid = [232, 224, 203];
  const high = [178, 58, 46];
  const lerp = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgb = c < 0.5 ? lerp(low, mid, c / 0.5) : lerp(mid, high, (c - 0.5) / 0.5);
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
