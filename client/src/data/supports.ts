import type { DB } from "../types";

export function supportAdjacency(db: DB): Map<string, { id: string; rank: string }[]> {
  const adj = new Map<string, { id: string; rank: string }[]>();
  const add = (a: string, b: string, rank: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ id: b, rank });
  };
  for (const e of db.supports ?? []) {
    add(e.a, e.b, e.rank);
    add(e.b, e.a, e.rank);
  }
  return adj;
}

export function unitsWithSupports(db: DB): Set<string> {
  const s = new Set<string>();
  for (const e of db.supports ?? []) { s.add(e.a); s.add(e.b); }
  return s;
}

export const RANK_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
export const RANK_COLOR: Record<string, string> = { S: "#e6c15a", A: "#d8b46a", B: "#9fb2c7", C: "#c08a5a" };
