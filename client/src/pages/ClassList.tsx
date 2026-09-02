import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { UnitPortrait } from "../components/UnitPortrait";
import { SkillMark, ProficiencyMark } from "../components/icons";
import { sortBySkillOrder } from "../data/skills";
import { CLASS_TIERS } from "../types";
import type { ClassAbility, GameClass, SkillReq, SkillType, TierRequirement } from "../types";

const MOVE_LABEL: Record<string, string> = {
  infantry: "Infantry",
  cavalry: "Cavalry",
  flying: "Flying",
  armored: "Armored",
  monster: "Monster",
};

function SkillReqBlock({ label, reqs, skillById }: { label: string; reqs?: SkillReq[]; skillById: (id: string) => SkillType | undefined }) {
  const list = (reqs ?? []).filter((r) => skillById(r.skillTypeId));
  return (
    <div className="class-skillreq">
      <div className="cast-detail-label">{label}</div>
      {list.length === 0 ? (
        <span className="muted">—</span>
      ) : (
        <div className="class-skillreq-list">
          {list.map((r, i) => {
            const st = skillById(r.skillTypeId)!;
            return (
              <span className="class-skillreq-item" key={i}>
                <SkillMark type={st} size={18} />
                <span className="class-grade">{r.grade}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AbilityRow({ ability, master }: { ability?: ClassAbility; master?: boolean }) {
  if (!ability || !ability.name.trim()) {
    return <div className="class-ability empty">{master ? "—" : "Empty"}</div>;
  }
  return (
    <div className="class-ability">
      <div className={"class-ability-icon" + (master ? " master" : "")}>
        {ability.icon ? <img src={ability.icon} alt="" /> : <span>{master ? "★" : "◆"}</span>}
      </div>
      <div className="grow">
        <div className="class-ability-name">{ability.name}</div>
        {ability.description && <div className="muted class-ability-desc">{ability.description}</div>}
      </div>
    </div>
  );
}

function ClassDetail({
  cls,
  skillById,
  skillTypes,
  tierReq,
}: {
  cls: GameClass;
  skillById: (id: string) => SkillType | undefined;
  skillTypes: SkillType[];
  tierReq?: TierRequirement;
}) {
  const profs = sortBySkillOrder(cls.proficiencies, skillTypes)
    .map((id) => skillById(id))
    .filter((s): s is SkillType => !!s);
  return (
    <div className="class-detail-inner">
      <div className="class-detail-head">
        <UnitPortrait src={cls.portrait} name={cls.name} size={64} shape="square" />
        <div>
          <h3 className="class-detail-name">{cls.name || "Unnamed"}</h3>
          <div className="muted">{[cls.tier, MOVE_LABEL[cls.movementType]].filter(Boolean).join(" · ") || "—"}</div>
        </div>
      </div>
      {cls.description && <p className="muted class-desc">{cls.description}</p>}

      <div>
        <div className="cast-detail-label">Proficiencies</div>
        {profs.length === 0 ? (
          <span className="muted">—</span>
        ) : (
          <div className="chip-wrap" style={{ marginTop: 5 }}>
            {profs.map((st) => (
              <span className="tag" key={st.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ProficiencyMark type={st} size={13} bonus={(cls.bonusExp ?? []).includes(st.id)} /> {st.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="class-lv-row">
        <div className="class-lv"><span className="cast-detail-label">Ideal Lv.</span><b>{tierReq?.idealLv ?? "—"}</b></div>
        <div className="class-lv"><span className="cast-detail-label">Renown Lv.</span><b>{tierReq?.renownLv ?? "—"}</b></div>
      </div>

      <div className="class-skills-row">
        <SkillReqBlock label="Primary Skills" reqs={cls.primarySkills} skillById={skillById} />
        <SkillReqBlock label="Secondary Skills" reqs={cls.secondarySkills} skillById={skillById} />
      </div>

      <div>
        <div className="cast-detail-label">Class Abilities</div>
        <div className="class-abilities">
          {[0, 1, 2].map((i) => (
            <AbilityRow key={i} ability={cls.classAbilities?.[i]} />
          ))}
        </div>
      </div>

      <div>
        <div className="cast-detail-label">Mastered Ability</div>
        <AbilityRow ability={cls.masteredAbility} master />
      </div>
    </div>
  );
}

export function ClassList() {
  const { db } = useDB();
  const skillById = (id: string) => db.skillTypes.find((s) => s.id === id);

  const tiers = useMemo(() => CLASS_TIERS.filter((t) => db.classes.some((c) => c.tier === t)), [db.classes]);
  const [tier, setTier] = useState<string>("");
  // Most planning is around Advanced classes, so default to that tier when it
  // exists (until the user picks another).
  const defaultTier = tiers.includes("Advanced") ? "Advanced" : tiers[0] ?? "";
  const activeTier = tiers.includes(tier) ? tier : defaultTier;

  const inTier = useMemo(() => db.classes.filter((c) => c.tier === activeTier), [db.classes, activeTier]);
  const [selId, setSelId] = useState<string | null>(null);
  const selected = inTier.find((c) => c.id === selId) ?? inTier[0] ?? null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Class List</h2>
          <p>Browse classes by tier — pick one to see its certification requirements and abilities.</p>
        </div>
      </div>

      {db.classes.length === 0 ? (
        <div className="empty-hint">No classes yet. Add them in Dev Mode → Classes.</div>
      ) : (
        <div className="class-layout">
          <div className="class-list-panel ornate card">
            <div className="class-tier-tabs">
              {tiers.map((t) => (
                <button key={t} className={"class-tier-tab" + (t === activeTier ? " active" : "")} onClick={() => { setTier(t); setSelId(null); }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="class-list-scroll">
              {inTier.map((c) => (
                <button key={c.id} className={"class-list-item" + (selected?.id === c.id ? " active" : "")} onClick={() => setSelId(c.id)}>
                  <UnitPortrait src={c.portrait} name={c.name} size={36} shape="square" />
                  <span className="grow">{c.name || "Unnamed"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="class-detail ornate card">
            {selected ? (
              <ClassDetail cls={selected} skillById={skillById} skillTypes={db.skillTypes} tierReq={db.tierRequirements?.[selected.tier]} />
            ) : (
              <div className="empty-hint">No classes in this tier.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
