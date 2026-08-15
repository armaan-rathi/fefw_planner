import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { UnitPortrait } from "../components/UnitPortrait";
import { TeamTabs } from "../components/TeamTabs";
import { lordFirst } from "../data/units";
import type { Unit } from "../types";

const MAX_PER_ROUTE = 13;
type Split = Record<string, string[]>; // routeId -> unit ids

export function RouteSplit() {
  const { db } = useDB();
  const navigate = useNavigate();
  const [split, setSplit] = useLocalStorage<Split>("fw.routeSplit", {});
  const [showPost, setShowPost] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ unitId: string; rect: DOMRect } | null>(null);
  const [fadingId, setFadingId] = useState<string | null>(null); // unit fading out before it moves

  const defaultStarters = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const r of db.routes) {
      m[r.id] = lordFirst(db.units.filter((u) => u.starterFor.includes(r.id))).map((u) => u.id);
    }
    return m;
  }, [db.routes, db.units]);

  const assignedIds = (routeId: string) => split[routeId] ?? defaultStarters[routeId] ?? [];

  const { routeUnits, pool, routeOf } = useMemo(() => {
    const byId = new Map(db.units.map((u) => [u.id, u]));
    const routeOf: Record<string, string> = {};
    const routeUnits: Record<string, Unit[]> = {};
    for (const r of db.routes) {
      const list: Unit[] = [];
      for (const id of assignedIds(r.id)) {
        if (routeOf[id] || !byId.has(id)) continue;
        list.push(byId.get(id)!);
        routeOf[id] = r.id;
      }
      routeUnits[r.id] = lordFirst(list);
    }
    const pool = db.units.filter((u) => !routeOf[u.id]);
    return { routeUnits, pool, routeOf };
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
      if (next[routeId].length >= MAX_PER_ROUTE) return prev;
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

  // Push this split into Route Selection's rosters (via its per-device keys), so
  // you can rate the same line-up there. Locked units always stay on their route.
  function importToRouteSelection() {
    if (!window.confirm("Import this split into Route Selection? It replaces your current roster edits there.")) return;
    const extras: Record<string, string[]> = {};
    const removals: Record<string, string[]> = {};
    for (const r of db.routes) {
      const target = new Set((routeUnits[r.id] ?? []).map((u) => u.id));
      const lockedSet = new Set(db.units.filter((u) => u.routeIds.includes(r.id)).map((u) => u.id));
      const starterIds = db.units.filter((u) => u.starterFor.includes(r.id) && !lockedSet.has(u.id)).map((u) => u.id);
      const defaults = new Set([...lockedSet, ...starterIds]);
      extras[r.id] = [...target].filter((id) => !defaults.has(id)); // in the split but not a default
      removals[r.id] = starterIds.filter((id) => !target.has(id)); // a default starter dropped from the split
    }
    // Write directly (not via useLocalStorage's effect, which wouldn't flush
    // before this component unmounts on navigate) so Route Selection reads it on mount.
    try {
      localStorage.setItem("fw.routeExtras", JSON.stringify(extras));
      localStorage.setItem("fw.routeRemovals", JSON.stringify(removals));
    } catch {
      /* ignore quota errors */
    }
    navigate("/routes");
  }

  // ---- Desktop: native HTML5 drag-and-drop (same as the Team Builder) ------
  const onDragStart = (id: string) => (e: React.DragEvent) => e.dataTransfer.setData("text/split-unit", id);
  const dropHandler = (handler: (id: string) => void) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/split-unit");
    if (id) handler(id);
  };
  const overProps = (target: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget(target); },
    onDragLeave: () => setDropTarget((t) => (t === target ? null : t)),
  });

  // ---- Touch/click: tap a unit -> pick a banner (with a slide animation) ---
  function openMenu(e: React.MouseEvent, id: string) {
    setMenu({ unitId: id, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() });
  }
  // Fade the unit out where it is, move it, then it fades back in at the new spot.
  function fadeThen(unitId: string, action: () => void) {
    setMenu(null);
    setFadingId(unitId);
    window.setTimeout(() => { action(); setFadingId(null); }, 160);
  }
  function chooseRoute(routeId: string) {
    if (!menu) return;
    const uid = menu.unitId;
    fadeThen(uid, () => assignToRoute(uid, routeId));
  }
  function chooseRemove() {
    if (!menu) return;
    const uid = menu.unitId;
    fadeThen(uid, () => unassign(uid));
  }

  const chip = (u: Unit) => (
    <div
      key={u.id}
      className={"split-chip" + (fadingId === u.id ? " fading" : "")}
      draggable
      onDragStart={onDragStart(u.id)}
      onClick={(e) => openMenu(e, u.id)}
      title={u.name || "Unnamed"}
    >
      <UnitPortrait src={u.portrait} name={u.name} size={52} question={u.possiblyEnemyOnly} />
      <span className="split-chip-name">{u.name || "Unnamed"}</span>
    </div>
  );

  const poolVisible = pool.filter(visible);
  const menuRouteId = menu ? routeOf[menu.unitId] : null;
  const routeName = (r: (typeof db.routes)[number]) => r.title || r.name || "Route";

  return (
    <div>
      <TeamTabs />
      <div className="page-head">
        <div>
          <h2>Route Split</h2>
          <p>Plan who you recruit on each route — a unit placed on one route is spoken for and can&apos;t be on another. Drag a unit into a route, or tap a unit and pick a banner.</p>
        </div>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <label className="dev-toggle" style={{ whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={showPost} onChange={(e) => setShowPost(e.target.checked)} />
            <span>Show Post-Timeskip Units</span>
          </label>
          <button className="btn" onClick={importToRouteSelection}>Import to Route Selection</button>
          <button className="btn ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Unassigned pool */}
      <div className={"split-pool" + (dropTarget === "pool" ? " drop" : "")} data-drop="pool" {...overProps("pool")} onDrop={dropHandler(unassign)}>
        {poolVisible.length === 0 ? (
          <span className="muted" style={{ margin: "auto" }}>Everyone&apos;s assigned to a route.</span>
        ) : (
          poolVisible.map(chip)
        )}
      </div>

      {/* Routes */}
      <div className="split-routes">
        {db.routes.map((r) => {
          const shown = (routeUnits[r.id] ?? []).filter(visible);
          return (
            <div key={r.id} className={"split-route" + (dropTarget === r.id ? " drop" : "")} data-drop={r.id} {...overProps(r.id)} onDrop={dropHandler((id) => assignToRoute(id, r.id))}>
              <div className="split-banner">
                <div className="split-banner-img" style={r.banner ? { backgroundImage: `url(${r.banner})` } : undefined} />
                <div className="split-banner-label">
                  <span className="split-route-name">{routeName(r)}</span>
                </div>
              </div>
              <div className="split-route-units">
                {shown.length === 0 ? (
                  <span className="muted" style={{ margin: "auto 8px" }}>Drop units here</span>
                ) : (
                  shown.map(chip)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tap menu: pick a route banner (or remove from the current one) */}
      {menu && (() => {
        const menuW = db.routes.length * 46 + 18;
        const menuH = 62;
        const left = Math.max(12, Math.min(window.innerWidth - menuW - 12, menu.rect.left + menu.rect.width / 2 - menuW / 2));
        const below = menu.rect.bottom + 8;
        const top = below + menuH > window.innerHeight ? Math.max(12, menu.rect.top - menuH - 8) : below;
        return (
        <>
          <div className="split-menu-backdrop" onClick={() => setMenu(null)} />
          <div className="split-menu" style={{ left, top, width: menuW }}>
            {db.routes.map((r) => {
              const here = menuRouteId === r.id;
              return (
                <button
                  key={r.id}
                  className={"split-menu-item" + (here ? " remove" : "")}
                  onClick={() => (here ? chooseRemove() : chooseRoute(r.id))}
                  title={here ? "Remove from this route" : routeName(r)}
                >
                  {here ? (
                    <span className="split-menu-crest">
                      <span className="split-menu-x">✕</span>
                    </span>
                  ) : (
                    <span className="split-menu-crest" style={r.banner ? { backgroundImage: `url(${r.banner})` } : { background: r.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
        );
      })()}
    </div>
  );
}
