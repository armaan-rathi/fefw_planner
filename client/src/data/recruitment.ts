import type { DB, RecruitCondition, Unit } from "../types";

export const isNum = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

// A condition counts as "filled" if any of its fields has a value.
export function condFilled(c?: RecruitCondition): boolean {
  return !!c && (isNum(c.support) || isNum(c.renown) || !!c.negotiation || !!c.paralogue || !!c.requirement || !!c.extra);
}

// A unit is recruitable if it has a filled condition on at least one route.
export function isRecruitable(db: DB, unit: Unit): boolean {
  return db.routes.some((r) => condFilled(unit.recruitment?.[r.id]));
}

// Recruitable units, ordered by db.recruitmentOrder, then their unit order.
export function recruitableUnits(db: DB): Unit[] {
  const idx = new Map((db.recruitmentOrder ?? []).map((id, i) => [id, i]));
  const pos = new Map(db.units.map((u, i) => [u.id, i]));
  return db.units
    .filter((u) => isRecruitable(db, u))
    .sort((a, b) => (idx.get(a.id) ?? Infinity) - (idx.get(b.id) ?? Infinity) || (pos.get(a.id)! - pos.get(b.id)!));
}

// Compact "Support Lv. X" style tags (excludes the free-text misc field).
export function condTags(c: RecruitCondition): string[] {
  const t: string[] = [];
  if (isNum(c.support)) t.push(`Support Lv. ${c.support}`);
  if (isNum(c.renown)) t.push(`Renown Lv. ${c.renown}`);
  if (c.negotiation) t.push(`Negotiation: ${c.negotiation}`);
  return t;
}
