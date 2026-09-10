// ---- Shared data model (mirrors server/data/db.json) -----------------------

export type Grade = "S+" | "S" | "A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "E+" | "E";
export const GRADES: Grade[] = ["S+", "S", "A+", "A", "B+", "B", "C+", "C", "D+", "D", "E+", "E"];

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
  optionImages?: Record<string, string>; // per-option image (keyed by option value) — displayed instead of the text, name on hover
}

export type FieldValue = string | boolean | string[];

export type MovementType = "infantry" | "cavalry" | "flying" | "armored" | "monster" | "";

export const CLASS_TIERS = ["Base", "Beginner", "Specialty", "Advanced", "Master"];

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
  bonusExp?: string[]; // skillType ids this class earns bonus EXP in (shown with a ▲ on the icon)
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

export type Negotiation = "Easy" | "Moderate" | "Difficult";
export const NEGOTIATIONS: Negotiation[] = ["Easy", "Moderate", "Difficult"];

// Conditions to recruit a unit under a given lord's route. Every field is
// optional — only the ones filled in are shown.
export interface RecruitCondition {
  support?: number; // Support Level
  renown?: number; // Renown Level
  negotiation?: Negotiation;
  extra?: string; // Extra objectives (free text)
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
  possiblyEnemyOnly?: boolean; // may turn out to be enemy-only (shows a "?" on the portrait)
  recruitment?: Record<string, RecruitCondition>; // recruitment conditions keyed by lord's route id
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
  aquatic?: boolean; // a water crossing — only usable once water traversal is allowed
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

// ---- Polls (pre-release fun) ----------------------------------------------
export type PollGraph = "pie" | "donut" | "hbar" | "vbar";

export interface PollOption {
  id: string;
  label: string;
  color: string;
  image?: string | null; // shown as an icon (auto-filled from an entity portrait for sourced polls)
}

// When set, a poll's options are pulled live from an entity list (auto-updating
// as you add characters) instead of being typed in by hand.
export type PollOptionsSource = "units" | "gods" | "npcs" | "characters" | "routes";

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[]; // custom options (used when optionsSource is unset)
  optionsSource?: PollOptionsSource; // pull options from a live list instead
  palette?: string[]; // colours cycled across sourced options, in order (defaults to POLL_PALETTE)
  maxSelections: number; // how many options a voter may pick (>=1)
  graph: PollGraph;
  showValues?: boolean; // show raw vote counts on the chart
  showPercent?: boolean; // show percentages on the chart
  showRank?: boolean; // show rank (#1, #2 …) on horizontal bars (default on)
  closed?: boolean; // stop accepting new votes
}

// A cohesive 12-colour palette, cycled for poll options. The first four match
// the four lords' route colours (Blue, Purple, Gold, Pink); slots 9–12 are
// Red, Green, Cyan, Silver. For entity-sourced polls the live route colours
// replace the first four (see data/polls.ts) so routes stay exact.
export const POLL_PALETTE = [
  "#3f72c7", // 1 blue   (Cai)
  "#7d5fb0", // 2 purple (Dietrich)
  "#b8932f", // 3 gold   (Theodora)
  "#c13a6a", // 4 pink   (Leda)
  "#dd8a3c", // 5 orange
  "#35a8a0", // 6 teal
  "#b45bb0", // 7 magenta
  "#97b23f", // 8 lime
  "#cf4b45", // 9 red
  "#57a95d", // 10 green
  "#4bb2c9", // 11 cyan
  "#aab6bd", // 12 silver
];

// ---- Gacha (summon minigame) ----------------------------------------------
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface RarityDef {
  id: Rarity;
  label: string;
  stars: number;
  color: string;
}
export const RARITIES: RarityDef[] = [
  { id: "common", label: "Common", stars: 1, color: "#c8d0d3" },
  { id: "uncommon", label: "Uncommon", stars: 2, color: "#5cc08a" },
  { id: "rare", label: "Rare", stars: 3, color: "#5fa8e8" },
  { id: "epic", label: "Epic", stars: 4, color: "#b784e0" },
  { id: "legendary", label: "Legendary", stars: 5, color: "#eac04a" },
];
export const rarityDef = (r: Rarity): RarityDef => RARITIES.find((x) => x.id === r) ?? RARITIES[0];
export const rarityRank = (r: Rarity): number => rarityDef(r).stars;

export const DEFAULT_RATES: Record<Rarity, number> = {
  common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1,
};

export type CardSubjectKind = "unit" | "god" | "npc";

export interface GachaCard {
  id: string;
  subjectKind: CardSubjectKind;
  subjectId: string; // the unit/god/npc this card depicts
  title?: string; // optional card title (e.g. an alt/costume name)
  art?: string | null; // optional override art; when empty, uses the subject's LIVE portrait
  rarity: Rarity;
  classId?: string | null; // optional class shown on the card
}

export interface Banner {
  id: string;
  name: string;
  image?: string | null; // banner art
  cardIds: string[];
  rates: Record<Rarity, number>; // percentages per rarity
}

export interface GachaConfig {
  enabled?: boolean; // whether the public Gacha tab is shown
  cards: GachaCard[];
  banners: Banner[];
}

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
  polls?: Poll[]; // pre-release community polls
  gacha?: GachaConfig; // summon minigame (cards + banners)
}
