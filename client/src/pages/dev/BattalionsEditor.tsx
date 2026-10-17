import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { statPairs } from "../../data/mounts";
import { BATTALION_CATEGORIES, BATTALION_RANKS, GROWTH_LABELS, GROWTH_STATS } from "../../types";
import type { Battalion, GrowthStat } from "../../types";

function blankBattalion(): Battalion {
  return { id: uid("batt_"), name: "", category: BATTALION_CATEGORIES[0], rank: "C", gatherLimit: 0, ability: "", stats: {}, location: "" };
}

export function BattalionsEditor() {
  const { db, update } = useDB();
  const [cat, setCat] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Battalion | null>(null);

  const battalions = db.battalions ?? [];
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return battalions.filter((b) => (cat === "All" || b.category === cat) && (!q || b.name.toLowerCase().includes(q)));
  }, [battalions, cat, query]);

  function save(b: Battalion) {
    update((d) => {
      const arr = d.battalions ?? [];
      const i = arr.findIndex((x) => x.id === b.id);
      if (i >= 0) arr[i] = b; else arr.push(b);
      d.battalions = arr;
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this battalion?")) return;
    update((d) => { d.battalions = (d.battalions ?? []).filter((b) => b.id !== id); });
  }

  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <h3 className="section-title" style={{ margin: 0 }}>Battalions</h3>
          <label className="field" style={{ margin: 0 }}>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="All">All categories</option>
              {BATTALION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <input type="text" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 200 }} />
          <span className="muted" style={{ fontSize: 12 }}>{shown.length} shown · {battalions.length} total</span>
        </div>
        <button className="btn primary" onClick={() => setEditing(blankBattalion())}>+ New Battalion</button>
      </div>

      {shown.length === 0 && <div className="empty-hint">No battalions match.</div>}
      <div className="stack" style={{ gap: 6 }}>
        {shown.map((b) => (
          <div className="ornate card spread" key={b.id} style={{ padding: 10, alignItems: "center" }}>
            <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <b>{b.name || "Unnamed"}</b>
              <span className="tag">{b.category}</span>
              <span className="tag">Rank {b.rank}</span>
              <span className="muted" style={{ fontSize: 12 }}>· {b.ability || "—"} · {statPairs(b.stats, false).map((p) => `${p.value} ${p.label}`).join(", ") || "no stats"}</span>
            </span>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn tiny" onClick={() => setEditing(b)}>Edit</button>
              <button className="btn tiny danger" onClick={() => remove(b.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>

      {editing && <BattalionModal battalion={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function BattalionModal({ battalion, onClose, onSave }: { battalion: Battalion; onClose: () => void; onSave: (b: Battalion) => void }) {
  const [draft, setDraft] = useState<Battalion>(() => JSON.parse(JSON.stringify(battalion)));
  const set = (p: Partial<Battalion>) => setDraft((d) => ({ ...d, ...p }));
  function setStat(stat: GrowthStat, val: number | undefined) {
    setDraft((d) => {
      const s = { ...(d.stats ?? {}) };
      if (val === undefined) delete s[stat]; else s[stat] = val;
      return { ...d, stats: s };
    });
  }

  return (
    <Modal open wide title={battalion.name ? `Edit ${battalion.name}` : "New Battalion"} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => onSave(draft)}>Save</button></>}>
      <div className="two-col">
        <label className="field"><span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field"><span>Category</span>
          <select value={draft.category} onChange={(e) => set({ category: e.target.value })}>
            {BATTALION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="two-col">
        <label className="field"><span>Rank requirement</span>
          <select value={draft.rank} onChange={(e) => set({ rank: e.target.value })}>
            {BATTALION_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="field"><span>Gather limit</span>
          <input type="number" value={draft.gatherLimit} onChange={(e) => set({ gatherLimit: Number(e.target.value) })} />
        </label>
      </div>
      <label className="field"><span>Ability</span>
        <input type="text" value={draft.ability} onChange={(e) => set({ ability: e.target.value })} />
      </label>

      <div className="divider" />
      <h3 className="section-title">Stat bonuses</h3>
      <div className="chip-wrap">
        {GROWTH_STATS.map((k) => (
          <label key={k} className="field" style={{ width: 66 }}>
            <span>{GROWTH_LABELS[k]}</span>
            <input type="number" value={draft.stats?.[k] ?? ""} onChange={(e) => setStat(k, e.target.value === "" ? undefined : Number(e.target.value))} />
          </label>
        ))}
      </div>

      <div className="divider" />
      <label className="field"><span>Location</span>
        <textarea value={draft.location} onChange={(e) => set({ location: e.target.value })} rows={2} />
      </label>
    </Modal>
  );
}
