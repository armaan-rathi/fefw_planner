import type { DB, Growths, Mount } from "../types";
import { GROWTH_LABELS, GROWTH_STATS } from "../types";
import { isNum } from "./recruitment";

export const DEFAULT_MOUNT_COLORS: Record<string, string> = {
  Horse: "#c9a961",
  Ornius: "#5bbf7a",
  Pegasus: "#5b9bd8",
  Bau: "#9b7bd8",
  Elephant: "#d8674f",
};

export function mountColor(db: DB, type: string): string {
  return db.mountTypeColors?.[type] ?? DEFAULT_MOUNT_COLORS[type] ?? "var(--gold)";
}

// Distinct mount types in first-appearance order.
export function mountTypeOrder(db: DB): string[] {
  const seen: string[] = [];
  for (const m of db.mounts ?? []) if (!seen.includes(m.type)) seen.push(m.type);
  return seen;
}

export function mountsByType(db: DB): { type: string; mounts: Mount[] }[] {
  return mountTypeOrder(db).map((type) => ({ type, mounts: (db.mounts ?? []).filter((m) => m.type === type) }));
}

// Signed stat/growth pairs, e.g. { label: "Dex", value: "+3" } or "+5%".
export function statPairs(g: Growths | undefined, percent: boolean): { label: string; value: string }[] {
  if (!g) return [];
  return GROWTH_STATS.filter((k) => isNum(g[k])).map((k) => ({
    label: GROWTH_LABELS[k],
    value: `${g[k]! > 0 ? "+" : ""}${g[k]}${percent ? "%" : ""}`,
  }));
}
