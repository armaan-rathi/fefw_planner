// Top-navigation pages that can be shown/hidden from Dev Mode → Pages.
// (Polls and Gacha have their own visibility rules and aren't listed here.)
export interface NavPage {
  key: string;
  to: string;
  label: string;
  row: 1 | 2;
}

export const NAV_PAGES: NavPage[] = [
  { key: "routes", to: "/routes", label: "Route Selection", row: 1 },
  { key: "characters", to: "/characters", label: "Character Database", row: 1 },
  { key: "classes", to: "/classes", label: "Class List", row: 1 },
  { key: "tiers", to: "/tiers", label: "Tier List", row: 1 },
  { key: "split", to: "/split", label: "Team Planner", row: 1 },
  { key: "map", to: "/map", label: "Overworld Map", row: 1 },
  { key: "recruitment", to: "/recruitment", label: "Recruitment", row: 2 },
  { key: "growths", to: "/growths", label: "Growth Rates", row: 2 },
  { key: "proficiencies", to: "/proficiencies", label: "Proficiencies", row: 2 },
  { key: "mounts", to: "/mounts", label: "Mounts", row: 2 },
  { key: "paralogues", to: "/paralogues", label: "Paralogues", row: 2 },
  { key: "supports", to: "/supports", label: "Supports", row: 2 },
];
