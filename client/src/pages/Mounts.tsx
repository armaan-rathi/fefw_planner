import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { mountColor, mountsByType, statPairs } from "../data/mounts";
import type { Growths, Mount } from "../types";

type View = "table" | "detail";

export function Mounts() {
  const { db } = useDB();
  const [view, setView] = useState<View>("table");
  const groups = useMemo(() => mountsByType(db), [db]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Mounts</h2>
          <p>Bond Lv. 5 stat &amp; growth bonuses, abilities, and where to find each mount.</p>
        </div>
      </div>

      <div className="cast-tabs">
        <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table</button>
        <button className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}>By Mount</button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-hint">No mounts yet. Add them in Dev Mode → Mounts.</div>
      ) : view === "table" ? (
        <MountTable groups={groups} />
      ) : (
        <MountDetailView groups={groups} />
      )}
    </div>
  );
}

function StatList({ g, percent }: { g: Growths; percent: boolean }) {
  const pairs = statPairs(g, percent);
  if (pairs.length === 0) return <span className="muted">—</span>;
  return (
    <span className="mount-stats">
      {pairs.map((p) => (
        <span className="mount-stat" key={p.label}><b>{p.value}</b> {p.label}</span>
      ))}
    </span>
  );
}

function AbilityList({ mount }: { mount: Mount }) {
  if (!mount.abilities?.length) return <span className="muted">—</span>;
  return (
    <div className="mount-abilities">
      {mount.abilities.map((a, i) => (
        <div className="mount-ability" key={i}>
          <b>{a.name}</b>{a.effect ? <span className="mount-ability-eff">: {a.effect}</span> : null}
        </div>
      ))}
    </div>
  );
}

// ---- Table view: one big table, grouped by type ----------------------------
function MountTable({ groups }: { groups: { type: string; mounts: Mount[] }[] }) {
  const { db } = useDB();
  return (
    <div className="mount-table-scroll">
      <table className="mount-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Mount</th>
            <th>Bond Lv. 5 Stats</th>
            <th>Bond Lv. 5 Growths</th>
            <th>Abilities</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((grp) => {
            const color = mountColor(db, grp.type);
            return grp.mounts.map((m, i) => (
              <tr key={m.id} style={i === 0 ? { borderTop: `2px solid ${color}` } : undefined}>
                {i === 0 && (
                  <td className="mount-type-cell" rowSpan={grp.mounts.length} style={{ color, borderLeft: `3px solid ${color}` }}>
                    {grp.type}
                  </td>
                )}
                <td className="mount-name-cell">{m.name || "Unnamed"}</td>
                <td><StatList g={m.stats} percent={false} /></td>
                <td><StatList g={m.growths} percent /></td>
                <td><AbilityList mount={m} /></td>
                <td className="mount-loc">{m.location || "—"}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Detail view: type-grouped list on the left, one mount at a time -------
function MountDetailView({ groups }: { groups: { type: string; mounts: Mount[] }[] }) {
  const { db } = useDB();
  const [selId, setSelId] = useState<string>(groups[0]?.mounts[0]?.id ?? "");
  const selected = (db.mounts ?? []).find((m) => m.id === selId) ?? groups[0]?.mounts[0];

  return (
    <div className="mount-detail-layout">
      <div className="mount-list">
        {groups.map((grp) => {
          const color = mountColor(db, grp.type);
          return (
            <div className="mount-list-group" key={grp.type}>
              <div className="mount-list-head" style={{ color, borderColor: color }}>{grp.type}</div>
              {grp.mounts.map((m) => (
                <button
                  key={m.id}
                  className={"mount-list-item" + (m.id === selected?.id ? " active" : "")}
                  onClick={() => setSelId(m.id)}
                >
                  {m.name || "Unnamed"}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {selected && <MountDetail mount={selected} color={mountColor(db, selected.type)} />}
    </div>
  );
}

function MountDetail({ mount, color }: { mount: Mount; color: string }) {
  return (
    <div className="mount-detail ornate card">
      <div className="mount-detail-head">
        <div>
          <h3 className="mount-detail-name">{mount.name || "Unnamed"}</h3>
          <div className="muted" style={{ color }}>{mount.type}</div>
        </div>
      </div>

      <div className="mount-detail-grid">
        <div>
          <div className="cast-detail-label">Bond Lv. 5 Stats</div>
          <StatList g={mount.stats} percent={false} />
        </div>
        <div>
          <div className="cast-detail-label">Bond Lv. 5 Growths</div>
          <StatList g={mount.growths} percent />
        </div>
      </div>

      <div>
        <div className="cast-detail-label">Abilities</div>
        <AbilityList mount={mount} />
      </div>

      <div>
        <div className="cast-detail-label">Location</div>
        <div>{mount.location || "—"}</div>
      </div>
    </div>
  );
}
