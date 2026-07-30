import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { MapBackdrop } from "../components/MapBackdrop";
import { MapIcon } from "../components/MapIcon";
import { edgeDots } from "../components/mapShapes";
import type { GameMap, IconType, MapNode } from "../types";

// Dijkstra shortest path over the (undirected) edge graph, weighted by turns.
// `blocked` holds nodes that can't be traversed; edges touching them are dropped
// (except the chosen endpoints, which are always kept usable).
function shortestPath(map: GameMap, from: string, to: string, blocked: Set<string>): { path: string[]; turns: number } | null {
  if (from === to) return { path: [from], turns: 0 };
  const usable = (id: string) => id === from || id === to || !blocked.has(id);
  const adj: Record<string, { to: string; w: number }[]> = {};
  for (const n of map.nodes) adj[n.id] = [];
  for (const e of map.edges) {
    if (!adj[e.from] || !adj[e.to]) continue;
    if (!usable(e.from) || !usable(e.to)) continue;
    adj[e.from].push({ to: e.to, w: e.turns });
    adj[e.to].push({ to: e.from, w: e.turns });
  }
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();
  for (const n of map.nodes) {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  }
  dist[from] = 0;
  while (visited.size < map.nodes.length) {
    let u: string | null = null;
    let best = Infinity;
    for (const n of map.nodes) {
      if (!visited.has(n.id) && dist[n.id] < best) {
        best = dist[n.id];
        u = n.id;
      }
    }
    if (u === null || u === to) break;
    visited.add(u);
    for (const { to: v, w } of adj[u] || []) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }
  if (dist[to] === Infinity) return null;
  const path: string[] = [];
  let cur: string | null = to;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { path, turns: dist[to] };
}

export function OverworldMap() {
  const { db } = useDB();
  const map = db.map;
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [allowBlocked, setAllowBlocked] = useState(false);
  const [zoom, setZoom] = useState(1); // map zoom; pan by scrolling the viewport
  const zoomBy = (d: number) => setZoom((z) => Math.min(4, Math.max(1, Math.round((z + d) * 10) / 10)));

  const nodeById = useMemo(() => {
    const m: Record<string, MapNode> = {};
    for (const n of map.nodes) m[n.id] = n;
    return m;
  }, [map.nodes]);

  // Blocked or inactive markers are impassable unless traversal is allowed.
  const blockedSet = useMemo(() => {
    const s = new Set<string>();
    if (!allowBlocked) for (const n of map.nodes) if (n.blocked || n.inactive) s.add(n.id);
    return s;
  }, [map.nodes, allowBlocked]);

  const typeById = useMemo(() => {
    const m: Record<string, IconType> = {};
    for (const t of db.iconTypes) m[t.id] = t;
    return m;
  }, [db.iconTypes]);

  const route = useMemo(() => {
    const stops: string[] = [];
    let turns = 0;
    let broken = false;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const seg = shortestPath(map, waypoints[i], waypoints[i + 1], blockedSet);
      if (!seg) {
        broken = true;
        break;
      }
      stops.push(...(i === 0 ? seg.path : seg.path.slice(1)));
      turns += seg.turns;
    }
    if (waypoints.length === 1) stops.push(waypoints[0]);
    return { stops, turns, broken };
  }, [waypoints, map, blockedSet]);

  const routeSet = new Set(route.stops);

  function onNodeClick(id: string) {
    if (blockedSet.has(id)) return; // impassable — can't be a stop
    // Toggle: clicking a stop that's already a waypoint removes it; otherwise add it.
    setWaypoints((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }

  const linePoints = route.stops
    .map((id) => nodeById[id])
    .filter(Boolean)
    .map((n) => `${n.x},${n.y}`)
    .join(" ");

  const hideMarkers = !!map.hideMarkers;

  // Precompute connector dots for every edge (skipped when markers are hidden —
  // the live map then relies on the underlying image's own paths).
  const dots = useMemo(() => {
    if (hideMarkers) return [];
    const all: { x: number; y: number }[] = [];
    for (const e of map.edges) {
      const a = nodeById[e.from];
      const b = nodeById[e.to];
      if (a && b) all.push(...edgeDots(a, b));
    }
    return all;
  }, [map.edges, nodeById, hideMarkers]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Overworld Map</h2>
          <p>Click a marker to add it as a stop; click it again to remove it. Turns are summed along the shortest connecting paths; blocked and inactive markers are avoided.</p>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button
            className={"btn" + (allowBlocked ? " primary" : " ghost")}
            onClick={() => setAllowBlocked((v) => !v)}
            title="Treat blocked and inactive markers as ordinary, passable stops"
          >
            {allowBlocked ? "✓ Inactive traversal on" : "Allow inactive node traversal"}
          </button>
          <button className="btn ghost" onClick={() => setWaypoints((w) => w.slice(0, -1))} disabled={!waypoints.length}>
            Undo stop
          </button>
          <button className="btn" onClick={() => setWaypoints([])} disabled={!waypoints.length}>
            Clear route
          </button>
        </div>
      </div>

      <div className="ornate card" style={{ marginBottom: 18 }}>
        <div className="route-readout">
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Total turns</div>
            <div className="big-stat">{route.broken ? "—" : route.turns}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Stops along the way ({route.stops.length}){route.broken && " — route is broken; some stops aren't connected"}
            </div>
            {route.stops.length === 0 ? (
              <span className="muted">No route plotted yet.</span>
            ) : (
              <div className="stop-chips">
                {route.stops.map((id, i) => (
                  <span className="stop-chip" key={i}>
                    <span className="idx">{i + 1}</span>
                    {nodeById[id]?.label || "Stop"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="map-outer">
        <div className="map-zoom-controls">
          <button className="map-zoom-btn" onClick={() => zoomBy(0.5)} disabled={zoom >= 4} title="Zoom in" aria-label="Zoom in">＋</button>
          <button className="map-zoom-btn" onClick={() => zoomBy(-0.5)} disabled={zoom <= 1} title="Zoom out" aria-label="Zoom out">−</button>
          {zoom !== 1 && (
            <button className="map-zoom-btn reset" onClick={() => setZoom(1)} title="Reset zoom">{zoom}×</button>
          )}
        </div>
        <div className="map-viewport">
          <div className="map-stage play" style={{ width: `${zoom * 100}%` }}>
        {map.background ? (
          <img className="map-bg" src={map.background} alt="Overworld map" />
        ) : (
          <div className="map-bg-stage">
            <MapBackdrop />
          </div>
        )}

        {/* connector dots */}
        {dots.map((d, i) => (
          <span key={i} className="map-dot" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
        ))}

        {/* active route line */}
        {route.stops.length > 1 && (
          <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={linePoints} fill="none" stroke="#5fa8e8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}

        {map.nodes.map((n) => {
          const t = typeById[n.iconTypeId];
          if (!t) return null;
          const isWaypoint = waypoints.includes(n.id);
          const inRoute = routeSet.has(n.id);
          const impassable = blockedSet.has(n.id);
          return (
            <div
              key={n.id}
              className={
                "map-node icon-node" +
                (impassable ? " impassable" : " clickable") +
                (inRoute ? " in-route" : "") +
                (isWaypoint ? " selected" : "")
              }
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              onClick={() => onNodeClick(n.id)}
              title={impassable ? (n.label ? n.label + " (blocked)" : "Blocked") : n.label}
            >
              <div className={hideMarkers ? "ghost" : ""}>
                <MapIcon type={t} blocked={n.blocked} inactive={n.inactive} />
              </div>
              {isWaypoint && <span className="wp-badge">{waypoints.indexOf(n.id) + 1}</span>}
              {n.label && <div className="node-label">{n.label}</div>}
            </div>
          );
        })}

        {map.nodes.length === 0 && (
          <div className="empty-hint" style={{ position: "absolute", inset: "auto 0 12px 0", margin: "0 auto", maxWidth: 420, background: "rgba(8,18,22,0.85)" }}>
            No map markers yet. Add them in Dev Mode → Map.
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
