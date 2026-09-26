import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { UnitPortrait } from "../../components/UnitPortrait";
import { isRecruitable, recruitableUnits } from "../../data/recruitment";
import { PARALOGUE_LORDS } from "../../types";
import type { DB, RecruitCondition, Unit } from "../../types";

type Route = DB["routes"][number];

export function RecruitmentEditor() {
  const { db, update } = useDB();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const ordered = recruitableUnits(db);

  function setCond(unitId: string, routeId: string, patch: Partial<RecruitCondition>) {
    update((d) => {
      const u = d.units.find((x) => x.id === unitId);
      if (!u) return;
      const rec = { ...(u.recruitment ?? {}) };
      const cur: RecruitCondition = { ...(rec[routeId] ?? {}), ...patch };
      if (cur.support === undefined) delete cur.support;
      if (cur.renown === undefined) delete cur.renown;
      if (!cur.negotiation) delete cur.negotiation;
      if (!cur.paralogue) delete cur.paralogue;
      if (!cur.requirement) delete cur.requirement;
      if (!cur.extra) delete cur.extra;
      if (Object.keys(cur).length === 0) delete rec[routeId];
      else rec[routeId] = cur;
      u.recruitment = rec;
    });
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    update((d) => {
      const ids = recruitableUnits(d).map((u) => u.id);
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(toId);
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      d.recruitmentOrder = ids;
    });
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return db.units.filter((u) => !q || u.name.toLowerCase().includes(q));
  }, [db.units, query]);

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title" style={{ marginTop: 0 }}>Order on the Recruitment page</h3>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Drag to rearrange. Only units with recruitment info appear here (and on the page).</p>
        {ordered.length === 0 ? (
          <div className="empty-hint">No recruitable units yet — add conditions below.</div>
        ) : (
          <div className="recruit-order">
            {ordered.map((u) => (
              <div
                key={u.id}
                className={"recruit-order-chip" + (dragId === u.id ? " dragging" : "")}
                draggable
                onDragStart={() => setDragId(u.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, u.id); setDragId(null); }}
                title="Drag to reorder"
              >
                <UnitPortrait src={u.portrait} name={u.name} size={30} />
                <span>{u.name || "Unnamed"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ornate card">
        <div className="spread" style={{ marginBottom: 6 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Recruitment conditions</h3>
          <input type="text" placeholder="Search units…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Click a unit to edit its conditions per route. Filling anything makes it show on the page. Clearing everything removes it.</p>
        <div className="stack" style={{ gap: 6 }}>
          {filtered.map((u) => {
            const open = openId === u.id;
            return (
              <div className="ornate card" key={u.id} style={{ padding: 10 }}>
                <button className="spread recruit-edit-head" onClick={() => setOpenId(open ? null : u.id)}>
                  <span className="row" style={{ gap: 9 }}>
                    <UnitPortrait src={u.portrait} name={u.name} size={32} />
                    <b>{u.name || "Unnamed"}</b>
                    {isRecruitable(db, u) && <span className="tag">on page</span>}
                  </span>
                  <span className="muted">{open ? "▲" : "▼"}</span>
                </button>
                {open && <CondTable unit={u} routes={db.routes} setCond={(rid, p) => setCond(u.id, rid, p)} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CondTable({ unit, routes, setCond }: { unit: Unit; routes: Route[]; setCond: (routeId: string, patch: Partial<RecruitCondition>) => void }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table className="rate-table">
        <thead>
          <tr>
            <th>Lord</th>
            <th style={{ width: 120 }}>Support Lv.</th>
            <th style={{ width: 120 }}>Renown Lv.</th>
            <th style={{ minWidth: 220 }}>Requirement</th>
            <th style={{ width: 140 }}>Paralogue</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r) => {
            const cond = unit.recruitment?.[r.id] ?? {};
            return (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name || r.id}</td>
                <td><input type="number" value={cond.support ?? ""} onChange={(e) => setCond(r.id, { support: e.target.value === "" ? undefined : Number(e.target.value) })} /></td>
                <td><input type="number" value={cond.renown ?? ""} onChange={(e) => setCond(r.id, { renown: e.target.value === "" ? undefined : Number(e.target.value) })} /></td>
                <td><input type="text" value={cond.requirement ?? ""} onChange={(e) => setCond(r.id, { requirement: e.target.value || undefined })} /></td>
                <td>
                  <select value={cond.paralogue ?? ""} onChange={(e) => setCond(r.id, { paralogue: e.target.value || undefined })}>
                    <option value="">—</option>
                    {PARALOGUE_LORDS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
