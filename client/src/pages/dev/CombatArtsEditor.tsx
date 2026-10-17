import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import type { CombatArt } from "../../types";

const WEAPON_SKILLS = ["sword", "lance", "axe", "bow", "brawl"];

function blankArt(prof: string): CombatArt {
  return { id: uid("art_"), proficiency: prof, name: "", cost: null, might: null, hit: null, crit: null, range: "", effect: "" };
}

export function CombatArtsEditor() {
  const { db, update } = useDB();
  const weaponChoices = db.skillTypes.filter((s) => WEAPON_SKILLS.includes(s.id));
  const choices = weaponChoices.length ? weaponChoices : db.skillTypes;
  const [prof, setProf] = useState<string>(choices[0]?.id ?? "lance");
  const [editing, setEditing] = useState<CombatArt | null>(null);

  const arts = (db.combatArts ?? []).filter((a) => a.proficiency === prof);

  function save(a: CombatArt) {
    update((d) => {
      const arr = d.combatArts ?? [];
      const i = arr.findIndex((x) => x.id === a.id);
      if (i >= 0) arr[i] = a;
      else arr.push(a);
      d.combatArts = arr;
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this combat art? It will also be removed from any unit learnsets.")) return;
    update((d) => {
      d.combatArts = (d.combatArts ?? []).filter((a) => a.id !== id);
      for (const u of d.units) {
        if (!u.learnsets) continue;
        for (const p of Object.keys(u.learnsets))
          for (const r of Object.keys(u.learnsets[p]))
            u.learnsets[p][r] = u.learnsets[p][r].filter((x) => x !== id);
      }
    });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const arr = d.combatArts ?? [];
      const i = arr.findIndex((a) => a.id === id);
      if (i < 0) return;
      let j = i + dir;
      while (j >= 0 && j < arr.length && arr[j].proficiency !== arr[i].proficiency) j += dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  }
  const sgn = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v}`);

  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Combat Arts</h3>
          <label className="field" style={{ margin: 0 }}>
            <select value={prof} onChange={(e) => setProf(e.target.value)}>
              {choices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <span className="muted" style={{ fontSize: 12 }}>{arts.length} art(s)</span>
        </div>
        <button className="btn primary" onClick={() => setEditing(blankArt(prof))}>+ New Art</button>
      </div>

      {arts.length === 0 && <div className="empty-hint">No combat arts for this type yet.</div>}
      <div style={{ overflowX: "auto" }}>
        <table className="rate-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Art</th><th>Cost</th><th>Might</th><th>Hit</th><th>Crit</th><th>Rng</th><th style={{ textAlign: "left" }}>Effect</th><th />
            </tr>
          </thead>
          <tbody>
            {arts.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name || "Unnamed"}</td>
                <td style={{ textAlign: "center" }}>{a.cost ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{sgn(a.might)}</td>
                <td style={{ textAlign: "center" }}>{sgn(a.hit)}</td>
                <td style={{ textAlign: "center" }}>{sgn(a.crit)}</td>
                <td style={{ textAlign: "center" }}>{a.range || "—"}</td>
                <td style={{ fontSize: 12, color: "var(--ink-dim)" }}>{a.effect || "—"}</td>
                <td>
                  <span className="row" style={{ gap: 4 }}>
                    <button className="icon-btn" onClick={() => move(a.id, -1)}>▲</button>
                    <button className="icon-btn" onClick={() => move(a.id, 1)}>▼</button>
                    <button className="btn tiny" onClick={() => setEditing(a)}>Edit</button>
                    <button className="btn tiny danger" onClick={() => remove(a.id)}>✕</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ArtModal art={editing} choices={choices} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ArtModal({ art, choices, onClose, onSave }: { art: CombatArt; choices: { id: string; label: string }[]; onClose: () => void; onSave: (a: CombatArt) => void }) {
  const [draft, setDraft] = useState<CombatArt>(() => ({ ...art }));
  const set = (p: Partial<CombatArt>) => setDraft((d) => ({ ...d, ...p }));
  const numField = (label: string, key: "cost" | "might" | "hit" | "crit") => (
    <label className="field" style={{ width: 90 }}><span>{label}</span>
      <input type="number" value={draft[key] ?? ""} onChange={(e) => set({ [key]: e.target.value === "" ? null : Number(e.target.value) } as Partial<CombatArt>)} />
    </label>
  );
  return (
    <Modal open wide title={art.name ? `Edit ${art.name}` : "New Combat Art"} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => onSave(draft)}>Save</button></>}>
      <div className="two-col">
        <label className="field"><span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field"><span>Type</span>
          <select value={draft.proficiency} onChange={(e) => set({ proficiency: e.target.value })}>
            {choices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="chip-wrap">
        {numField("Cost", "cost")}
        {numField("Might", "might")}
        {numField("Hit", "hit")}
        {numField("Crit", "crit")}
        <label className="field" style={{ width: 90 }}><span>Range</span>
          <input type="text" value={draft.range} onChange={(e) => set({ range: e.target.value })} placeholder="1" />
        </label>
      </div>
      <label className="field"><span>Effect</span>
        <textarea value={draft.effect} onChange={(e) => set({ effect: e.target.value })} rows={2} />
      </label>
    </Modal>
  );
}
