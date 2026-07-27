import type { SkillType, Grade } from "../types";
import { SkillIcon } from "./icons";

interface Props {
  skillTypes: SkillType[];
  boons?: string[];
  banes?: string[];
  proficiencies?: string[]; // class proficiencies (highlighted / not greyed)
  skillLevels?: Record<string, Grade>;
  compact?: boolean;
}

// Replicates the in-game skill panel:
//  - blue glow  = boon
//  - gold glow  = bane
//  - bright + framed = class proficiency (not greyed out)
//  - dim        = neither proficient nor boon/bane
export function ProficiencyGrid({
  skillTypes,
  boons = [],
  banes = [],
  proficiencies = [],
  skillLevels = {},
  compact = false,
}: Props) {
  return (
    <div className={"prof-grid" + (compact ? " compact" : "")}>
      {skillTypes.map((st) => {
        const isBoon = boons.includes(st.id);
        const isBane = banes.includes(st.id);
        const isProf = proficiencies.includes(st.id);
        const grade = skillLevels[st.id];
        const cls = [
          "prof-cell",
          isProf ? "is-prof" : "",
          isBoon ? "is-boon" : "",
          isBane ? "is-bane" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={st.id} className={cls} title={st.label + (isBoon ? " (Boon)" : isBane ? " (Bane)" : "")}>
            <SkillIcon icon={st.icon} size={compact ? 18 : 22} className="prof-icon" />
            {grade && <span className="prof-grade">{grade}</span>}
          </div>
        );
      })}
    </div>
  );
}
