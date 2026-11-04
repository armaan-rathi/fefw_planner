import type { DB, Growths, Unit } from "../types";
import { GROWTH_STATS } from "../types";

export function growthTotal(g: Growths): number {
  return GROWTH_STATS.reduce((s, k) => s + (g[k] ?? 0), 0);
}

export function growthAvg(g: Growths): number {
  return growthTotal(g) / GROWTH_STATS.length;
}

// Unit growths + class mods + mount bonuses (mount doubled for Charioteer).
export function consolidatedGrowths(
  unitG: Growths | undefined,
  classG: Growths | undefined,
  mountG: Growths | undefined,
  doubleMount: boolean,
): Growths {
  const out: Growths = {};
  for (const k of GROWTH_STATS) {
    out[k] = (unitG?.[k] ?? 0) + (classG?.[k] ?? 0) + (mountG?.[k] ?? 0) * (doubleMount ? 2 : 1);
  }
  return out;
}

export function hasGrowths(u: Unit): boolean {
  return !!u.growths && GROWTH_STATS.some((k) => typeof u.growths![k] === "number");
}

export function growthUnits(db: DB): Unit[] {
  return db.units.filter(hasGrowths);
}

// Min/max of every unit's growth-stat values — a stable range for heat-coloring
// a single character's growths consistently with the Growth Rates page.
export function growthStatRange(db: DB): { min: number; max: number } {
  const vals: number[] = [];
  for (const u of db.units) {
    const g = u.growths;
    if (!g) continue;
    for (const k of GROWTH_STATS) {
      const v = g[k];
      if (typeof v === "number") vals.push(v);
    }
  }
  return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 1 };
}

// Dark-mode diverging heat: deep blue → dark neutral → deep red, for t in [0,1].
// Tuned to sit on the site's dark panels with light text on top.
export function heatColor(t: number): string {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.5));
  const low = [34, 66, 102];   // deep slate blue (low)
  const mid = [46, 52, 56];    // dark neutral (mid, near panel)
  const high = [132, 100, 36]; // deep gold (high)
  const lerp = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgb = c < 0.5 ? lerp(low, mid, c / 0.5) : lerp(mid, high, (c - 0.5) / 0.5);
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
