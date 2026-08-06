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
  banner?: string | null; // optional wide banner image (used on the Route Split page)
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

export const CLASS_TIERS = ["Base", "Beginner", "Specialty", "Advanced", "Unique"];

// A required skill proficiency (skill type + minimum grade) for certification.
export interface SkillReq {
  skillTypeId: string;
  grade: Grade;
}

// A class ability (class skill or mastered ability).
export interface ClassAbility {
  name: string;
  description: string;
  icon?: string | null;
}

export interface GameClass {
  id: string;
  name: string;
  tier: string; // e.g. "Beginner" / "Advanced"
  description: string;
  movementType: MovementType;
  proficiencies: string[]; // skillType ids available to this class
  portrait: string | null;
  // Certification / class-list info
  primarySkills?: SkillReq[];
  secondarySkills?: SkillReq[];
  classAbilities?: ClassAbility[]; // up to 3 slots (some may be empty)
  masteredAbility?: ClassAbility;
}

// Ideal level + renown needed to certify into a tier (shared by all classes in it).
export interface TierRequirement {
  idealLv?: number;
  renownLv?: number;
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
  postTimeskip?: boolean; // only recruitable/available after the timeskip
}

export type IconShape = "circle" | "square" | "triangle" | "invtriangle" | "star4" | "star8";

// A user-defined marker style: a shape (and/or image) at a chosen size.
export interface IconType {
  id: string;
  name: string;
  image: string | null; // optional uploaded icon image (fills the shape)
  shape: IconShape;
  size: number; // px on the map
  color: string; // fill when there's no image
}

export interface MapNode {
  id: string;
  iconTypeId: string; // references IconType
  label: string;
  blocked: boolean; // shows a red no-entry badge
  inactive: boolean; // greyed out
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
  hideMarkers?: boolean; // on the live map, render markers invisible-but-clickable
}

export interface RatingParam {
  id: string;
  label: string;
}

// Which attributes appear on the Characters page (preview cards vs. detail popup).
// Ids are built-ins ("class","routes","proficiencies","personalSkill") or
// "field:<key>" for custom fields.
export interface CharacterPageConfig {
  preview: string[];
  detail: string[];
}

// A non-playable cast member (a God worshipped at temples, or an Important NPC).
// Deliberately NOT a Unit — these never appear in the roster, team, or ratings.
export interface CastMember {
  id: string;
  name: string;
  portrait: string | null;
  subtitle: string; // short line, e.g. domain / affiliation (NPCs)
  description: string; // longer blurb (NPCs)
  // God-specific:
  crest?: string | null; // crest name (text)
  blessings?: string[]; // effects at worship levels 1, 2, 3
}

export type CastKind = "gods" | "npcs";

export interface DB {
  schemaVersion: number;
  routes: Route[];
  skillTypes: SkillType[];
  fieldDefs: FieldDef[];
  classes: GameClass[];
  units: Unit[];
  iconTypes: IconType[];
  map: GameMap;
  ratingParams: RatingParam[];
  characterPage?: CharacterPageConfig;
  gods?: CastMember[]; // worshipped at temples
  npcs?: CastMember[]; // important non-playable characters
  tierRequirements?: Record<string, TierRequirement>; // keyed by tier name
}
