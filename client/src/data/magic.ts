import type { DB, Spell } from "../types";

// Spells belonging to one proficiency (skillType id), in catalog order.
export function spellsFor(db: DB, profId: string): Spell[] {
  return (db.spells ?? []).filter((s) => s.proficiency === profId);
}

export function spellMap(db: DB): Map<string, Spell> {
  return new Map((db.spells ?? []).map((s) => [s.id, s]));
}

// Proficiencies that have at least one spell, ordered by the skillTypes list.
export function spellProficiencies(db: DB): string[] {
  const present = new Set((db.spells ?? []).map((s) => s.proficiency));
  return db.skillTypes.filter((s) => present.has(s.id)).map((s) => s.id);
}

// A unit's learned spell ids for one proficiency + rank.
export function learned(unit: { learnsets?: Record<string, Record<string, string[]>> }, profId: string, rank: string): string[] {
  return unit.learnsets?.[profId]?.[rank] ?? [];
}
