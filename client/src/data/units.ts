import type { Unit } from "../types";

// Faction is now a custom dropdown field (key "faction"); read it for display.
export function unitFaction(unit: Unit): string {
  const v = unit.fields?.faction;
  return typeof v === "string" ? v : "";
}

// Lords sort to the front of a route's roster.
export function lordFirst(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => Number(b.isLord) - Number(a.isLord));
}

// Units available on a route: locked to it, or unlocked (recruitable everywhere).
export function unitsForRoute(units: Unit[], routeId: string): Unit[] {
  return units.filter((u) => u.routeIds.length === 0 || u.routeIds.includes(routeId));
}
