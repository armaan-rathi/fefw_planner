import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Modal } from "../../components/Modal";
import { UnitPortrait } from "../../components/UnitPortrait";
import { ImageDrop } from "../../components/ImageDrop";
import { SkillMark } from "../../components/icons";
import { unitFaction } from "../../data/units";
import { fieldOptions } from "../../data/fields";
import { GRADES, NEGOTIATIONS, type FieldValue, type Grade, type Negotiation, type RecruitCondition, type Unit } from "../../types";

function blankUnit(): Unit {
  return {
    id: uid("unit_"),
    name: "",
    portrait: null,
    isLord: false,
    routeIds: [],
    starterFor: [],
    classId: null,
    boons: [],
    banes: [],
    skillLevels: {},
    personalSkill: { name: "", description: "" },
    fields: {},
  };
}

export function UnitsEditor() {
  const { db, update } = useDB();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return db.units;
    return db.units.filter((u) => (u.name + " " + unitFaction(u)).toLowerCase().includes(q));
  }, [db.units, query]);

  function save(u: Unit) {
    update((d) => {
      const i = d.units.findIndex((x) => x.id === u.id);
      if (i >= 0) d.units[i] = u;
      else d.units.push(u);
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this unit?")) return;
    update((d) => {
      d.units = d.units.filter((u) => u.id !== id);
    });
  }
  function move(id: string, dir: -1 | 1) {
    update((d) => {
      const i = d.units.findIndex((u) => u.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.units.length) return;
      [d.units[i], d.units[j]] = [d.units[j], d.units[i]];
    });
  }
  // Turn a unit into an Important NPC: delete the unit, create an NPC carrying
  // name, portrait, faction (as subtitle) and personal-skill text (as description).
  function convertToNpc(u: Unit) {
    if (!confirm(`Convert "${u.name || "this unit"}" into an Important NPC?\n\nThe unit will be deleted and re-created as an NPC.`)) return;
    update((d) => {
      d.units = d.units.filter((x) => x.id !== u.id);
      const arr = d.npcs ?? [];
      arr.push({
        id: uid("cast_"),
        name: u.name,
        portrait: u.portrait,
        subtitle: unitFaction(u),
        description: u.personalSkill.description || "",
      });
      d.npcs = arr;
    });
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 14 }}>
        <input type="text" placeholder="Search units…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
        <button className="btn primary" onClick={() => setEditing(blankUnit())}>+ New Unit</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint">
          {db.units.length === 0 ? "No units yet. Create your first one." : "No units match your search."}
        </div>
      ) : (
        <div className="grid-cards">
          {filtered.map((u) => {
            const cls = db.classes.find((c) => c.id === u.classId);
            return (
              <div className="ornate card" key={u.id}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <UnitPortrait src={u.portrait} name={u.name} size={52} />
                  <div className="grow">
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ fontWeight: 700 }}>{u.name || "Unnamed"}</span>
                      {u.isLord && <span className="tag">♛ Lord</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>{[unitFaction(u), cls?.name].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                </div>
                <div className="chip-wrap" style={{ marginBottom: 8 }}>
                  {u.routeIds.length === 0 ? (
                    <span className="tag dim">All routes</span>
                  ) : (
                    u.routeIds.map((rid) => {
                      const r = db.routes.find((x) => x.id === rid);
                      return r ? <span className="tag" key={rid} style={{ borderColor: r.color, color: r.color }}>{r.name}</span> : null;
                    })
                  )}
                  {u.starterFor.map((rid) => {
                    const r = db.routes.find((x) => x.id === rid);
                    return r ? <span className="tag" key={"s" + rid} style={{ borderColor: r.color, color: r.color }}>⚑ Starts {r.name}</span> : null;
                  })}
                </div>
                <div className="row">
                  <button className="btn tiny" onClick={() => setEditing(u)}>Edit</button>
                  <button className="btn tiny" title="Delete this unit and re-create it as an Important NPC" onClick={() => convertToNpc(u)}>→ NPC</button>
                  <button className="btn tiny danger" onClick={() => remove(u.id)}>Delete</button>
                  {!query && (
                    <span className="row" style={{ gap: 2, marginLeft: "auto" }}>
                      <button className="icon-btn" title="Move earlier" disabled={db.units[0]?.id === u.id} onClick={() => move(u.id, -1)}>▲</button>
                      <button className="icon-btn" title="Move later" disabled={db.units[db.units.length - 1]?.id === u.id} onClick={() => move(u.id, 1)}>▼</button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <UnitModal unit={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function UnitModal({ unit, onClose, onSave }: { unit: Unit; onClose: () => void; onSave: (u: Unit) => void }) {
  const { db } = useDB();
  const [draft, setDraft] = useState<Unit>(() => JSON.parse(JSON.stringify(unit)));
  const set = (p: Partial<Unit>) => setDraft((d) => ({ ...d, ...p }));

  function toggleRoute(id: string) {
    setDraft((d) => ({
      ...d,
      routeIds: d.routeIds.includes(id) ? d.routeIds.filter((x) => x !== id) : [...d.routeIds, id],
    }));
  }
  function toggleStarter(id: string) {
    setDraft((d) => ({
      ...d,
      starterFor: d.starterFor.includes(id) ? d.starterFor.filter((x) => x !== id) : [...d.starterFor, id],
    }));
  }
  function toggleBoon(id: string) {
    setDraft((d) => {
      const has = d.boons.includes(id);
      return { ...d, boons: has ? d.boons.filter((x) => x !== id) : [...d.boons, id], banes: d.banes.filter((x) => x !== id) };
    });
  }
  function toggleBane(id: string) {
    setDraft((d) => {
      const has = d.banes.includes(id);
      return { ...d, banes: has ? d.banes.filter((x) => x !== id) : [...d.banes, id], boons: d.boons.filter((x) => x !== id) };
    });
  }
  function setGrade(id: string, g: Grade | "") {
    setDraft((d) => {
      const skillLevels = { ...d.skillLevels };
      if (g) skillLevels[id] = g;
      else delete skillLevels[id];
      return { ...d, skillLevels };
    });
  }
  function setField(key: string, value: FieldValue) {
    setDraft((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  }
  // Merge a patch into one lord's recruitment condition, dropping empty entries
  // so the display's "only show what's filled" logic stays trivial.
  function setRecruit(routeId: string, patch: Partial<RecruitCondition>) {
    setDraft((d) => {
      const rec = { ...(d.recruitment ?? {}) };
      const cur: RecruitCondition = { ...(rec[routeId] ?? {}), ...patch };
      if (cur.support === undefined) delete cur.support;
      if (cur.renown === undefined) delete cur.renown;
      if (!cur.negotiation) delete cur.negotiation;
      if (Object.keys(cur).length === 0) delete rec[routeId];
      else rec[routeId] = cur;
      return { ...d, recruitment: rec };
    });
  }

  return (
    <Modal
      open
      wide
      title={unit.name ? `Edit ${unit.name}` : "New Unit"}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(draft)}>Save Unit</button>
        </>
      }
    >
      <div className="two-col">
        <div>
          <label className="field"><span>Name</span>
            <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field"><span>Default class</span>
            <select value={draft.classId ?? ""} onChange={(e) => set({ classId: e.target.value || null })}>
              <option value="">— None —</option>
              {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="dev-toggle" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={draft.isLord} onChange={(e) => set({ isLord: e.target.checked })} />
            <span>Is lord? (route leader)</span>
          </label>
          <label className="dev-toggle" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={!!draft.postTimeskip} onChange={(e) => set({ postTimeskip: e.target.checked })} />
            <span>Post-Timeskip Only</span>
          </label>
          <label className="dev-toggle" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={!!draft.possiblyEnemyOnly} onChange={(e) => set({ possiblyEnemyOnly: e.target.checked })} />
            <span>Possibly Enemy Only</span>
          </label>
        </div>
        <div>
          <label className="field"><span>Portrait</span></label>
          <ImageDrop value={draft.portrait} onChange={(url) => set({ portrait: url })} height={170} />
        </div>
      </div>

      <div className="divider" />
      <h3 className="section-title">Locked to routes</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Which routes this unit is <b>recruitable</b> on. None selected = available on every route.
      </p>
      <div className="chip-wrap">
        {db.routes.map((r) => (
          <span key={r.id} className={"chip-toggle" + (draft.routeIds.includes(r.id) ? " on" : "")} onClick={() => toggleRoute(r.id)}
            style={draft.routeIds.includes(r.id) ? { borderColor: r.color, color: r.color } : undefined}>
            {r.name}
          </span>
        ))}
        {db.routes.length === 0 && <span className="muted">No routes defined.</span>}
      </div>

      <div className="divider" />
      <h3 className="section-title">Starts on routes (default team member)</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Which routes this unit <b>begins on</b> — independent of lock. A unit can start on one route yet still be recruitable on others.
      </p>
      <div className="chip-wrap">
        {db.routes.map((r) => (
          <span key={r.id} className={"chip-toggle" + (draft.starterFor.includes(r.id) ? " on" : "")} onClick={() => toggleStarter(r.id)}
            style={draft.starterFor.includes(r.id) ? { borderColor: r.color, color: r.color } : undefined}>
            ⚑ {r.name}
          </span>
        ))}
        {db.routes.length === 0 && <span className="muted">No routes defined.</span>}
      </div>

      <div className="divider" />
      <h3 className="section-title">Proficiencies — boons, banes &amp; skill levels</h3>
      <div className="prof-legend" style={{ marginTop: 0, marginBottom: 10 }}>
        <span><i className="swatch-boon" />Boon (strength)</span>
        <span><i className="swatch-bane" />Bane (weakness)</span>
      </div>
      <table className="rate-table">
        <thead>
          <tr><th>Skill</th><th style={{ width: 80 }}>Boon</th><th style={{ width: 80 }}>Bane</th><th style={{ width: 110 }}>Level</th></tr>
        </thead>
        <tbody>
          {db.skillTypes.map((st) => (
            <tr key={st.id}>
              <td>
                <span className="row" style={{ gap: 8 }}>
                  <SkillMark type={st} size={18} /> {st.label}
                </span>
              </td>
              <td>
                <span className={"chip-toggle boon" + (draft.boons.includes(st.id) ? " on" : "")} onClick={() => toggleBoon(st.id)}>▲</span>
              </td>
              <td>
                <span className={"chip-toggle bane" + (draft.banes.includes(st.id) ? " on" : "")} onClick={() => toggleBane(st.id)}>▼</span>
              </td>
              <td>
                <select value={draft.skillLevels[st.id] ?? ""} onChange={(e) => setGrade(st.id, e.target.value as Grade | "")}>
                  <option value="">—</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {db.skillTypes.length === 0 && <span className="muted">No skill types defined.</span>}

      <div className="divider" />
      <h3 className="section-title">Personal skill</h3>
      <div className="two-col">
        <label className="field"><span>Name</span>
          <input type="text" value={draft.personalSkill.name} onChange={(e) => set({ personalSkill: { ...draft.personalSkill, name: e.target.value } })} />
        </label>
        <label className="field"><span>Effect</span>
          <input type="text" value={draft.personalSkill.description} onChange={(e) => set({ personalSkill: { ...draft.personalSkill, description: e.target.value } })} />
        </label>
      </div>

      <div className="divider" />
      <h3 className="section-title">Recruitment Conditions</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Per-lord conditions to recruit this unit. Leave anything blank to hide it — the character page shows only the lords and requirements you fill in.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="rate-table">
          <thead>
            <tr>
              <th>Lord</th>
              <th style={{ width: 120 }}>Support Lv.</th>
              <th style={{ width: 120 }}>Renown Lv.</th>
              <th style={{ width: 150 }}>Negotiation</th>
            </tr>
          </thead>
          <tbody>
            {db.routes.map((r) => {
              const cond = draft.recruitment?.[r.id] ?? {};
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name || r.id}</td>
                  <td>
                    <input type="number" value={cond.support ?? ""} onChange={(e) => setRecruit(r.id, { support: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </td>
                  <td>
                    <input type="number" value={cond.renown ?? ""} onChange={(e) => setRecruit(r.id, { renown: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </td>
                  <td>
                    <select value={cond.negotiation ?? ""} onChange={(e) => setRecruit(r.id, { negotiation: (e.target.value || undefined) as Negotiation | undefined })}>
                      <option value="">—</option>
                      {NEGOTIATIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
            {db.routes.length === 0 && <tr><td colSpan={4}><span className="muted">No routes / lords defined.</span></td></tr>}
          </tbody>
        </table>
      </div>

      {db.fieldDefs.length > 0 && (
        <>
          <div className="divider" />
          <h3 className="section-title">Details</h3>
          {db.fieldDefs.map((f) => {
            const val = draft.fields[f.key];
            if (f.type === "checkbox") {
              return (
                <label className="dev-toggle" key={f.id} style={{ marginBottom: 12 }}>
                  <input type="checkbox" checked={val === true} onChange={(e) => setField(f.key, e.target.checked)} />
                  <span>{f.label}</span>
                </label>
              );
            }
            if (f.type === "multiselect") {
              const arr = Array.isArray(val) ? val : [];
              const opts = fieldOptions(db, f);
              return (
                <div className="field" key={f.id}>
                  <span style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 5 }}>{f.label}</span>
                  {opts.length === 0 ? (
                    <span className="muted" style={{ fontSize: 12 }}>No options — add some in Unit Fields.</span>
                  ) : (
                    <div className="chip-wrap">
                      {opts.map((o) => {
                        const on = arr.includes(o.value);
                        return (
                          <span
                            key={o.value}
                            className={"chip-toggle" + (on ? " on" : "")}
                            onClick={() => setField(f.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
                          >
                            {o.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <label className="field" key={f.id}>
                <span>{f.label}</span>
                {f.type === "longtext" ? (
                  <textarea value={typeof val === "string" ? val : ""} onChange={(e) => setField(f.key, e.target.value)} />
                ) : f.type === "dropdown" ? (
                  <select value={typeof val === "string" ? val : ""} onChange={(e) => setField(f.key, e.target.value)}>
                    <option value="">— None —</option>
                    {fieldOptions(db, f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={typeof val === "string" ? val : ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </>
      )}
    </Modal>
  );
}
