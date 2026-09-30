import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { GROWTH_LABELS, GROWTH_STATS } from "../types";
import type { GrowthStat } from "../types";
import { growthAvg, growthTotal, growthUnits, heatColor } from "../data/growths";

type SortKey = GrowthStat | "name" | "total" | "avg";

export function GrowthRates() {
  const { db } = useDB();
  const units = useMemo(() => growthUnits(db), [db]);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [dir, setDir] = useState<1 | -1>(-1);

  const rows = useMemo(
    () => units.map((u) => {
      const g = u.growths!;
      return { u, g, total: growthTotal(g), avg: growthAvg(g) };
    }),
    [units],
  );

  // Color scales: one shared scale for the 9 stat cells, and each summary
  // column (total / avg / best-off) coloured on its own range.
  const scales = useMemo(() => {
    const statVals = rows.flatMap((r) => GROWTH_STATS.map((k) => r.g[k]).filter((v): v is number => typeof v === "number"));
    const range = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
    return {
      stat: range(statVals.length ? statVals : [0, 1]),
      total: range(rows.map((r) => r.total)),
      avg: range(rows.map((r) => r.avg)),
    };
  }, [rows]);
  const norm = (v: number, r: { min: number; max: number }) => (r.max === r.min ? 0.5 : (v - r.min) / (r.max - r.min));

  const sorted = useMemo(() => {
    const num = (r: (typeof rows)[number]) =>
      sortKey === "total" ? r.total : sortKey === "avg" ? r.avg : sortKey === "name" ? 0 : (r.g[sortKey] ?? -Infinity);
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return a.u.name.localeCompare(b.u.name) * dir;
      return (num(a) - num(b)) * dir || a.u.name.localeCompare(b.u.name);
    });
  }, [rows, sortKey, dir]);

  function onHead(k: SortKey) {
    if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setDir(k === "name" ? 1 : -1);
    }
  }
  const arrow = (k: SortKey) => (sortKey === k ? (dir === -1 ? " ▼" : " ▲") : "");
  const cell = (v: number, r: { min: number; max: number }) => ({ background: heatColor(norm(v, r)), color: "#ece6d6" });

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Growth Rates</h2>
          <p>Per-level stat growth chances. Click a column to sort.</p>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="empty-hint">No growth rates yet. Add them in Dev Mode → Growth Rates.</div>
      ) : (
        <>
          <div className="growths-scroll">
            <table className="growths-table">
              <thead>
                <tr>
                  <th className="gr-rank">#</th>
                  <th className="gr-unit" onClick={() => onHead("name")}>UNIT{arrow("name")}</th>
                  {GROWTH_STATS.map((k) => (
                    <th key={k} onClick={() => onHead(k)}>{GROWTH_LABELS[k]}{arrow(k)}</th>
                  ))}
                  <th onClick={() => onHead("avg")}>AVG{arrow("avg")}</th>
                  <th onClick={() => onHead("total")}>TOTAL{arrow("total")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.u.id}>
                    <td className="gr-rank">{i + 1}</td>
                    <td className="gr-unit">{r.u.name || "Unnamed"}</td>
                    {GROWTH_STATS.map((k) => {
                      const v = r.g[k];
                      return (
                        <td key={k} style={typeof v === "number" ? cell(v, scales.stat) : undefined}>
                          {typeof v === "number" ? `${v}%` : "—"}
                        </td>
                      );
                    })}
                    <td className="gr-num" style={cell(r.avg, scales.avg)}>{r.avg.toFixed(1)}%</td>
                    <td className="gr-num" style={cell(r.total, scales.total)}>{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gr-legend">
            <span>Low</span>
            <span className="gr-legend-bar" />
            <span>High</span>
          </div>
        </>
      )}
    </div>
  );
}
