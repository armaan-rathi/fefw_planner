import { useRef, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { ImageDrop } from "../../components/ImageDrop";
import { MapBackdrop } from "../../components/MapBackdrop";
import { MapNodeIcon } from "../../components/mapIcons";
import { pinStyle, typeLabel, NODE_TYPES } from "../../components/mapNodeMeta";
import type { MapNode } from "../../types";

export function MapEditor() {
  const { db, update } = useDB();
  const map = db.map;
  const stageRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"move" | "add">("move");
  const [dragId, setDragId] = useState<string | null>(null);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeTurns, setEdgeTurns] = useState(1);

  function pct(e: { clientX: number; clientY: number }) {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  function onStageClick(e: React.MouseEvent) {
    if (mode !== "add") return;
    const { x, y } = pct(e);
    update((d) => {
      d.map.nodes.push({ id: uid("n_"), label: `Node ${d.map.nodes.length + 1}`, type: "", x, y });
    });
  }

  function onStageMove(e: React.MouseEvent) {
    if (!dragId) return;
    const { x, y } = pct(e);
    update((d) => {
      const n = d.map.nodes.find((nn) => nn.id === dragId);
      if (n) {
        n.x = x;
        n.y = y;
      }
    });
  }

  function setBackground(url: string | null) {
    update((d) => {
      d.map.background = url;
    });
  }
  function patchNode(id: string, p: Partial<MapNode>) {
    update((d) => {
      const n = d.map.nodes.find((nn) => nn.id === id);
      if (n) Object.assign(n, p);
    });
  }
  function removeNode(id: string) {
    update((d) => {
      d.map.nodes = d.map.nodes.filter((n) => n.id !== id);
      d.map.edges = d.map.edges.filter((e) => e.from !== id && e.to !== id);
    });
  }
  function addEdge() {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    const exists = map.edges.some(
      (e) => (e.from === edgeFrom && e.to === edgeTo) || (e.from === edgeTo && e.to === edgeFrom)
    );
    if (exists) return;
    update((d) => {
      d.map.edges.push({ id: uid("e_"), from: edgeFrom, to: edgeTo, turns: Math.max(0, edgeTurns) });
    });
  }
  function removeEdge(id: string) {
    update((d) => {
      d.map.edges = d.map.edges.filter((e) => e.id !== id);
    });
  }

  const label = (id: string) => map.nodes.find((n) => n.id === id)?.label ?? "?";

  return (
    <div className="stack">
      <div className="ornate card">
        <div className="two-col">
          <div>
            <h3 className="section-title">Map background</h3>
            <ImageDrop value={map.background} onChange={setBackground} height={150} label="Drop the overworld map screenshot here" />
          </div>
          <div>
            <h3 className="section-title">How to edit</h3>
            <ul className="muted" style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.7 }}>
              <li><b>Move mode</b>: drag pins to reposition them.</li>
              <li><b>Add mode</b>: click anywhere on the map to drop a new stop.</li>
              <li>Connect stops with edges below; the turn cost is the weight used for routing.</li>
            </ul>
            <div className="row">
              <button className={"btn" + (mode === "move" ? " primary" : "")} onClick={() => setMode("move")}>Move</button>
              <button className={"btn" + (mode === "add" ? " primary" : "")} onClick={() => setMode("add")}>Add stop</button>
            </div>
          </div>
        </div>
      </div>

      {/* Editable stage */}
      <div
        className="map-stage"
        ref={stageRef}
        onClick={onStageClick}
        onMouseMove={onStageMove}
        onMouseUp={() => setDragId(null)}
        onMouseLeave={() => setDragId(null)}
        style={{ cursor: mode === "add" ? "crosshair" : "default" }}
      >
        {map.background ? (
          <img className="map-bg" src={map.background} alt="map" draggable={false} />
        ) : (
          <div className="map-bg-stage">
            <MapBackdrop />
          </div>
        )}

        <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {map.edges.map((e) => {
            const a = map.nodes.find((n) => n.id === e.from);
            const b = map.nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            return (
              <g key={e.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(216,182,106,0.5)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>

        {map.nodes.map((n) => (
          <div
            key={n.id}
            className="map-node"
            style={{ left: `${n.x}%`, top: `${n.y}%`, cursor: mode === "move" ? "grab" : "pointer" }}
            onMouseDown={(e) => {
              if (mode === "move") {
                e.stopPropagation();
                setDragId(n.id);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pin" style={pinStyle(n.type)}><MapNodeIcon type={n.type} size={13} /></div>
            <div className="node-label">{n.label}</div>
          </div>
        ))}
      </div>

      {/* Nodes list */}
      <div className="ornate card">
        <h3 className="section-title">Stops ({map.nodes.length})</h3>
        {map.nodes.length === 0 ? (
          <div className="empty-hint">No stops yet. Switch to “Add stop” and click the map.</div>
        ) : (
          <div className="list-rows">
            {map.nodes.map((n) => (
              <div className="list-row ornate" key={n.id}>
                <div className="grow two-col" style={{ gap: 10 }}>
                  <label className="field" style={{ margin: 0 }}><span>Label</span>
                    <input type="text" value={n.label} onChange={(e) => patchNode(n.id, { label: e.target.value })} />
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Type</span>
                    <select value={NODE_TYPES.includes(n.type) ? n.type : "junction"} onChange={(e) => patchNode(n.id, { type: e.target.value })}>
                      {NODE_TYPES.map((t) => (
                        <option key={t} value={t}>{typeLabel(t)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button className="btn tiny danger" onClick={() => removeNode(n.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edges */}
      <div className="ornate card">
        <h3 className="section-title">Paths between stops ({map.edges.length})</h3>
        <div className="inline-add" style={{ flexWrap: "wrap" }}>
          <select value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)} style={{ width: 170 }}>
            <option value="">From…</option>
            {map.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <select value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)} style={{ width: 170 }}>
            <option value="">To…</option>
            {map.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <label className="row" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>turns</span>
            <input type="number" min={0} value={edgeTurns} onChange={(e) => setEdgeTurns(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <button className="btn primary" onClick={addEdge}>Add path</button>
        </div>

        {map.edges.length > 0 && (
          <div className="list-rows" style={{ marginTop: 12 }}>
            {map.edges.map((e) => (
              <div className="list-row ornate" key={e.id}>
                <span className="grow">{label(e.from)} ↔ {label(e.to)}</span>
                <span className="tag">{e.turns} {e.turns === 1 ? "turn" : "turns"}</span>
                <button className="btn tiny danger" onClick={() => removeEdge(e.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
