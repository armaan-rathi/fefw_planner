import type { DB, FieldDef, OptionsSource } from "../types";

export const OPTION_SOURCES: { value: OptionsSource; label: string }[] = [
  { value: "classes", label: "Classes" },
  { value: "routes", label: "Routes" },
  { value: "units", label: "Units" },
  { value: "skillTypes", label: "Skill Types" },
];

export const sourceLabel = (s: OptionsSource): string =>
  OPTION_SOURCES.find((o) => o.value === s)?.label ?? s;

// Options for a dropdown field: from a live entity list, or its static list.
// Entity-sourced options use the entity id as the value and its name as label.
export function fieldOptions(db: DB, f: FieldDef): { value: string; label: string }[] {
  if (f.optionsSource) {
    const list = ((db as any)[f.optionsSource] as any[]) || [];
    return list.map((e) => ({ value: e.id, label: e.name || e.label || e.id }));
  }
  return (f.options ?? []).map((o) => ({ value: o, label: o }));
}

// Human-readable value for display (resolves entity ids to names).
export function fieldDisplay(db: DB, f: FieldDef, value: unknown): string {
  if (value == null || value === "") return "";
  if (f.type === "checkbox") return value ? "Yes" : "No";
  const opts = f.optionsSource || f.options ? fieldOptions(db, f) : null;
  const label = (v: unknown) => opts?.find((o) => o.value === v)?.label ?? String(v);
  if (Array.isArray(value)) return value.map(label).join(", ");
  return label(value);
}
