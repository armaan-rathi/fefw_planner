import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { statPairs } from "../data/mounts";
import { BATTALION_CATEGORIES, BATTALION_RANKS } from "../types";
import type { Battalion } from "../types";

type SortKey = "name" | "category" | "rank" | "gatherLimit";
const rankIdx = (r: string) => { const i = BATTALION_RANKS.indexOf(r as (typeof BATTALION_RANKS)[number]); return i < 0 ? 99 : i; };

export function Battalions() {
  const { db } = useDB();
  const [cat, setCat] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [dir, setDir] = useState<1 | -1>(1);

  const rows = useMemo(() => {
    let list = db.battalions ?? [];
    if (cat !== "All") list = list.filter((b) => b.category === cat);
    const cmp = (a: Battalion, b: Battalion) => {
      let c = 0;
      if (sortKey === "rank") c = rankIdx(a.rank) - rankIdx(b.rank);
      else if (sortKey === "gatherLimit") c = (a.gatherLimit ?? 0) - (b.gatherLimit ?? 0);
      else c = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return c * dir || a.name.localeCompare(b.name);
    };
    return [...list].sort(cmp);
  }, [db.battalions, cat, sortKey, dir]);

  function onHead(k: SortKey) {
    if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setDir(1); }
  }
  const arrow = (k: SortKey) => (sortKey === k ? (dir === 1 ? " ▲" : " ▼") : "");
  const Stats = ({ b }: { b: Battalion }) => {
    const pairs = statPairs(b.stats, false);
    return pairs.length ? <span className="mount-stats">{pairs.map((p) => <span className="mount-stat" key={p.label}><b>{p.value}</b> {p.label}</span>)}</span> : <span className="muted">—</span>;
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Battalions</h2>
          <p>Recruitable battalions — rank requirement, gather limit, ability, stat bonuses, and where to find them.</p>
        </div>
      </div>

      <div className="learnset-disclaimer">
        <p style={{ margin: 0 }}>Disclaimer: This list is not complete.</p>
        <p style={{ margin: "2px 0 0" }}>Credit to the <i>Fortune's Weave Learnsets and Info Community Collection Sheet</i></p>
      </div>

      <div className="cast-tabs">
        <button className={cat === "All" ? "active" : ""} onClick={() => setCat("All")}>All</button>
        {BATTALION_CATEGORIES.map((c) => (
          <button key={c} className={cat === c ? "active" : ""} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty-hint">No battalions yet. Add them in Dev Mode → Battalions.</div>
      ) : (
        <div className="mount-table-scroll">
          <table className="mount-table battalion-table">
            <thead>
              <tr>
                <th className="th-sort" onClick={() => onHead("name")}>Name{arrow("name")}</th>
                <th className="th-sort" onClick={() => onHead("category")}>Category{arrow("category")}</th>
                <th className="th-sort" onClick={() => onHead("rank")}>Rank{arrow("rank")}</th>
                <th className="th-sort" onClick={() => onHead("gatherLimit")}>Gather Limit{arrow("gatherLimit")}</th>
                <th>Ability</th>
                <th>Stats</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="mount-name-cell">{b.name || "Unnamed"}</td>
                  <td>{b.category || "—"}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{b.rank || "—"}</td>
                  <td style={{ textAlign: "center" }}>{b.gatherLimit ?? "—"}</td>
                  <td>{b.ability || "—"}</td>
                  <td><Stats b={b} /></td>
                  <td className="mount-loc">{b.location || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
