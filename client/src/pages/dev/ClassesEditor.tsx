import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { SkillMark } from "../../components/icons";
import { UnitPortrait } from "../../components/UnitPortrait";
import { ImageDrop } from "../../components/ImageDrop";
import { sortBySkillOrder } from "../../data/skills";
import { GRADES } from "../../types";
import type { ClassAbility, GameClass, Grade, MovementType, SkillReq, SkillType } from "../../types";

const MOVES: { value: MovementType; label: string }[] = [
  { value: "", label: "—" },
  { value: "infantry", label: "Infantry" },
  { value: "cavalry", label: "Cavalry" },
  { value: "flying", label: "Flying" },
  { value: "armored", label: "Armored" },
  { value: "monster", label: "Monster" },
];

const TIERS = ["Base", "Beginner", "Specialty", "Advanced", "Master"];

function blankClass(): GameClass {
  return { id: uid("class_"), name: "", tier: "", description: "", movementType: "", proficiencies: [], portrait: null };
}

export function ClassesEditor() {
  const { db, update } = useDB();
  const [editing, setEditing] = useState<GameClass | null>(null);

  function save(c: GameClass) {
    update((d) => {
      const i = d.classes.findIndex((x) => x.id === c.id);
      if (i >= 0) d.classes[i] = c;
      else d.classes.push(c);
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this class?")) return;
    update((d) => {
      d.classes = d.classes.filter((c) => c.id !== id);
      d.units.forEach((u) => {
        if (u.classId === id) u.classId = null;
      });
    });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const i = d.classes.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.classes.length) return;
      [d.classes[i], d.classes[j]] = [d.classes[j], d.classes[i]];
    });
  }

  function setTierReq(tier: string, patch: { idealLv?: number; renownLv?: number }) {
    update((d) => {
      if (!d.tierRequirements) d.tierRequirements = {};
      d.tierRequirements[tier] = { ...(d.tierRequirements[tier] ?? {}), ...patch };
    });
  }

  return (
    <div>
      <div className="ornate card" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Certification requirements by tier</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
          Ideal level &amp; renown needed to certify into each tier — shared by every class in that tier.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="rate-table">
            <thead>
              <tr><th>Tier</th><th style={{ width: 120 }}>Ideal Lv.</th><th style={{ width: 120 }}>Renown Lv.</th></tr>
            </thead>
            <tbody>
              {TIERS.map((t) => {
                const r = db.tierRequirements?.[t] ?? {};
                return (
                  <tr key={t}>
                    <td style={{ fontWeight: 600 }}>{t}</td>
                    <td>
                      <input type="number" value={r.idealLv ?? ""} onChange={(e) => setTierReq(t, { idealLv: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </td>
                    <td>
                      <input type="number" value={r.renownLv ?? ""} onChange={(e) => setTierReq(t, { renownLv: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="spread" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Classes ({db.classes.length})</h3>
        <button className="btn primary" onClick={() => setEditing(blankClass())}>+ New Class</button>
      </div>

      {db.classes.length === 0 ? (
        <div className="empty-hint">No classes yet. Add one to define available weapon types.</div>
      ) : (
        <div className="grid-cards">
          {db.classes.map((c) => (
            <div className="ornate card" key={c.id}>
              <div className="row" style={{ marginBottom: 8 }}>
                <UnitPortrait src={c.portrait} name={c.name} size={48} shape="square" />
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{c.name || "Unnamed"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {[c.tier, MOVES.find((m) => m.value === c.movementType)?.label].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <div className="chip-wrap" style={{ minHeight: 28, marginBottom: 8 }}>
                {c.proficiencies.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No proficiencies</span>}
                {sortBySkillOrder(c.proficiencies, db.skillTypes).map((sid) => {
                  const st = db.skillTypes.find((s) => s.id === sid);
                  if (!st) return null;
                  return (
                    <span className="tag" key={sid} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <SkillMark type={st} size={12} /> {st.label}
                    </span>
                  );
                })}
              </div>
              <div className="row">
                <button className="btn tiny" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn tiny danger" onClick={() => remove(c.id)}>Delete</button>
                <span className="row" style={{ gap: 2, marginLeft: "auto" }}>
                  <button className="icon-btn" title="Move earlier" disabled={db.classes[0]?.id === c.id} onClick={() => move(c.id, -1)}>▲</button>
                  <button className="icon-btn" title="Move later" disabled={db.classes[db.classes.length - 1]?.id === c.id} onClick={() => move(c.id, 1)}>▼</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ClassModal cls={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ClassModal({ cls, onClose, onSave }: { cls: GameClass; onClose: () => void; onSave: (c: GameClass) => void }) {
  const { db } = useDB();
  const [draft, setDraft] = useState<GameClass>(cls);
  const set = (p: Partial<GameClass>) => setDraft((d) => ({ ...d, ...p }));
  function toggleProf(id: string) {
    setDraft((d) => ({
      ...d,
      proficiencies: d.proficiencies.includes(id) ? d.proficiencies.filter((x) => x !== id) : [...d.proficiencies, id],
    }));
  }

  return (
    <Modal
      open
      wide
      title={cls.name ? `Edit ${cls.name}` : "New Class"}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(draft)}>Save</button>
        </>
      }
    >
      <div className="two-col">
        <div>
          <label className="field"><span>Name</span>
            <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <div className="two-col">
            <label className="field"><span>Tier</span>
              <select value={draft.tier} onChange={(e) => set({ tier: e.target.value })}>
                <option value="">—</option>
                {(TIERS.includes(draft.tier) || !draft.tier ? TIERS : [draft.tier, ...TIERS]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field"><span>Movement</span>
              <select value={draft.movementType} onChange={(e) => set({ movementType: e.target.value as MovementType })}>
                {MOVES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Description</span>
            <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </label>
        </div>
        <div>
          <label className="field"><span>Class icon / art</span></label>
          <ImageDrop value={draft.portrait} onChange={(url) => set({ portrait: url })} height={150} />
        </div>
      </div>

      <div className="divider" />
      <h3 className="section-title">Proficiencies (available weapon / skill types)</h3>
      <div className="chip-wrap">
        {db.skillTypes.map((st) => (
          <span
            key={st.id}
            className={"chip-toggle" + (draft.proficiencies.includes(st.id) ? " on" : "")}
            onClick={() => toggleProf(st.id)}
          >
            <SkillMark type={st} size={14} /> {st.label}
          </span>
        ))}
      </div>

      <div className="divider" />
      <h3 className="section-title">Certification skills</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
        Ideal level &amp; renown are set per tier (in the “Certification requirements by tier” table above the class list).
      </p>
      <div className="two-col">
        <div>
          <h4 className="section-title" style={{ marginBottom: 6 }}>Primary Skills</h4>
          <ReqList reqs={draft.primarySkills ?? []} onChange={(r) => set({ primarySkills: r })} skillTypes={db.skillTypes} />
        </div>
        <div>
          <h4 className="section-title" style={{ marginBottom: 6 }}>Secondary Skills</h4>
          <ReqList reqs={draft.secondarySkills ?? []} onChange={(r) => set({ secondarySkills: r })} skillTypes={db.skillTypes} />
        </div>
      </div>

      <div className="divider" />
      <h3 className="section-title">Class Abilities (up to 3)</h3>
      <div className="stack" style={{ gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <AbilityFields
            key={i}
            label={`Ability ${i + 1}`}
            ability={draft.classAbilities?.[i]}
            onChange={(ab) => {
              const arr = [...(draft.classAbilities ?? [])];
              while (arr.length < 3) arr.push({ name: "", description: "", icon: null });
              arr[i] = ab;
              set({ classAbilities: arr });
            }}
          />
        ))}
      </div>

      <div className="divider" />
      <h3 className="section-title">Mastered Ability</h3>
      <AbilityFields label="Mastered" ability={draft.masteredAbility} onChange={(ab) => set({ masteredAbility: ab })} />
    </Modal>
  );
}

function ReqList({ reqs, onChange, skillTypes }: { reqs: SkillReq[]; onChange: (r: SkillReq[]) => void; skillTypes: SkillType[] }) {
  const add = () => onChange([...reqs, { skillTypeId: skillTypes[0]?.id ?? "", grade: "D" }]);
  const patch = (i: number, p: Partial<SkillReq>) => onChange(reqs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) => onChange(reqs.filter((_, j) => j !== i));
  return (
    <div className="stack" style={{ gap: 6 }}>
      {reqs.map((r, i) => (
        <div className="row" key={i} style={{ gap: 6 }}>
          <select value={r.skillTypeId} onChange={(e) => patch(i, { skillTypeId: e.target.value })} style={{ flex: 1 }}>
            {skillTypes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={r.grade} onChange={(e) => patch(i, { grade: e.target.value as Grade })} style={{ width: 68 }}>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="icon-btn" title="Remove" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button className="btn tiny" onClick={add} disabled={skillTypes.length === 0}>+ Add skill</button>
    </div>
  );
}

function AbilityFields({ label, ability, onChange }: { label: string; ability?: ClassAbility; onChange: (a: ClassAbility) => void }) {
  const a: ClassAbility = ability ?? { name: "", description: "", icon: null };
  const set = (p: Partial<ClassAbility>) => onChange({ ...a, ...p });
  return (
    <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 58 }}>
        <ImageDrop value={a.icon ?? null} onChange={(url) => set({ icon: url })} height={52} label="Icon" />
      </div>
      <div className="grow stack" style={{ gap: 6 }}>
        <input type="text" placeholder={`${label} name`} value={a.name} onChange={(e) => set({ name: e.target.value })} />
        <input type="text" placeholder="Description (optional)" value={a.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
    </div>
  );
}
