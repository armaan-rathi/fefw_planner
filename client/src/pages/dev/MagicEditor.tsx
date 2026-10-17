import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import type { Spell } from "../../types";

function blankSpell(prof: string): Spell {
  return { id: uid("spell_"), proficiency: prof, name: "", power: null, hit: null, range: "", weight: null, crit: null, avo: null, uses: null, effect: "" };
}

export function MagicEditor() {
  const { db, update } = useDB();
  const magicSkills = db.skillTypes.filter((s) => ["reason", "faith"].includes(s.id));
  const skillChoices = magicSkills.length ? magicSkills : db.skillTypes;
  const [prof, setProf] = useState<string>(skillChoices[0]?.id ?? "reason");
  const [editing, setEditing] = useState<Spell | null>(null);

  const spells = (db.spells ?? []).filter((s) => s.proficiency === prof);

  function save(s: Spell) {
    update((d) => {
      const arr = d.spells ?? [];
      const i = arr.findIndex((x) => x.id === s.id);
      if (i >= 0) arr[i] = s;
      else arr.push(s);
      d.spells = arr;
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this spell? It will also be removed from any unit learnsets.")) return;
    update((d) => {
      d.spells = (d.spells ?? []).filter((s) => s.id !== id);
      for (const u of d.units) {
        if (!u.learnsets) continue;
        for (const p of Object.keys(u.learnsets)) {
          for (const r of Object.keys(u.learnsets[p])) {
            u.learnsets[p][r] = u.learnsets[p][r].filter((x) => x !== id);
          }
        }
      }
    });
  }
  // Swap with the adjacent spell of the same proficiency.
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const arr = d.spells ?? [];
      const i = arr.findIndex((s) => s.id === id);
      if (i < 0) return;
      let j = i + dir;
      while (j >= 0 && j < arr.length && arr[j].proficiency !== arr[i].proficiency) j += dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  }

  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Magic</h3>
          <label className="field" style={{ margin: 0 }}>
            <select value={prof} onChange={(e) => setProf(e.target.value)}>
              {skillChoices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <span className="muted" style={{ fontSize: 12 }}>{spells.length} spell(s)</span>
        </div>
        <button className="btn primary" onClick={() => setEditing(blankSpell(prof))}>+ New Spell</button>
      </div>

      {spells.length === 0 && <div className="empty-hint">No spells for this proficiency yet.</div>}
      <div style={{ overflowX: "auto" }}>
        <table className="rate-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Spell</th><th>Mt</th><th>Hit</th><th>Rng</th><th>Wt</th><th>Crit</th><th>Avo</th><th>Uses</th><th style={{ textAlign: "left" }}>Effect</th><th />
            </tr>
          </thead>
          <tbody>
            {spells.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name || "Unnamed"}</td>
                <td style={{ textAlign: "center" }}>{s.power ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{s.hit ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{s.range || "—"}</td>
                <td style={{ textAlign: "center" }}>{s.weight ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{s.crit ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{s.avo ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{s.uses ?? "—"}</td>
                <td style={{ fontSize: 12, color: "var(--ink-dim)" }}>{s.effect || "—"}</td>
                <td>
                  <span className="row" style={{ gap: 4 }}>
                    <button className="icon-btn" onClick={() => move(s.id, -1)}>▲</button>
                    <button className="icon-btn" onClick={() => move(s.id, 1)}>▼</button>
                    <button className="btn tiny" onClick={() => setEditing(s)}>Edit</button>
                    <button className="btn tiny danger" onClick={() => remove(s.id)}>✕</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <SpellModal spell={editing} skillChoices={skillChoices} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function SpellModal({ spell, skillChoices, onClose, onSave }: { spell: Spell; skillChoices: { id: string; label: string }[]; onClose: () => void; onSave: (s: Spell) => void }) {
  const [draft, setDraft] = useState<Spell>(() => ({ ...spell }));
  const set = (p: Partial<Spell>) => setDraft((d) => ({ ...d, ...p }));
  const numField = (label: string, key: "power" | "hit" | "weight" | "crit" | "avo" | "uses") => (
    <label className="field" style={{ width: 90 }}><span>{label}</span>
      <input type="number" value={draft[key] ?? ""} onChange={(e) => set({ [key]: e.target.value === "" ? null : Number(e.target.value) } as Partial<Spell>)} />
    </label>
  );
  return (
    <Modal open wide title={spell.name ? `Edit ${spell.name}` : "New Spell"} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => onSave(draft)}>Save</button></>}>
      <div className="two-col">
        <label className="field"><span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field"><span>Proficiency</span>
          <select value={draft.proficiency} onChange={(e) => set({ proficiency: e.target.value })}>
            {skillChoices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="chip-wrap">
        {numField("Might", "power")}
        {numField("Hit", "hit")}
        <label className="field" style={{ width: 90 }}><span>Range</span>
          <input type="text" value={draft.range} onChange={(e) => set({ range: e.target.value })} placeholder="1-2" />
        </label>
        {numField("Weight", "weight")}
        {numField("Crit", "crit")}
        {numField("Avo", "avo")}
        {numField("Uses", "uses")}
      </div>
      <label className="field"><span>Effect</span>
        <textarea value={draft.effect} onChange={(e) => set({ effect: e.target.value })} rows={2} />
      </label>
    </Modal>
  );
}
