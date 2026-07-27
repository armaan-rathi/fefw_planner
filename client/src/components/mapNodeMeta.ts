import type { CSSProperties } from "react";

// Per-type color + label for overworld map markers. Icons live in mapIcons.tsx.
const META: Record<string, { color: string; label: string }> = {
  objective: { color: "#f0c850", label: "Objective" },
  junction: { color: "#e8e0cc", label: "Junction" },
  battle: { color: "#e0784b", label: "Battle" },
  supply: { color: "#c79a5b", label: "Supply" },
  merchant: { color: "#5fa8e8", label: "Merchant" },
  treasure: { color: "#b07fd0", label: "Treasure" },
  gate: { color: "#d8b66a", label: "Gate" },
  fort: { color: "#9fb8c4", label: "Fort" },
  blocked: { color: "#e0564b", label: "Blocked" },
};

export function typeColor(type: string): string | null {
  return META[type?.toLowerCase()]?.color ?? null;
}

export function typeLabel(type: string): string {
  return META[type?.toLowerCase()]?.label ?? "Junction";
}

// Inline style for a base (not in-route) pin, tinted by type.
export function pinStyle(type: string): CSSProperties | undefined {
  const c = typeColor(type);
  if (!c) return undefined;
  return {
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${c} 60%, white), ${c})`,
    boxShadow: `0 0 0 1px ${c}, 0 2px 6px rgba(0,0,0,0.55)`,
    color: "#161008",
  };
}

export const NODE_TYPES = [
  "junction",
  "objective",
  "battle",
  "supply",
  "merchant",
  "treasure",
  "gate",
  "fort",
  "blocked",
];

// Distinct types present, for the legend.
export function legendFor(types: string[]): { type: string; color: string; label: string }[] {
  const seen = new Set(types.map((t) => (t || "junction").toLowerCase()));
  return NODE_TYPES.filter((t) => seen.has(t)).map((t) => ({ type: t, color: META[t].color, label: META[t].label }));
}
