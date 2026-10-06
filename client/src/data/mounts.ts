import type { DB, Growths, Mount } from "../types";
import { GROWTH_LABELS, GROWTH_STATS } from "../types";
import { isNum } from "./recruitment";

// Canonical display order for mount types across every page and list.
export const MOUNT_TYPE_ORDER = ["Ornius", "Horse", "Pegasus", "Bau", "Elephant"];

export const DEFAULT_MOUNT_COLORS: Record<string, string> = {
  Ornius: "#5bbf7a",
  Horse: "#c9a961",
  Pegasus: "#5b9bd8",
  Bau: "#9b7bd8",
  Elephant: "#d8674f",
};

export function mountColor(db: DB, type: string): string {
  return db.mountTypeColors?.[type] ?? DEFAULT_MOUNT_COLORS[type] ?? "var(--gold)";
}

// Distinct mount types, sorted by the canonical order above. Any type not in
// that list falls to the end, alphabetically.
export function mountTypeOrder(db: DB): string[] {
  const seen: string[] = [];
  for (const m of db.mounts ?? []) if (!seen.includes(m.type)) seen.push(m.type);
  const rank = (t: string) => { const i = MOUNT_TYPE_ORDER.indexOf(t); return i < 0 ? 99 : i; };
  return seen.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
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
