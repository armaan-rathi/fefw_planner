import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import type { FieldDef, FieldType } from "../../types";

const TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "longtext", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
}

export function FieldsEditor() {
  const { db, update } = useDB();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");

  function add() {
    const l = label.trim();
    if (!l) return;
    const key = slug(l);
    const existing = new Set(db.fieldDefs.map((f) => f.key));
    let k = key;
    let n = 2;
    while (existing.has(k)) k = `${key}_${n++}`;
    update((d) => {
      d.fieldDefs.push({ id: uid("f_"), key: k, label: l, type, ...(type === "dropdown" ? { options: [] } : {}) });
    });
    setLabel("");
    setType("text");
  }

  function patch(id: string, p: Partial<FieldDef>) {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === id);
      if (f) Object.assign(f, p);
    });
  }
  function changeType(id: string, t: FieldType) {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === id);
      if (!f) return;
      f.type = t;
      if (t === "dropdown" && !f.options) f.options = [];
    });
  }
  function remove(id: string) {
    if (!confirm("Remove this field? Existing values stay stored but are hidden.")) return;
    update((d) => {
      d.fieldDefs = d.fieldDefs.filter((f) => f.id !== id);
    });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const i = d.fieldDefs.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.fieldDefs.length) return;
      [d.fieldDefs[i], d.fieldDefs[j]] = [d.fieldDefs[j], d.fieldDefs[i]];
    });
  }

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title">Custom unit fields</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          These define the extra info tracked on every unit (e.g. Faction, Backstory, Recruitment). They appear in the unit editor.
          Structural fields (name, portrait, class, boons/banes, personal skill, “Is lord?”, route lock/starter) are always present.
        </p>
        <div className="inline-add">
          <input type="text" placeholder="Field label, e.g. Recruitment" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <select value={type} onChange={(e) => setType(e.target.value as FieldType)} style={{ width: 160 }}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>

      <div className="ornate card">
        {db.fieldDefs.length === 0 ? (
          <div className="empty-hint">No custom fields yet.</div>
        ) : (
          <div className="list-rows">
            {db.fieldDefs.map((f, i) => (
              <div className="list-row ornate" key={f.id} style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(f.id, -1)}>▲</button>
                  <button className="icon-btn" disabled={i === db.fieldDefs.length - 1} onClick={() => move(f.id, 1)}>▼</button>
                </div>
                <div className="grow">
                  <input type="text" value={f.label} onChange={(e) => patch(f.id, { label: e.target.value })} />
                  <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>key: {f.key}</div>
                  {f.type === "dropdown" && <OptionsEditor def={f} onChange={(options) => patch(f.id, { options })} />}
                </div>
                <select value={f.type} onChange={(e) => changeType(f.id, e.target.value as FieldType)} style={{ width: 140 }}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button className="btn tiny danger" onClick={() => remove(f.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionsEditor({ def, onChange }: { def: FieldDef; onChange: (options: string[]) => void }) {
  const options = def.options ?? [];
  const [draft, setDraft] = useState("");
  function addOpt() {
    const v = draft.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setDraft("");
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Options</div>
      <div className="chip-wrap" style={{ marginBottom: 6 }}>
        {options.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No options yet.</span>}
        {options.map((o) => (
          <span key={o} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {o}
            <button className="icon-btn" style={{ fontSize: 11, padding: "0 2px" }} onClick={() => onChange(options.filter((x) => x !== o))}>✕</button>
          </span>
        ))}
      </div>
      <div className="inline-add">
        <input type="text" placeholder="Add option…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOpt()} style={{ maxWidth: 220 }} />
        <button className="btn tiny" onClick={addOpt}>Add</button>
      </div>
    </div>
  );
}
