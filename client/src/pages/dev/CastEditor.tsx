import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { ImageDrop } from "../../components/ImageDrop";
import { fieldOptions } from "../../data/fields";
import type { CastKind, CastMember } from "../../types";

// CRUD for a non-playable cast list (Gods, Important NPCs). Stored on db[kind],
// never mixed into db.units.
export function CastEditor({ kind, label, subtitleLabel }: { kind: CastKind; label: string; subtitleLabel: string }) {
  const { db, update } = useDB();
  const list = db[kind] ?? [];
  const [name, setName] = useState("");
  // Crest catalog: reuse the unit "Crest" field's options + images so crests
  // are defined once and shared by units, gods and NPCs.
  const crestField = db.fieldDefs.find((f) => f.key === "crest");
  const crestOptions = crestField ? fieldOptions(db, crestField) : [];
  const crestImages = crestField?.optionImages ?? {};

  function add() {
    const n = name.trim();
    if (!n) return;
    update((d) => {
      const arr = d[kind] ?? [];
      arr.push({ id: uid("cast_"), name: n, portrait: null, subtitle: "", description: "" });
      d[kind] = arr;
    });
    setName("");
  }
  function patch(id: string, p: Partial<CastMember>) {
    update((d) => {
      const m = (d[kind] ?? []).find((x) => x.id === id);
      if (m) Object.assign(m, p);
    });
  }
  function remove(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    update((d) => {
      d[kind] = (d[kind] ?? []).filter((m) => m.id !== id);
    });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const arr = d[kind] ?? [];
      const i = arr.findIndex((m) => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      d[kind] = arr;
    });
  }
  // Turn an Important NPC into a playable unit: delete the NPC, create a unit
  // carrying its name and portrait (unit-specific data starts blank).
  function convertToUnit(m: CastMember) {
    if (!confirm(`Convert "${m.name || "this NPC"}" into a playable unit?\n\nThe NPC entry will be deleted and re-created as a unit.`)) return;
    update((d) => {
      d[kind] = (d[kind] ?? []).filter((x) => x.id !== m.id);
      d.units.push({
        id: uid("unit_"),
        name: m.name,
        portrait: m.portrait,
        isLord: false,
        routeIds: [],
        starterFor: [],
        classId: null,
        boons: [],
        banes: [],
        skillLevels: {},
        personalSkill: { name: "", description: "" },
        fields: {},
      });
    });
  }
  function setBlessing(id: string, idx: number, val: string) {
    update((d) => {
      const m = (d[kind] ?? []).find((x) => x.id === id);
      if (!m) return;
      const b = m.blessings ? [...m.blessings] : [];
      while (b.length < 3) b.push("");
      b[idx] = val;
      m.blessings = b;
    });
  }
  const isGods = kind === "gods";

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title">{label}</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          These are non-playable characters — they appear only on their own listing page, never as units in the roster, team, or ratings.
        </p>
        <div className="inline-add">
          <input type="text" placeholder={`New ${label.toLowerCase()} name`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>

      <div className="ornate card">
        {list.length === 0 ? (
          <div className="empty-hint">Nothing here yet.</div>
        ) : (
          <div className="list-rows">
            {list.map((m, i) => (
              <div className="list-row ornate" key={m.id} style={{ alignItems: "flex-start", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(m.id, -1)}>▲</button>
                  <button className="icon-btn" disabled={i === list.length - 1} onClick={() => move(m.id, 1)}>▼</button>
                </div>
                <div style={{ width: 90 }}>
                  <ImageDrop value={m.portrait} onChange={(url) => patch(m.id, { portrait: url })} height={100} label="Portrait" />
                </div>
                <div className="grow stack" style={{ gap: 8 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Name</span>
                    <input type="text" value={m.name} onChange={(e) => patch(m.id, { name: e.target.value })} />
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Crest</span>
                    {crestOptions.length === 0 ? (
                      <span className="muted" style={{ fontSize: 12 }}>Define crest options (with images) in the unit “Crest” field first.</span>
                    ) : (
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <select value={m.crest ?? ""} onChange={(e) => patch(m.id, { crest: e.target.value || null })} style={{ flex: 1 }}>
                          <option value="">— None —</option>
                          {crestOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {m.crest && crestImages[m.crest] && <img className="crest-img" src={crestImages[m.crest]} alt={m.crest} title={m.crest} />}
                      </div>
                    )}
                  </label>
                  <label className="field" style={{ margin: 0 }}>
                    <span>{subtitleLabel}</span>
                    <input type="text" value={m.subtitle} onChange={(e) => patch(m.id, { subtitle: e.target.value })} />
                  </label>
                  {isGods ? (
                    [0, 1, 2].map((i) => (
                      <label className="field" style={{ margin: 0 }} key={i}>
                        <span>Blessing Lv. {i + 1}</span>
                        <input type="text" value={m.blessings?.[i] ?? ""} onChange={(e) => setBlessing(m.id, i, e.target.value)} />
                      </label>
                    ))
                  ) : (
                    <label className="field" style={{ margin: 0 }}>
                      <span>Description</span>
                      <textarea rows={3} value={m.description} onChange={(e) => patch(m.id, { description: e.target.value })} />
                    </label>
                  )}
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  {!isGods && (
                    <button className="btn tiny" title="Delete this NPC and re-create it as a playable unit" onClick={() => convertToUnit(m)}>→ Unit</button>
                  )}
                  <button className="btn tiny danger" onClick={() => remove(m.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
