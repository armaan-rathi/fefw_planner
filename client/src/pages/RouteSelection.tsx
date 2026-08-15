import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { UnitPortrait } from "../components/UnitPortrait";
import { uid } from "../api";
import { lordFirst } from "../data/units";
import type { RatingParam, Unit } from "../types";

const DEFAULT_PARAMS: RatingParam[] = [{ id: "overall", label: "Overall Appeal" }];

type RatingScale = { min: number; max: number; step: number };
const DEFAULT_SCALE: RatingScale = { min: 0, max: 10, step: 0.5 };
const SCALE_CAP = 10000;

type Ratings = Record<string, number>; // key `${unitId}:${paramId}` -> a value within the chosen scale

function key(unitId: string, paramId: string) {
  return `${unitId}:${paramId}`;
}

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// Trim floating-point noise from slider values (e.g. 0.30000000000000004 -> 0.3).
const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

export function RouteSelection() {
  const { db } = useDB();
  const [ratings, setRatings] = useLocalStorage<Ratings>("fw.ratings", {});
  // Ratings, params, scale and route extras are all per-visitor (personal), so
  // fans can tailor them without touching the shared, protected database.
  const [params, setParams] = useLocalStorage<RatingParam[]>("fw.ratingParams", DEFAULT_PARAMS);
  const [scale, setScale] = useLocalStorage<RatingScale>("fw.ratingScale", DEFAULT_SCALE);
  // Units the visitor has provisionally added to a route (route id -> unit ids),
  // since the real per-route rosters aren't known yet.
  const [routeExtras, setRouteExtras] = useLocalStorage<Record<string, string[]>>("fw.routeExtras", {});
  // Default members (starters) the visitor has removed from a route.
  const [routeRemovals, setRouteRemovals] = useLocalStorage<Record<string, string[]>>("fw.routeRemovals", {});
  const [activeRoute, setActiveRoute] = useState(db.routes[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [newParam, setNewParam] = useState("");
  const [scaleOpen, setScaleOpen] = useState(false);
  const [draft, setDraft] = useState({ min: "0", max: "10", step: "0.5" });

  // Units on each route (lord first). Defaults = units locked to the route plus
  // units that START on it (starterFor), then the visitor's personal add/removes.
  // Locked units can't be removed; starters and extras can.
  const unitsByRoute = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    for (const route of db.routes) {
      const locked = db.units.filter((u) => u.routeIds.includes(route.id));
      const seen = new Set(locked.map((u) => u.id));
      const starters = db.units.filter((u) => u.starterFor.includes(route.id) && !seen.has(u.id));
      starters.forEach((u) => seen.add(u.id));
      const extras = (routeExtras[route.id] ?? [])
        .map((id) => db.units.find((u) => u.id === id))
        .filter((u): u is Unit => !!u && !seen.has(u.id));
      const removed = new Set(routeRemovals[route.id] ?? []);
      const members = [...locked, ...starters, ...extras].filter(
        (u) => u.routeIds.includes(route.id) || !removed.has(u.id) // locked always stay
      );
      map[route.id] = lordFirst(members);
    }
    return map;
  }, [db.routes, db.units, routeExtras, routeRemovals]);

  const mid = (scale.min + scale.max) / 2;

  function setRating(unitId: string, paramId: string, value: number) {
    setRatings((r) => ({ ...r, [key(unitId, paramId)]: value }));
  }
  function getRating(unitId: string, paramId: string) {
    return ratings[key(unitId, paramId)] ?? mid;
  }

  function openScale() {
    setDraft({ min: String(scale.min), max: String(scale.max), step: String(scale.step) });
    setScaleOpen(true);
    setAdding(false);
  }
  // Clamp/normalize the draft into a valid scale: range within ±10000, max above min,
  // step from 0.1 up to the chosen maximum.
  function normalizeScale(d: { min: string; max: string; step: string }): RatingScale {
    let min = Number(d.min);
    let max = Number(d.max);
    let step = Number(d.step);
    if (!Number.isFinite(min)) min = scale.min;
    if (!Number.isFinite(max)) max = scale.max;
    if (!Number.isFinite(step)) step = scale.step;
    min = clampNum(min, -SCALE_CAP, SCALE_CAP);
    max = clampNum(max, -SCALE_CAP, SCALE_CAP);
    if (max <= min) max = clampNum(min + 1, -SCALE_CAP, SCALE_CAP);
    step = clampNum(step, 0.1, Math.max(0.1, max));
    return { min, max, step };
  }
  function applyScale() {
    const next = normalizeScale(draft);
    setScale(next);
    setDraft({ min: String(next.min), max: String(next.max), step: String(next.step) });
  }

  // Per-route average score across all its units × rating params.
  const scores = useMemo(() => {
    return db.routes.map((route) => {
      const units = unitsByRoute[route.id] ?? [];
      let sum = 0;
      let n = 0;
      for (const u of units) {
        for (const p of params) {
          sum += getRating(u.id, p.id);
          n++;
        }
      }
      return { route, avg: n ? sum / n : 0, count: units.length };
    });
  }, [db.routes, params, unitsByRoute, ratings]);

  const ranked = [...scores].sort((a, b) => b.avg - a.avg);

  function addParam() {
    const label = newParam.trim();
    if (!label) return;
    setParams((prev) => [...prev, { id: uid("p_"), label }]);
    setNewParam("");
    setAdding(false);
  }
  function removeParam(id: string) {
    setParams((prev) => prev.filter((p) => p.id !== id));
  }
  function resetAll() {
    if (window.confirm("Reset all your ratings and route roster changes? (This device only.)")) {
      setRatings({});
      setRouteExtras({});
      setRouteRemovals({});
    }
  }

  const route = db.routes.find((r) => r.id === activeRoute) ?? db.routes[0];
  const roster = route ? unitsByRoute[route.id] ?? [] : [];

  // Provisionally add/remove a character on this route (personal, on this device).
  function addCharToRoute(unitId: string) {
    if (!route || !unitId) return;
    // Un-remove it if it was a removed starter, and add it as an extra otherwise.
    setRouteRemovals((prev) => {
      const cur = prev[route.id] ?? [];
      return cur.includes(unitId) ? { ...prev, [route.id]: cur.filter((id) => id !== unitId) } : prev;
    });
    setRouteExtras((prev) => {
      const cur = prev[route.id] ?? [];
      return cur.includes(unitId) ? prev : { ...prev, [route.id]: [...cur, unitId] };
    });
  }
  function removeCharFromRoute(unitId: string) {
    if (!route) return;
    // Drop from extras if it was one; otherwise mark the (starter) default as removed.
    setRouteExtras((prev) => {
      const cur = prev[route.id] ?? [];
      return cur.includes(unitId) ? { ...prev, [route.id]: cur.filter((id) => id !== unitId) } : prev;
    });
    setRouteRemovals((prev) => {
      const cur = prev[route.id] ?? [];
      return cur.includes(unitId) ? prev : { ...prev, [route.id]: [...cur, unitId] };
    });
  }
  const rosterIds = new Set(roster.map((u) => u.id));
  const offRoute = route ? db.units.filter((u) => !rosterIds.has(u.id)) : [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Route Selection</h2>
          <p>Weigh each route&apos;s path and roster. Rate each unit; scores tally per route to help you choose.</p>
        </div>
        {adding ? (
          <div className="inline-add">
            <input
              autoFocus
              type="text"
              placeholder="e.g. Story, Difficulty, Aesthetics"
              value={newParam}
              onChange={(e) => setNewParam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addParam();
                if (e.key === "Escape") { setAdding(false); setNewParam(""); }
              }}
              style={{ minWidth: 240 }}
            />
            <button className="btn primary" onClick={addParam}>Add</button>
            <button className="btn ghost" onClick={() => { setAdding(false); setNewParam(""); }}>Cancel</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => { setAdding(true); setScaleOpen(false); }}>+ Add rating parameter</button>
            <button className={"btn" + (scaleOpen ? " primary" : "")} onClick={() => (scaleOpen ? setScaleOpen(false) : openScale())}>
              Adjust rating scale
            </button>
            <button className="btn ghost" onClick={resetAll}>Reset</button>
          </div>
        )}
      </div>

      {scaleOpen && (
        <div className="ornate card" style={{ marginBottom: 22 }}>
          <div className="spread">
            <h3 className="section-title" style={{ margin: 0 }}>Rating scale</h3>
            <button className="icon-btn" onClick={() => setScaleOpen(false)}>✕</button>
          </div>
          <div className="row" style={{ gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <label className="field" style={{ margin: 0, width: 120 }}>
              <span>Minimum</span>
              <input
                type="number" min={-SCALE_CAP} max={SCALE_CAP}
                value={draft.min}
                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
                onBlur={applyScale}
              />
            </label>
            <label className="field" style={{ margin: 0, width: 120 }}>
              <span>Maximum</span>
              <input
                type="number" min={-SCALE_CAP} max={SCALE_CAP}
                value={draft.max}
                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
                onBlur={applyScale}
              />
            </label>
            <label className="field" style={{ margin: 0, width: 120 }}>
              <span>Step size</span>
              <input
                type="number" min={0.1} max={scale.max} step={0.1}
                value={draft.step}
                onChange={(e) => setDraft((d) => ({ ...d, step: e.target.value }))}
                onBlur={applyScale}
              />
            </label>
            <button className="btn primary" onClick={() => { applyScale(); setScaleOpen(false); }}>Done</button>
          </div>
          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
            Range from −{SCALE_CAP} to {SCALE_CAP}. Step from 0.1 up to the chosen maximum. Applies to your sliders on this device only.
          </p>
        </div>
      )}

      {/* Comparison */}
      <div className="ornate card" style={{ marginBottom: 22 }}>
        <h3 className="section-title">Route comparison — average appeal</h3>
        <div className="score-bars">
          {ranked.map((s, i) => (
            <div className="score-row" key={s.route.id}>
              <div className="row" style={{ gap: 8 }}>
                <span className="dot" style={{ width: 10, height: 10, borderRadius: 5, background: s.route.color, display: "inline-block" }} />
                <span style={{ fontWeight: 600 }}>{s.route.name}</span>
                {i === 0 && s.avg > 0 && <span className="tag">Top</span>}
              </div>
              <div className="score-track">
                <div
                  className="score-fill"
                  style={{
                    width: `${clampNum(((s.avg - scale.min) / (scale.max - scale.min)) * 100, 0, 100)}%`,
                    background: s.route.color,
                  }}
                />
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, color: "var(--gold-bright)" }}>
                {s.avg.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Route tabs */}
      <div className="lord-tabs">
        {db.routes.map((r) => (
          <div
            key={r.id}
            className={"lord-tab" + (r.id === activeRoute ? " active" : "")}
            style={{ ["--accent" as any]: r.color }}
            onClick={() => setActiveRoute(r.id)}
          >
            <span className="dot" style={{ background: r.color }} />
            <UnitPortrait src={r.portrait} name={r.name} size={26} />
            <span>{r.name}</span>
          </div>
        ))}
      </div>

      {route && (
        <div className="ornate card" style={{ ["--accent" as any]: route.color }}>
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
              <UnitPortrait src={route.portrait} name={route.name} size={84} shape="square" />
              <div>
                <h3 style={{ margin: "0 0 2px", color: "var(--gold-bright)", fontSize: 22 }}>{route.name}</h3>
                {route.title && <div className="muted" style={{ marginBottom: 6 }}>{route.title}</div>}
                <p style={{ maxWidth: 620, margin: 0, color: "var(--ink-dim)" }}>
                  {route.description || "No path details recorded yet. Add them in Dev Mode as new info releases."}
                </p>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Roster &amp; ratings</h3>
            <label className="inline-add" style={{ margin: 0 }}>
              <select
                value=""
                onChange={(e) => { addCharToRoute(e.target.value); e.target.value = ""; }}
                disabled={offRoute.length === 0}
              >
                <option value="">{offRoute.length ? "+ Add character to this route…" : "All characters are on this route"}</option>
                {offRoute.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || "Unnamed"}</option>
                ))}
              </select>
            </label>
          </div>
          {roster.length === 0 && (
            <p className="muted" style={{ marginTop: 10 }}>
              No units on this route yet. Use “+ Add character to this route” above to add anyone you expect to see here.
            </p>
          )}
          {roster.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    {params.map((p) => (
                      <th key={p.id}>
                        <span className="row" style={{ gap: 6 }}>
                          {p.label}
                          {params.length > 1 && (
                            <button className="icon-btn" title="Remove parameter" onClick={() => removeParam(p.id)} style={{ fontSize: 12 }}>
                              ✕
                            </button>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="row">
                          <UnitPortrait src={u.portrait} name={u.name} size={38} question={u.possiblyEnemyOnly} />
                          <div>
                            <div className="row" style={{ gap: 6 }}>
                              <span style={{ fontWeight: 600 }}>{u.name || "Unnamed"}</span>
                              {route && !u.routeIds.includes(route.id) && (
                                <button
                                  className="icon-btn"
                                  title="Remove this character you added"
                                  onClick={() => removeCharFromRoute(u.id)}
                                  style={{ fontSize: 12 }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {params.map((p) => (
                        <td key={p.id}>
                          <div className="slider-cell">
                            <input
                              type="range"
                              min={scale.min}
                              max={scale.max}
                              step={scale.step}
                              value={getRating(u.id, p.id)}
                              onChange={(e) => setRating(u.id, p.id, Number(e.target.value))}
                              style={{ ["--fill" as any]: `${clampNum(((getRating(u.id, p.id) - scale.min) / (scale.max - scale.min)) * 100, 0, 100)}%` }}
                            />
                            <span className="slider-val">{fmt(getRating(u.id, p.id))}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
