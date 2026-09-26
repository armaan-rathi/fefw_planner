import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { GROWTH_LABELS, GROWTH_STATS } from "../../types";
import type { GrowthStat } from "../../types";
import { growthTotal } from "../../data/growths";

export function GrowthsEditor() {
  const { db, update } = useDB();
  const [query, setQuery] = useState("");

  function setGrowth(unitId: string, stat: GrowthStat, val: number | undefined) {
    update((d) => {
      const u = d.units.find((x) => x.id === unitId);
      if (!u) return;
      const g = { ...(u.growths ?? {}) };
      if (val === undefined) delete g[stat];
      else g[stat] = val;
      if (Object.keys(g).length === 0) delete u.growths;
      else u.growths = g;
    });
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return db.units.filter((u) => !q || u.name.toLowerCase().includes(q));
  }, [db.units, query]);

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title" style={{ marginTop: 0 }}>Display</h3>
        <label className="dev-toggle" style={{ marginLeft: 0 }}>
          <input
            type="checkbox"
            checked={!!db.growthsOnCharPage}
            onChange={(e) => update((d) => { d.growthsOnCharPage = e.target.checked; })}
          />
          <span>Show growth rates on the Character Database page</span>
        </label>
      </div>

      <div className="ornate card">
        <div className="spread" style={{ marginBottom: 6 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Growth rates</h3>
          <input type="text" placeholder="Search units…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Values are percentages. Leave a cell blank to omit it. Units with any value entered appear on the Growth Rates page.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="rate-table growths-edit">
            <thead>
              <tr>
                <th style={{ textAlign: "left", minWidth: 150 }}>Unit</th>
                {GROWTH_STATS.map((k) => <th key={k}>{GROWTH_LABELS[k]}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const g = u.growths ?? {};
                const any = GROWTH_STATS.some((k) => typeof g[k] === "number");
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{u.name || "Unnamed"}</td>
                    {GROWTH_STATS.map((k) => (
                      <td key={k}>
                        <input
                          type="number"
                          value={g[k] ?? ""}
                          onChange={(e) => setGrowth(u.id, k, e.target.value === "" ? undefined : Number(e.target.value))}
                          style={{ width: 56 }}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: "center", color: "var(--ink-dim)" }}>{any ? growthTotal(g) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
