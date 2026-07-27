import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { SkillIcon } from "../../components/icons";
import { UnitPortrait } from "../../components/UnitPortrait";
import { ImageDrop } from "../../components/ImageDrop";
import type { GameClass, MovementType } from "../../types";

const MOVES: { value: MovementType; label: string }[] = [
  { value: "", label: "—" },
  { value: "infantry", label: "Infantry" },
  { value: "cavalry", label: "Cavalry" },
  { value: "flying", label: "Flying" },
  { value: "armored", label: "Armored" },
  { value: "monster", label: "Monster" },
];

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

  return (
    <div>
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
                {c.proficiencies.map((sid) => {
                  const st = db.skillTypes.find((s) => s.id === sid);
                  if (!st) return null;
                  return (
                    <span className="tag" key={sid} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <SkillIcon icon={st.icon} size={12} /> {st.label}
                    </span>
                  );
                })}
              </div>
              <div className="row">
                <button className="btn tiny" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn tiny danger" onClick={() => remove(c.id)}>Delete</button>
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
              <input type="text" placeholder="Beginner / Advanced…" value={draft.tier} onChange={(e) => set({ tier: e.target.value })} />
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
            <SkillIcon icon={st.icon} size={14} /> {st.label}
          </span>
        ))}
      </div>
    </Modal>
  );
}
