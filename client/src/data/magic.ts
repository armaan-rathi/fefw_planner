import type { CombatArt, DB, Skill, Spell } from "../types";

// Skill categories that map onto a proficiency (skillType id) for learnsets.
export const PROF_TO_CATEGORY: Record<string, string> = {
  authority: "Authority", armor: "Armor", riding: "Riding", flying: "Flying", infantry: "Infantry",
};
const CATEGORY_TO_PROF: Record<string, string> = Object.fromEntries(
  Object.entries(PROF_TO_CATEGORY).map(([p, c]) => [c, p]),
);

// Catalog skills whose category maps to this proficiency (e.g. authority).
export function skillsForProf(db: DB, profId: string): Skill[] {
  const cat = PROF_TO_CATEGORY[profId];
  return cat ? (db.skills ?? []).filter((s) => s.type === cat) : [];
}

// Spells belonging to one proficiency (skillType id), in catalog order.
export function spellsFor(db: DB, profId: string): Spell[] {
  return (db.spells ?? []).filter((s) => s.proficiency === profId);
}

export function spellMap(db: DB): Map<string, Spell> {
  return new Map((db.spells ?? []).map((s) => [s.id, s]));
}

// Combat arts belonging to one weapon proficiency, in catalog order.
export function combatArtsFor(db: DB, profId: string): CombatArt[] {
  return (db.combatArts ?? []).filter((a) => a.proficiency === profId);
}

export function combatArtMap(db: DB): Map<string, CombatArt> {
  return new Map((db.combatArts ?? []).map((a) => [a.id, a]));
}

// Proficiencies that have at least one spell, ordered by the skillTypes list.
export function spellProficiencies(db: DB): string[] {
  const present = new Set((db.spells ?? []).map((s) => s.proficiency));
  return db.skillTypes.filter((s) => present.has(s.id)).map((s) => s.id);
}

// Proficiencies that have spells, combat arts, or mapped catalog skills.
export function learnsetProficiencies(db: DB): string[] {
  const present = new Set([
    ...(db.spells ?? []).map((s) => s.proficiency),
    ...(db.combatArts ?? []).map((a) => a.proficiency),
  ]);
  for (const s of db.skills ?? []) { const p = CATEGORY_TO_PROF[s.type]; if (p) present.add(p); }
  return db.skillTypes.filter((s) => present.has(s.id)).map((s) => s.id);
}

// All selectable learnset entries for a proficiency: spells + combat arts +
// mapped skills (each skill expanded into base / "+" / "++" variants).
export function learnsetEntries(db: DB, profId: string): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const s of spellsFor(db, profId)) out.push({ id: s.id, name: s.name });
  for (const a of combatArtsFor(db, profId)) out.push({ id: a.id, name: a.name });
  for (const s of skillsForProf(db, profId)) {
    out.push({ id: s.id, name: s.name });
    if (s.plus) out.push({ id: s.id + "+", name: s.plus.name });
    if (s.plusPlus) out.push({ id: s.id + "++", name: s.plusPlus.name });
  }
  return out;
}

// A unit's learned spell ids for one proficiency + rank.
export function learned(unit: { learnsets?: Record<string, Record<string, string[]>> }, profId: string, rank: string): string[] {
  return unit.learnsets?.[profId]?.[rank] ?? [];
}
