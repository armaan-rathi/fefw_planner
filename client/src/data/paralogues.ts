import type { DB, Paralogue } from "../types";

// Lords use their route colours; sublords get distinct defaults; Anna is white.
export const DEFAULT_PARALOGUE_COLORS: Record<string, string> = {
  Cai: "#3f72c7",
  Dietrich: "#7d5fb0",
  Theodora: "#b8932f",
  Leda: "#c13a6a",
  Bertrand: "#dd8a3c",
  Talimun: "#35a8a0",
  Orchel: "#4faf5a",
  Anatolia: "#8a97a8",
  Anna: "#e6e6e6",
};

export function paralogueColor(db: DB, p: Paralogue): string {
  return p.color ?? db.paralogueColors?.[p.name] ?? DEFAULT_PARALOGUE_COLORS[p.name] ?? "#8892a6";
}

// Ordinal day count relative to Sept 1 (= 0). Supports Aug..Dec for padding.
const CUM: Record<number, number> = { 8: -31, 9: 0, 10: 30, 11: 61, 12: 91 };
export function toOrd(md: string): number | null {
  const m = md.trim().match(/^(\d{1,2})\/(\d{1,2})/); // trailing "*" etc. ignored
  if (!m) return null;
  const mo = +m[1];
  if (!(mo in CUM)) return null;
  return CUM[mo] + (+m[2] - 1);
}
export function ordToMD(ord: number): { m: number; d: number } {
  const months = [8, 9, 10, 11, 12];
  for (let i = months.length - 1; i >= 0; i--) {
    if (ord >= CUM[months[i]]) return { m: months[i], d: ord - CUM[months[i]] + 1 };
  }
  return { m: 9, d: ord + 1 };
}
// 9/17 is a Monday (ordinal 16). 0 = Monday … 6 = Sunday.
export function weekdayMon(ord: number): number {
  return (((ord - 16) % 7) + 7) % 7;
}

export interface PEvent { name: string; color: string; start: number; end: number; lane: number; }

export function routeEvents(db: DB, routeId: string): Omit<PEvent, "lane">[] {
  const out: Omit<PEvent, "lane">[] = [];
  for (const p of db.paralogues ?? []) {
    for (const w of p.windows?.[routeId] ?? []) {
      const s = toOrd(w.start);
      const e = toOrd(w.end);
      if (s == null && e == null) continue;
      const a = s ?? e!;
      const b = e ?? s!;
      out.push({ name: p.name, color: paralogueColor(db, p), start: Math.min(a, b), end: Math.max(a, b) });
    }
  }
  return out;
}

// Greedy lane packing so overlapping spans stack instead of colliding.
export function assignLanes(events: Omit<PEvent, "lane">[]): PEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  return sorted.map((ev) => {
    let lane = laneEnds.findIndex((end) => end < ev.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(ev.end); }
    else laneEnds[lane] = ev.end;
    return { ...ev, lane };
  });
}

// Min/max ordinal across every route, so the grid stays fixed when toggling.
export function globalRange(db: DB): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of db.paralogues ?? []) {
    for (const routeId of Object.keys(p.windows ?? {})) {
      for (const w of p.windows[routeId]) {
        const s = toOrd(w.start);
        const e = toOrd(w.end);
        [s, e].forEach((v) => { if (v != null) { min = Math.min(min, v); max = Math.max(max, v); } });
      }
    }
  }
  if (!isFinite(min)) return { min: 0, max: 6 };
  return { min, max };
}
