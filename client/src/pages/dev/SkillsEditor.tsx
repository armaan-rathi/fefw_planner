import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { SKILL_CATEGORIES } from "../../types";
import type { Skill, SkillUpgrade } from "../../types";

function blankSkill(type: string): Skill {
  return { id: uid("skill_"), type, name: "", description: "" };
}

export function SkillsEditor() {
  const { db, update } = useDB();
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Skill | null>(null);

  const skills = db.skills ?? [];
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return skills.filter((s) => (filter === "All" || s.type === filter) && (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)));
  }, [skills, filter, query]);

  function save(s: Skill) {
    update((d) => {
      const arr = d.skills ?? [];
      const i = arr.findIndex((x) => x.id === s.id);
      if (i >= 0) arr[i] = s;
      else arr.push(s);
      d.skills = arr;
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this skill?")) return;
    update((d) => { d.skills = (d.skills ?? []).filter((s) => s.id !== id); });
  }

  const newType = filter === "All" ? SKILL_CATEGORIES[0] : filter;
  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <h3 className="section-title" style={{ margin: 0 }}>Skills</h3>
          <label className="field" style={{ margin: 0 }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="All">All types</option>
              {SKILL_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <input type="text" placeholder="Search skills…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 220 }} />
          <span className="muted" style={{ fontSize: 12 }}>{shown.length} shown · {skills.length} total</span>
        </div>
        <button className="btn primary" onClick={() => setEditing(blankSkill(newType))}>+ New Skill</button>
      </div>

      {shown.length === 0 && <div className="empty-hint">No skills match.</div>}
      <div className="stack" style={{ gap: 6 }}>
        {shown.map((s) => (
          <div className="ornate card" key={s.id} style={{ padding: 10 }}>
            <div className="spread">
              <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <b>{s.name || "Unnamed"}</b>
                <span className="tag">{s.type}</span>
                {s.plus && <span className="tag" title={`${s.plus.name}: ${s.plus.description}`}>+</span>}
                {s.plusPlus && <span className="tag" title={`${s.plusPlus.name}: ${s.plusPlus.description}`}>++</span>}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn tiny" onClick={() => setEditing(s)}>Edit</button>
                <button className="btn tiny danger" onClick={() => remove(s.id)}>Delete</button>
              </span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{s.description || <span style={{ fontStyle: "italic" }}>No description yet.</span>}</div>
          </div>
        ))}
      </div>

      {editing && <SkillModal skill={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function SkillModal({ skill, onClose, onSave }: { skill: Skill; onClose: () => void; onSave: (s: Skill) => void }) {
  const [draft, setDraft] = useState<Skill>(() => JSON.parse(JSON.stringify(skill)));
  const set = (p: Partial<Skill>) => setDraft((d) => ({ ...d, ...p }));
  const setUp = (key: "plus" | "plusPlus", patch: Partial<SkillUpgrade>) =>
    setDraft((d) => ({ ...d, [key]: { name: "", description: "", ...(d[key] ?? {}), ...patch } }));

  function handleSave() {
    const clean = (u?: SkillUpgrade) => (u && (u.name.trim() || u.description.trim()) ? { name: u.name.trim(), description: u.description.trim() } : undefined);
    onSave({ ...draft, plus: clean(draft.plus), plusPlus: clean(draft.plusPlus) });
  }

  const upgradeBlock = (key: "plus" | "plusPlus", label: string) => (
    <>
      <div className="divider" />
      <h3 className="section-title" style={{ marginBottom: 6 }}>{label} upgrade <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>(leave blank for none)</span></h3>
      <label className="field"><span>Name</span>
        <input type="text" value={draft[key]?.name ?? ""} onChange={(e) => setUp(key, { name: e.target.value })} />
      </label>
      <label className="field"><span>Description</span>
        <textarea value={draft[key]?.description ?? ""} onChange={(e) => setUp(key, { description: e.target.value })} rows={2} />
      </label>
    </>
  );

  return (
    <Modal open wide title={skill.name ? `Edit ${skill.name}` : "New Skill"} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={handleSave}>Save</button></>}>
      <div className="two-col">
        <label className="field"><span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="field"><span>Type</span>
          <select value={draft.type} onChange={(e) => set({ type: e.target.value })}>
            {SKILL_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="field"><span>Description</span>
        <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="No description yet." />
      </label>
      {upgradeBlock("plus", "+")}
      {upgradeBlock("plusPlus", "++")}
    </Modal>
  );
}
