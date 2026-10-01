import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { GROWTH_LABELS, GROWTH_STATS } from "../../types";
import type { GrowthStat, Mount, MountAbility } from "../../types";
import { mountTypeOrder } from "../../data/mounts";

function blankMount(): Mount {
  return { id: uid("mount_"), type: "", name: "", stats: {}, growths: {}, abilities: [], location: "" };
}

export function MountsEditor() {
  const { db, update } = useDB();
  const [editing, setEditing] = useState<Mount | null>(null);

  function save(m: Mount) {
    update((d) => {
      const arr = d.mounts ?? [];
      const i = arr.findIndex((x) => x.id === m.id);
      if (i >= 0) arr[i] = m;
      else arr.push(m);
      d.mounts = arr;
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this mount?")) return;
    update((d) => { d.mounts = (d.mounts ?? []).filter((m) => m.id !== id); });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const arr = d.mounts ?? [];
      const i = arr.findIndex((m) => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  }

  const mounts = db.mounts ?? [];
  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Mounts ({mounts.length})</h3>
        <button className="btn primary" onClick={() => setEditing(blankMount())}>+ New Mount</button>
      </div>
      {mounts.length === 0 && <div className="empty-hint">No mounts yet.</div>}
      <div className="stack" style={{ gap: 6 }}>
        {mounts.map((m) => (
          <div className="ornate card spread" key={m.id} style={{ padding: 10 }}>
            <span><b>{m.name || "Unnamed"}</b> <span className="muted" style={{ marginLeft: 6 }}>{m.type || "—"}</span></span>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn ghost" onClick={() => move(m.id, -1)}>▲</button>
              <button className="btn ghost" onClick={() => move(m.id, 1)}>▼</button>
              <button className="btn" onClick={() => setEditing(m)}>Edit</button>
              <button className="btn danger" onClick={() => remove(m.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
      {editing && <MountModal mount={editing} types={mountTypeOrder(db)} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function MountModal({ mount, types, onClose, onSave }: { mount: Mount; types: string[]; onClose: () => void; onSave: (m: Mount) => void }) {
  const [draft, setDraft] = useState<Mount>(() => JSON.parse(JSON.stringify(mount)));
  const set = (p: Partial<Mount>) => setDraft((d) => ({ ...d, ...p }));

  function setStat(field: "stats" | "growths", stat: GrowthStat, val: number | undefined) {
    setDraft((d) => {
      const g = { ...(d[field] ?? {}) };
      if (val === undefined) delete g[stat];
      else g[stat] = val;
      return { ...d, [field]: g };
    });
  }
  function setAbility(i: number, patch: Partial<MountAbility>) {
    setDraft((d) => {
      const abilities = [...(d.abilities ?? [])];
      abilities[i] = { ...abilities[i], ...patch };
      return { ...d, abilities };
    });
  }
  function addAbility() { setDraft((d) => ({ ...d, abilities: [...(d.abilities ?? []), { name: "", effect: "" }] })); }
  function removeAbility(i: number) { setDraft((d) => ({ ...d, abilities: (d.abilities ?? []).filter((_, k) => k !== i) })); }

  function handleSave() {
    onSave({ ...draft, abilities: (draft.abilities ?? []).filter((a) => a.name || a.effect) });
  }

  const statGrid = (field: "stats" | "growths", percent: boolean) => (
    <div className="chip-wrap">
      {GROWTH_STATS.map((k) => (
        <label key={k} className="field" style={{ width: 70 }}>
          <span>{GROWTH_LABELS[k]}{percent ? " %" : ""}</span>
          <input
            type="number"
            value={draft[field]?.[k] ?? ""}
            onChange={(e) => setStat(field, k, e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  );

  return (
    <Modal
      open
      wide
      title={mount.name ? `Edit ${mount.name}` : "New Mount"}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={handleSave}>Save</button>
      </>}
    >
      <div className="two-col">
        <label className="field"><span>Type</span>
          <input type="text" list="mount-types" value={draft.type} onChange={(e) => set({ type: e.target.value })} placeholder="Horse, Ornius, …" />
          <datalist id="mount-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="field"><span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
      </div>

      <label className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
        <input type="checkbox" checked={!!draft.part3} onChange={(e) => set({ part3: e.target.checked })} />
        <span>Part 3 exclusive (hidden unless the spoiler toggle is on)</span>
      </label>

      <div className="divider" />
      <h3 className="section-title">Bond Lv. 5 stat bonuses</h3>
      {statGrid("stats", false)}

      <div className="divider" />
      <h3 className="section-title">Bond Lv. 5 growth bonuses (%)</h3>
      {statGrid("growths", true)}

      <div className="divider" />
      <div className="spread">
        <h3 className="section-title" style={{ margin: 0 }}>Abilities</h3>
        <button className="btn" onClick={addAbility}>+ Add ability</button>
      </div>
      <div className="stack" style={{ gap: 6, marginTop: 6 }}>
        {(draft.abilities ?? []).map((a, i) => (
          <div className="row" key={i} style={{ gap: 6 }}>
            <input type="text" placeholder="Name" value={a.name} onChange={(e) => setAbility(i, { name: e.target.value })} style={{ width: 180 }} />
            <input type="text" placeholder="Effect" value={a.effect} onChange={(e) => setAbility(i, { effect: e.target.value })} style={{ flex: 1 }} />
            <button className="btn danger" onClick={() => removeAbility(i)}>✕</button>
          </div>
        ))}
        {(draft.abilities ?? []).length === 0 && <span className="muted" style={{ fontSize: 12 }}>No abilities.</span>}
      </div>

      <div className="divider" />
      <label className="field"><span>Location</span>
        <textarea value={draft.location} onChange={(e) => set({ location: e.target.value })} rows={2} />
      </label>
    </Modal>
  );
}
