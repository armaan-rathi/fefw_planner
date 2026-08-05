import { useMemo, useRef, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { UnitPortrait } from "../components/UnitPortrait";
import { TeamTabs } from "../components/TeamTabs";
import { lordFirst } from "../data/units";
import type { Unit } from "../types";

const MAX_PER_ROUTE = 12;
type Split = Record<string, string[]>; // routeId -> unit ids

function Chip({ unit, dim, onPointerDown }: { unit: Unit; dim?: boolean; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      className={"split-chip" + (dim ? " dragging" : "")}
      onPointerDown={onPointerDown}
      title={unit.name || "Unnamed"}
    >
      <UnitPortrait src={unit.portrait} name={unit.name} size={52} />
      <span className="split-chip-name">{unit.name || "Unnamed"}</span>
    </div>
  );
}

export function RouteSplit() {
  const { db } = useDB();
  const [split, setSplit] = useLocalStorage<Split>("fw.routeSplit", {});
  const [showPost, setShowPost] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // routeId | "pool"
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);

  const defaultStarters = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const r of db.routes) {
      m[r.id] = lordFirst(db.units.filter((u) => u.starterFor.includes(r.id))).map((u) => u.id);
    }
    return m;
  }, [db.routes, db.units]);

  const assignedIds = (routeId: string) => split[routeId] ?? defaultStarters[routeId] ?? [];

  const { routeUnits, pool } = useMemo(() => {
    const byId = new Map(db.units.map((u) => [u.id, u]));
    const placed = new Set<string>();
    const routeUnits: Record<string, Unit[]> = {};
    for (const r of db.routes) {
      const list: Unit[] = [];
      for (const id of assignedIds(r.id)) {
        if (placed.has(id)) continue;
        const u = byId.get(id);
        if (!u) continue;
        list.push(u);
        placed.add(id);
      }
      routeUnits[r.id] = lordFirst(list);
    }
    const pool = db.units.filter((u) => !placed.has(u.id));
    return { routeUnits, pool };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.routes, db.units, split, defaultStarters]);

  const visible = (u: Unit) => showPost || !u.postTimeskip;

  function materialized(prev: Split): Split {
    const next: Split = {};
    for (const r of db.routes) next[r.id] = [...(prev[r.id] ?? defaultStarters[r.id] ?? [])];
    return next;
  }
  function assignToRoute(unitId: string, routeId: string) {
    setSplit((prev) => {
      const next = materialized(prev);
      for (const r of db.routes) next[r.id] = next[r.id].filter((id) => id !== unitId);
      if (next[routeId].length >= MAX_PER_ROUTE) return prev; // full — reject
      next[routeId].push(unitId);
      return next;
    });
  }
  function unassign(unitId: string) {
    setSplit((prev) => {
      const next = materialized(prev);
      for (const r of db.routes) next[r.id] = next[r.id].filter((id) => id !== unitId);
      return next;
    });
  }
  function reset() {
    if (window.confirm("Reset the route split back to each route's default starting units?")) setSplit({});
  }

  // ---- Pointer-based drag (works with mouse and touch) --------------------
  const drag = useRef<{ id: string; sx: number; sy: number; active: boolean; touch: boolean; timer: number | null } | null>(null);

  function zoneAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const drop = el?.closest("[data-drop]") as HTMLElement | null;
    return drop?.dataset.drop ?? null;
  }
  function preventScroll(e: TouchEvent) {
    if (drag.current?.active) e.preventDefault();
  }
  function activate(x: number, y: number) {
    const d = drag.current;
    if (!d || d.active) return;
    d.active = true;
    setGhost({ id: d.id, x, y });
    window.addEventListener("touchmove", preventScroll, { passive: false });
  }
  function endDrag() {
    const d = drag.current;
    if (d?.timer) window.clearTimeout(d.timer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("touchmove", preventScroll);
    drag.current = null;
    setGhost(null);
    setDropTarget(null);
  }
  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const moved = Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy);
    if (!d.active) {
      if (d.touch) {
        if (moved > 12) endDrag(); // it's a scroll — let the browser handle it
        return;
      }
      if (moved > 6) activate(e.clientX, e.clientY); // mouse: drag on move
      if (!drag.current?.active) return;
    }
    setGhost({ id: d.id, x: e.clientX, y: e.clientY });
    setDropTarget(zoneAt(e.clientX, e.clientY));
    if (e.clientY < 80) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - 80) window.scrollBy(0, 14);
  }
  function onUp(e: PointerEvent) {
    const d = drag.current;
    if (d?.active) {
      const zone = zoneAt(e.clientX, e.clientY);
      if (zone === "pool") unassign(d.id);
      else if (zone) assignToRoute(d.id, zone);
    }
    endDrag();
  }
  function startDrag(e: React.PointerEvent, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const touch = e.pointerType !== "mouse";
    drag.current = { id, sx: e.clientX, sy: e.clientY, active: false, touch, timer: null };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    if (touch) {
      // long-press to lift, so a quick swipe still scrolls the list/page
      drag.current.timer = window.setTimeout(() => {
        if (drag.current) activate(drag.current.sx, drag.current.sy);
      }, 200);
    }
  }

  const poolVisible = pool.filter(visible);
  const ghostUnit = ghost ? db.units.find((u) => u.id === ghost.id) : null;

  return (
    <div>
      <TeamTabs />
      <div className="page-head">
        <div>
          <h2>Route Split</h2>
          <p>Plan who you recruit on each route — a unit placed on one route is spoken for and can&apos;t be on another. Drag units from the top pool into a route (up to {MAX_PER_ROUTE} each). On touch, press and hold a unit to pick it up.</p>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="dev-toggle" style={{ whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={showPost} onChange={(e) => setShowPost(e.target.checked)} />
            <span>Show Post-Timeskip Units</span>
          </label>
          <button className="btn ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Unassigned pool */}
      <div className={"split-pool" + (dropTarget === "pool" ? " drop" : "")} data-drop="pool">
        {poolVisible.length === 0 ? (
          <span className="muted" style={{ margin: "auto" }}>Everyone&apos;s assigned to a route.</span>
        ) : (
          poolVisible.map((u) => <Chip key={u.id} unit={u} dim={ghost?.id === u.id} onPointerDown={(e) => startDrag(e, u.id)} />)
        )}
      </div>

      {/* Routes */}
      <div className="split-routes">
        {db.routes.map((r) => {
          const units = routeUnits[r.id] ?? [];
          const shown = units.filter(visible);
          return (
            <div key={r.id} className={"split-route" + (dropTarget === r.id ? " drop" : "")} style={{ ["--accent" as any]: r.color }} data-drop={r.id}>
              <div className="split-banner">
                <div className="split-banner-img" style={r.banner ? { backgroundImage: `url(${r.banner})` } : undefined} />
                <div className="split-banner-label">
                  <span className="split-route-name">{r.title || "Route"}</span>
                </div>
              </div>
              <div className="split-route-units">
                {shown.length === 0 ? (
                  <span className="muted" style={{ margin: "auto 8px" }}>Drop units here</span>
                ) : (
                  shown.map((u) => <Chip key={u.id} unit={u} dim={ghost?.id === u.id} onPointerDown={(e) => startDrag(e, u.id)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating drag ghost */}
      {ghost && ghostUnit && (
        <div className="split-ghost" style={{ left: ghost.x, top: ghost.y }}>
          <UnitPortrait src={ghostUnit.portrait} name={ghostUnit.name} size={52} />
        </div>
      )}
    </div>
  );
}
