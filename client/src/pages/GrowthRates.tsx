import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDB } from "../data/DataContext";
import { CLASS_TIERS, GROWTH_LABELS, GROWTH_STATS } from "../types";
import type { Growths, GrowthStat } from "../types";
import { growthAvg, growthTotal, growthUnits, heatColor } from "../data/growths";
import { filterSpoilerUnits, isSpoilerTier, useSpoilers } from "../data/spoilers";

type View = "units" | "classes";

export function GrowthRates() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "classes" ? "classes" : "units";
  const setView = (v: View) => setParams(v === "classes" ? { view: "classes" } : {}, { replace: true });

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Growth Rates</h2>
          <p>Per-level stat growth chances. Click a column to sort.</p>
        </div>
      </div>

      <div className="cast-tabs">
        <button className={view === "units" ? "active" : ""} onClick={() => setView("units")}>Units</button>
        <button className={view === "classes" ? "active" : ""} onClick={() => setView("classes")}>Classes</button>
      </div>

      {view === "units" ? <UnitTable /> : <ClassTable />}

      <div className="gr-legend">
        <span>Low</span>
        <span className="gr-legend-bar" />
        <span>High</span>
      </div>
    </div>
  );
}

const norm = (v: number, r: { min: number; max: number }) => (r.max === r.min ? 0.5 : (v - r.min) / (r.max - r.min));
const cellStyle = (v: number, r: { min: number; max: number }) => ({ background: heatColor(norm(v, r)), color: "#ece6d6" });
const range = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });

// ---- Units ----------------------------------------------------------------
type USortKey = GrowthStat | "name" | "total" | "avg";

function UnitTable() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();
  const units = useMemo(() => filterSpoilerUnits(growthUnits(db), allowSpoilers), [db, allowSpoilers]);
  const [sortKey, setSortKey] = useState<USortKey>("total");
  const [dir, setDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => units.map((u) => { const g = u.growths!; return { u, g, total: growthTotal(g), avg: growthAvg(g) }; }), [units]);
  const scales = useMemo(() => {
    const statVals = rows.flatMap((r) => GROWTH_STATS.map((k) => r.g[k]).filter((v): v is number => typeof v === "number"));
    return { stat: range(statVals.length ? statVals : [0, 1]), total: range(rows.map((r) => r.total)), avg: range(rows.map((r) => r.avg)) };
  }, [rows]);

  const sorted = useMemo(() => {
    const num = (r: (typeof rows)[number]) => (sortKey === "total" ? r.total : sortKey === "avg" ? r.avg : sortKey === "name" ? 0 : (r.g[sortKey] ?? -Infinity));
    return [...rows].sort((a, b) => (sortKey === "name" ? a.u.name.localeCompare(b.u.name) * dir : (num(a) - num(b)) * dir || a.u.name.localeCompare(b.u.name)));
  }, [rows, sortKey, dir]);

  function onHead(k: USortKey) { if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(k); setDir(k === "name" ? 1 : -1); } }
  const arrow = (k: USortKey) => (sortKey === k ? (dir === -1 ? " ▼" : " ▲") : "");

  if (units.length === 0) return <div className="empty-hint">No unit growth rates yet. Add them in Dev Mode → Growth Rates.</div>;
  return (
    <div className="growths-scroll">
      <table className="growths-table">
        <thead>
          <tr>
            <th className="gr-rank">#</th>
            <th className="gr-unit" onClick={() => onHead("name")}>UNIT{arrow("name")}</th>
            {GROWTH_STATS.map((k) => <th key={k} onClick={() => onHead(k)}>{GROWTH_LABELS[k]}{arrow(k)}</th>)}
            <th onClick={() => onHead("avg")}>AVG{arrow("avg")}</th>
            <th onClick={() => onHead("total")}>TOTAL{arrow("total")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.u.id}>
              <td className="gr-rank">{i + 1}</td>
              <td className="gr-unit">{r.u.name || "Unnamed"}</td>
              {GROWTH_STATS.map((k) => { const v = r.g[k]; return <td key={k} style={typeof v === "number" ? cellStyle(v, scales.stat) : undefined}>{typeof v === "number" ? `${v}%` : "—"}</td>; })}
              <td className="gr-num" style={cellStyle(r.avg, scales.avg)}>{r.avg.toFixed(1)}%</td>
              <td className="gr-num" style={cellStyle(r.total, scales.total)}>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Classes --------------------------------------------------------------
type CSortKey = GrowthStat | "name" | "tier" | "total";
const tierIndex = (t?: string) => { const i = CLASS_TIERS.indexOf(t ?? ""); return i < 0 ? 99 : i; };

function ClassTable() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();
  const [sortKey, setSortKey] = useState<CSortKey>("total");
  const [dir, setDir] = useState<1 | -1>(-1);

  // Expand each class with growth mods into a base row plus any level tiers.
  const rows = useMemo(() => {
    const out: { key: string; label: string; tier: string; g: Growths; total: number }[] = [];
    const has = (g?: Growths) => g && GROWTH_STATS.some((k) => typeof g[k] === "number");
    for (const c of db.classes) {
      if (isSpoilerTier(c.tier) && !allowSpoilers) continue;
      if (has(c.growthMods)) out.push({ key: c.id, label: c.name || "Unnamed", tier: c.tier, g: c.growthMods!, total: growthTotal(c.growthMods!) });
      for (const t of c.growthTiers ?? []) {
        if (has(t.growths)) out.push({ key: `${c.id}@${t.level}`, label: `${c.name} (Lv. ${t.level})`, tier: c.tier, g: t.growths, total: growthTotal(t.growths) });
      }
    }
    return out;
  }, [db.classes, allowSpoilers]);

  const scales = useMemo(() => {
    const statVals = rows.flatMap((r) => GROWTH_STATS.map((k) => r.g[k]).filter((v): v is number => typeof v === "number"));
    return { stat: range(statVals.length ? statVals : [0, 1]), total: range(rows.map((r) => r.total)) };
  }, [rows]);

  const sorted = useMemo(() => {
    const num = (r: (typeof rows)[number]) => (sortKey === "total" ? r.total : sortKey === "tier" ? tierIndex(r.tier) : sortKey === "name" ? 0 : (r.g[sortKey] ?? -Infinity));
    return [...rows].sort((a, b) => (sortKey === "name" ? a.label.localeCompare(b.label) * dir : (num(a) - num(b)) * dir || a.label.localeCompare(b.label)));
  }, [rows, sortKey, dir]);

  function onHead(k: CSortKey) { if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(k); setDir(k === "name" || k === "tier" ? 1 : -1); } }
  const arrow = (k: CSortKey) => (sortKey === k ? (dir === -1 ? " ▼" : " ▲") : "");
  const fmt = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

  return (
    <>
      {rows.length === 0 ? (
        <div className="empty-hint">No class growth modifiers yet. Add them in Dev Mode → Classes.</div>
      ) : (
        <div className="growths-scroll">
          <table className="growths-table">
            <thead>
              <tr>
                <th className="gr-rank">#</th>
                <th className="gr-unit" onClick={() => onHead("name")}>CLASS{arrow("name")}</th>
                <th onClick={() => onHead("tier")}>TIER{arrow("tier")}</th>
                {GROWTH_STATS.map((k) => <th key={k} onClick={() => onHead(k)}>{GROWTH_LABELS[k]}{arrow(k)}</th>)}
                <th onClick={() => onHead("total")}>TOTAL{arrow("total")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.key}>
                  <td className="gr-rank">{i + 1}</td>
                  <td className="gr-unit">{r.label}</td>
                  <td className="gr-tier">{r.tier || "—"}</td>
                  {GROWTH_STATS.map((k) => { const v = r.g[k]; return <td key={k} style={typeof v === "number" && v !== 0 ? cellStyle(v, scales.stat) : undefined}>{typeof v === "number" && v !== 0 ? fmt(v) : "—"}</td>; })}
                  <td className="gr-num" style={cellStyle(r.total, scales.total)}>{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
