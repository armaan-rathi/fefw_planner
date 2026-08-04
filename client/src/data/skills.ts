import type { SkillType } from "../types";

// Sort a set of skill ids into the canonical skillTypes order, so proficiencies
// always display in a consistent order rather than the order they were added.
export function sortBySkillOrder(ids: string[], skillTypes: SkillType[]): string[] {
  const order = new Map(skillTypes.map((s, i) => [s.id, i]));
  return [...ids].sort((a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER));
}
