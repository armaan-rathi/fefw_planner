// ---- Shared data model (mirrors server/data/db.json) -----------------------

export type Grade = "S+" | "S" | "A" | "B" | "C" | "D" | "E";
export const GRADES: Grade[] = ["S+", "S", "A", "B", "C", "D", "E"];

export interface SkillType {
  id: string;
  label: string;
  icon: string; // built-in icon key (fallback), see components/icons.tsx
  iconImage?: string | null; // optional uploaded icon image; overrides `icon`
}

// A story path. NOT the same as the lord character — the lord is a Unit that
// happens to lead this route (see Unit.isLord).
export interface Route {
  id: string;
  name: string;
  title: string; // route faction / banner, e.g. "Ribeira Winds"
  description: string;
  color: string; // accent color / motif
  portrait: string | null; // optional route splash art
}

export type FieldType = "text" | "longtext" | "number" | "dropdown" | "multiselect" | "checkbox";

// A dropdown's options can come from a live entity list instead of a static
// list — new entities then appear as options automatically. The stored value
// is that entity's id.
export type OptionsSource = "classes" | "routes" | "units" | "skillTypes";

export interface FieldDef {
  id: string;
  key: string; // machine key used in Unit.fields
  label: string;
  type: FieldType;
  options?: string[]; // static options for `dropdown`
  optionsSource?: OptionsSource; // when set, options come from this entity list
}

export type FieldValue = string | boolean | string[];

export type MovementType = "infantry" | "cavalry" | "flying" | "armored" | "monster" | "";

export interface GameClass {
  id: string;
  name: string;
  tier: string; // e.g. "Beginner" / "Advanced"
  description: string;
  movementType: MovementType;
  proficiencies: string[]; // skillType ids available to this class
  portrait: string | null;
}

export interface PersonalSkill {
  name: string;
  description: string;
}

export interface Unit {
  id: string;
  name: string;
  portrait: string | null;
  isLord: boolean; // this unit is the lord/leader of a route
  routeIds: string[]; // LOCKED to these routes; empty = recruitable on every route
  starterFor: string[]; // routes this unit STARTS on (default team member) — independent of lock
  classId: string | null; // canonical/default class
  boons: string[]; // skillType ids
  banes: string[]; // skillType ids
  skillLevels: Record<string, Grade>; // skillTypeId -> grade
  personalSkill: PersonalSkill;
  fields: Record<string, FieldValue>; // custom field values keyed by FieldDef.key (e.g. faction)
}

export interface MapNode {
  id: string;
  label: string;
  type: string; // free-form category, e.g. "battle" / "shop" / "rest"
  x: number; // percentage 0-100 across the background
  y: number; // percentage 0-100 down the background
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  turns: number;
}

export interface GameMap {
  background: string | null;
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface RatingParam {
  id: string;
  label: string;
}

export interface DB {
  schemaVersion: number;
  routes: Route[];
  skillTypes: SkillType[];
  fieldDefs: FieldDef[];
  classes: GameClass[];
  units: Unit[];
  map: GameMap;
  ratingParams: RatingParam[];
}
