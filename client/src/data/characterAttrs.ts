import type { CharacterPageConfig, DB } from "../types";

// Structural attributes (name & portrait are always shown, so not listed here).
export const BUILTIN_ATTRS: { id: string; label: string }[] = [
  { id: "class", label: "Class" },
  { id: "routes", label: "Routes" },
  { id: "proficiencies", label: "Boons / Banes / Skills" },
  { id: "personalSkill", label: "Personal Skill" },
];

// Every attribute the Characters page can display, in a sensible display order.
export function availableAttrs(db: DB): { id: string; label: string }[] {
  return [...db.fieldDefs.map((f) => ({ id: "field:" + f.key, label: f.label })), ...BUILTIN_ATTRS];
}

export const DEFAULT_CHAR_PAGE: CharacterPageConfig = {
  preview: ["field:faction", "class"],
  detail: ["field:faction", "class", "routes", "personalSkill", "proficiencies", "field:backstory"],
};

export function charPageConfig(db: DB): CharacterPageConfig {
  return db.characterPage ?? DEFAULT_CHAR_PAGE;
}
