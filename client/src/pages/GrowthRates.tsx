import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { CLASS_TIERS, GROWTH_LABELS, GROWTH_STATS } from "../types";
import type { Growths, GrowthStat } from "../types";
import { consolidatedGrowths, growthAvg, growthTotal, growthUnits, heatColor } from "../data/growths";
import { filterSpoilerUnits, isSpoilerTier, useSpoilers } from "../data/spoilers";

type View = "units" | "classes" | "consolidated";

export function GrowthRates() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("view");
  const view: View = raw === "classes" || raw === "consolidated" ? raw : "units";
  const setView = (v: View) => setParams(v === "units" ? {} : { view: v }, { replace: true });

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
        <button className={view === "consolidated" ? "active" : ""} onClick={() => setView("consolidated")}>Unit + Class + Mount</button>
      </div>

      {view === "units" ? <UnitTable /> : view === "classes" ? <ClassTable /> : <ConsolidatedTable />}

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


// ---- Consolidated: unit + class + mount ------------------------------------
type Build = { classId: string; mountId: string }; // classId may be "id" or "id@level"

function ConsolidatedTable() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();
  const classById = useMemo(() => new Map(db.classes.map((c) => [c.id, c])), [db.classes]);
  const mountById = useMemo(() => new Map((db.mounts ?? []).map((m) => [m.id, m])), [db.mounts]);
  const unitById = useMemo(() => new Map(db.units.map((u) => [u.id, u])), [db.units]);

  // Class dropdown options: each class, plus a row per growth tier.
  const classOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const c of db.classes) {
      if (isSpoilerTier(c.tier) && !allowSpoilers) continue;
      opts.push({ value: c.id, label: c.name || "Unnamed" });
      for (const t of c.growthTiers ?? []) opts.push({ value: `${c.id}@${t.level}`, label: `${c.name} (Lv. ${t.level})` });
    }
    return opts;
  }, [db.classes, allowSpoilers]);

  const lordIds = useMemo(() => db.units.filter((u) => u.isLord).map((u) => u.id), [db.units]);
  const [roster, setRoster] = useLocalStorage<string[] | null>("fw.growthRoster", null);
  const effectiveRoster = roster ?? lordIds;

  const [builds, setBuilds] = useState<Record<string, Build>>({});
  const buildFor = (uId: string): Build => builds[uId] ?? { classId: unitById.get(uId)?.classId ?? "", mountId: "" };

  const resolveClass = (value: string) => {
    const [baseId, lvl] = value.split("@");
    const cls = classById.get(baseId);
    const growths = lvl ? cls?.growthTiers?.find((t) => t.level === Number(lvl))?.growths : cls?.growthMods;
    return { cls, growths };
  };

  function setClassFor(uId: string, value: string) {
    setBuilds((b) => {
      const cur = b[uId] ?? { classId: "", mountId: "" };
      const { cls } = resolveClass(value);
      const mount = mountById.get(cur.mountId);
      const keepMount = mount && cls?.mountType && mount.type === cls.mountType ? cur.mountId : "";
      return { ...b, [uId]: { classId: value, mountId: keepMount } };
    });
  }
  function setMountFor(uId: string, mountId: string) {
    setBuilds((b) => ({ ...b, [uId]: { classId: b[uId]?.classId ?? (unitById.get(uId)?.classId ?? ""), mountId } }));
  }
  function addUnit(uId: string) { if (uId) setRoster([...effectiveRoster.filter((x) => x !== uId), uId]); }
  function removeUnit(uId: string) { setRoster(effectiveRoster.filter((x) => x !== uId)); }

  const rows = useMemo(() => effectiveRoster
    .map((id) => unitById.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u && (allowSpoilers || !u.part3))
    .map((u) => {
      const build = buildFor(u.id);
      const { cls, growths } = resolveClass(build.classId);
      const mount = mountById.get(build.mountId);
      const isCharioteer = cls?.name === "Charioteer";
      const allowedMounts = cls?.mountType ? (db.mounts ?? []).filter((m) => m.type === cls.mountType) : [];
      const g = consolidatedGrowths(u.growths, growths, mount?.growths, isCharioteer);
      return { u, build, cls, isCharioteer, allowedMounts, g, total: growthTotal(g) };
    }), [effectiveRoster, builds, unitById, mountById, classById, allowSpoilers, db.mounts]);

  const scales = useMemo(() => {
    const statVals = rows.flatMap((r) => GROWTH_STATS.map((k) => r.g[k] ?? 0));
    return { stat: range(statVals.length ? statVals : [0, 1]), total: range(rows.length ? rows.map((r) => r.total) : [0, 1]) };
  }, [rows]);

  const addable = useMemo(() => {
    const inRoster = new Set(effectiveRoster);
    return db.units.filter((u) => !inRoster.has(u.id) && (allowSpoilers || !u.part3));
  }, [db.units, effectiveRoster, allowSpoilers]);

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <label className="field" style={{ margin: 0, minWidth: 220 }}>
          <span>Add a character</span>
          <select value="" onChange={(e) => addUnit(e.target.value)}>
            <option value="">— Add to table —</option>
            {addable.map((u) => <option key={u.id} value={u.id}>{u.name || "Unnamed"}</option>)}
          </select>
        </label>
        {roster && <button className="btn ghost" onClick={() => setRoster(null)}>Reset to lords</button>}
      </div>

      {rows.length === 0 ? (
        <div className="empty-hint">No characters in the table. Add some above.</div>
      ) : (
        <div className="growths-scroll">
          <table className="growths-table consolidated">
            <thead>
              <tr>
                <th className="gr-rowx" />
                <th className="gr-unit">UNIT</th>
                <th className="gr-pick">CLASS</th>
                <th className="gr-pick">MOUNT</th>
                {GROWTH_STATS.map((k) => <th key={k}>{GROWTH_LABELS[k]}</th>)}
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u.id}>
                  <td className="gr-rowx"><button className="icon-btn" title="Remove from table" onClick={() => removeUnit(r.u.id)}>✕</button></td>
                  <td className="gr-unit">{r.u.name || "Unnamed"}{r.isCharioteer ? <span className="gr-note" title="Charioteer doubles mount bonuses"> ×2 mount</span> : null}</td>
                  <td className="gr-pick">
                    <select value={r.build.classId} onChange={(e) => setClassFor(r.u.id, e.target.value)}>
                      <option value="">— None —</option>
                      {classOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="gr-pick">
                    <select value={r.build.mountId} onChange={(e) => setMountFor(r.u.id, e.target.value)} disabled={r.allowedMounts.length === 0} title={r.cls?.mountType ? "" : "This class can't use a mount"}>
                      <option value="">{r.allowedMounts.length ? "— None —" : "—"}</option>
                      {r.allowedMounts.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  {GROWTH_STATS.map((k) => { const v = r.g[k] ?? 0; return <td key={k} style={cellStyle(v, scales.stat)}>{v}%</td>; })}
                  <td className="gr-num" style={cellStyle(r.total, scales.total)}>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
