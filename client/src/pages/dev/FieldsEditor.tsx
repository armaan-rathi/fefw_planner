import { useEffect, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { OPTION_SOURCES, sourceLabel } from "../../data/fields";
import { ImageDrop } from "../../components/ImageDrop";
import type { FieldDef, FieldType, OptionsSource } from "../../types";

const TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "longtext", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown (single-select)" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
];

const isSelect = (t: FieldType) => t === "dropdown" || t === "multiselect";

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
      d.fieldDefs.push({ id: uid("f_"), key: k, label: l, type, ...(isSelect(type) ? { options: [] } : {}) });
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
  // Rename an existing dropdown/multiselect option in place, and carry the change
  // through to every unit that already stored the old value.
  function renameOption(def: FieldDef, oldVal: string, newVal: string) {
    const nv = newVal.trim();
    if (!nv || nv === oldVal) return;
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === def.id);
      if (!f || !f.options) return;
      const idx = f.options.indexOf(oldVal);
      if (idx < 0 || f.options.includes(nv)) return; // gone, or would duplicate
      f.options[idx] = nv;
      if (f.optionImages && f.optionImages[oldVal] !== undefined) {
        f.optionImages[nv] = f.optionImages[oldVal];
        delete f.optionImages[oldVal];
      }
      for (const u of d.units) {
        const cur = u.fields?.[f.key];
        if (cur === undefined) continue;
        if (Array.isArray(cur)) u.fields[f.key] = cur.map((x) => (x === oldVal ? nv : x));
        else if (cur === oldVal) u.fields[f.key] = nv;
      }
    });
  }
  function changeType(id: string, t: FieldType) {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === id);
      if (!f) return;
      f.type = t;
      if (isSelect(t) && !f.options && !f.optionsSource) f.options = [];
      if (!isSelect(t)) delete f.optionsSource;
    });
  }
  function setSource(id: string, source: OptionsSource | "") {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === id);
      if (!f) return;
      if (source) {
        f.optionsSource = source;
        delete f.options; // options now come from the entity list
      } else {
        delete f.optionsSource;
        if (!f.options) f.options = [];
      }
    });
  }
  function remove(id: string) {
    if (!confirm("Remove this field? Existing values stay stored but are hidden.")) return;
    update((d) => {
      d.fieldDefs = d.fieldDefs.filter((f) => f.id !== id);
    });
  }
  // Remove one dropdown/multiselect option, cleaning up any image for it.
  function removeOption(def: FieldDef, value: string) {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === def.id);
      if (!f || !f.options) return;
      f.options = f.options.filter((o) => o !== value);
      if (f.optionImages) {
        delete f.optionImages[value];
        if (Object.keys(f.optionImages).length === 0) delete f.optionImages;
      }
    });
  }
  // Attach (or clear) an uploaded image for one option value.
  function setOptionImage(def: FieldDef, value: string, url: string | null) {
    update((d) => {
      const f = d.fieldDefs.find((x) => x.id === def.id);
      if (!f) return;
      if (url) {
        if (!f.optionImages) f.optionImages = {};
        f.optionImages[value] = url;
      } else if (f.optionImages) {
        delete f.optionImages[value];
        if (Object.keys(f.optionImages).length === 0) delete f.optionImages;
      }
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
                  {isSelect(f.type) && (
                    <div style={{ marginTop: 8 }}>
                      <label className="row" style={{ gap: 8, fontSize: 12.5 }}>
                        <span className="muted">Options from</span>
                        <select
                          value={f.optionsSource ?? ""}
                          onChange={(e) => setSource(f.id, e.target.value as OptionsSource | "")}
                          style={{ width: 180 }}
                        >
                          <option value="">Custom list</option>
                          {OPTION_SOURCES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </label>
                      {f.optionsSource ? (
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                          Options come from your <b>{sourceLabel(f.optionsSource)}</b> — new ones appear automatically.
                        </div>
                      ) : (
                        <OptionsEditor
                          def={f}
                          onChange={(options) => patch(f.id, { options })}
                          onRename={(oldVal, newVal) => renameOption(f, oldVal, newVal)}
                          onRemove={(value) => removeOption(f, value)}
                          onSetImage={(value, url) => setOptionImage(f, value, url)}
                        />
                      )}
                    </div>
                  )}
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

function OptionsEditor({
  def,
  onChange,
  onRename,
  onRemove,
  onSetImage,
}: {
  def: FieldDef;
  onChange: (options: string[]) => void;
  onRename: (oldVal: string, newVal: string) => void;
  onRemove: (value: string) => void;
  onSetImage: (value: string, url: string | null) => void;
}) {
  const options = def.options ?? [];
  const images = def.optionImages ?? {};
  const [draft, setDraft] = useState("");
  function addOpt() {
    const v = draft.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setDraft("");
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
        Options — edit the text to rename one (units keep their value automatically). Use ▲▼ to reorder. Add an optional image to show instead of the text (the name appears on hover).
      </div>
      <div className="stack" style={{ gap: 6, marginBottom: 8 }}>
        {options.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No options yet.</span>}
        {options.map((o, i) => (
          <OptionRow
            key={o}
            value={o}
            image={images[o] ?? null}
            exists={(v) => options.includes(v)}
            onRename={(newVal) => onRename(o, newVal)}
            onRemove={() => onRemove(o)}
            onImage={(url) => onSetImage(o, url)}
            onMove={(dir) => move(i, dir)}
            canUp={i > 0}
            canDown={i < options.length - 1}
          />
        ))}
      </div>
      <div className="inline-add">
        <input type="text" placeholder="Add option…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOpt()} style={{ maxWidth: 220 }} />
        <button className="btn tiny" onClick={addOpt}>Add</button>
      </div>
    </div>
  );
}

function OptionRow({
  value,
  image,
  exists,
  onRename,
  onRemove,
  onImage,
  onMove,
  canUp,
  canDown,
}: {
  value: string;
  image: string | null;
  exists: (v: string) => boolean;
  onRename: (newVal: string) => void;
  onRemove: () => void;
  onImage: (url: string | null) => void;
  onMove: (dir: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [text, setText] = useState(value);
  // Keep the field in sync if the value changes elsewhere.
  useEffect(() => setText(value), [value]);
  function commit() {
    const v = text.trim();
    if (!v || v === value || exists(v)) {
      setText(value); // reset invalid / duplicate / unchanged edits
      return;
    }
    onRename(v);
  }
  return (
    <div className="row" style={{ gap: 6, alignItems: "center" }}>
      <span className="row" style={{ gap: 2 }}>
        <button className="icon-btn" title="Move up" disabled={!canUp} onClick={() => onMove(-1)}>▲</button>
        <button className="icon-btn" title="Move down" disabled={!canDown} onClick={() => onMove(1)}>▼</button>
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setText(value); e.currentTarget.blur(); }
        }}
        style={{ maxWidth: 220 }}
      />
      <div style={{ width: 64 }}>
        <ImageDrop value={image} onChange={onImage} height={44} label="Image" />
      </div>
      <button className="btn tiny danger" title="Remove option" onClick={onRemove}>✕</button>
    </div>
  );
}
