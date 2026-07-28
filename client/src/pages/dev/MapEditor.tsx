import { useRef, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { ImageDrop } from "../../components/ImageDrop";
import { MapBackdrop } from "../../components/MapBackdrop";
import { MapIcon } from "../../components/MapIcon";
import { edgeDots, SHAPE_OPTIONS } from "../../components/mapShapes";
import type { IconShape, IconType, MapNode } from "../../types";

export function MapEditor() {
  const { db, update } = useDB();
  const map = db.map;
  const stageRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean; sx: number; sy: number } | null>(null);

  const [armed, setArmed] = useState<string | null>(null); // icon type id to place
  const [connectMode, setConnectMode] = useState(false);
  const [sel, setSel] = useState<string[]>([]); // connect selection
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overBin, setOverBin] = useState(false);
  const [showTypes, setShowTypes] = useState(false);

  const typeById = (id: string) => db.iconTypes.find((t) => t.id === id);

  function pct(e: { clientX: number; clientY: number }) {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  }

  // ---- map mutations ----
  function setBackground(url: string | null) {
    update((d) => (d.map.background = url));
  }
  function addNode(iconTypeId: string, x: number, y: number) {
    update((d) => {
      d.map.nodes.push({ id: uid("n_"), iconTypeId, label: "", blocked: false, inactive: false, x, y });
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
    setSel((s) => s.filter((x) => x !== id));
    if (editingId === id) setEditingId(null);
  }

  function connectSelected() {
    if (sel.length < 2) return;
    update((d) => {
      for (let i = 0; i < sel.length - 1; i++) {
        const a = sel[i];
        const b = sel[i + 1];
        const exists = d.map.edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
        if (!exists) d.map.edges.push({ id: uid("e_"), from: a, to: b, turns: 1 });
      }
    });
  }
  function disconnectSelected() {
    const set = new Set(sel);
    update((d) => {
      d.map.edges = d.map.edges.filter((e) => !(set.has(e.from) && set.has(e.to)));
    });
  }

  // ---- pointer drag ----
  function onNodeDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (connectMode) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      return;
    }
    if (armed) {
      // in place mode, clicking a node still selects it for editing
      setEditingId(id);
      return;
    }
    drag.current = { id, moved: false, sx: e.clientX, sy: e.clientY };
  }
  function onStageMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const dx = Math.abs(e.clientX - drag.current.sx);
    const dy = Math.abs(e.clientY - drag.current.sy);
    if (dx + dy > 3) drag.current.moved = true;
    const { x, y } = pct(e);
    patchNode(drag.current.id, { x, y });
    if (binRef.current) {
      const b = binRef.current.getBoundingClientRect();
      setOverBin(e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom);
    }
  }
  function onStageUp() {
    const dr = drag.current;
    drag.current = null;
    if (!dr) return;
    if (dr.moved && overBin) {
      removeNode(dr.id);
    } else if (!dr.moved) {
      setEditingId(dr.id);
    }
    setOverBin(false);
  }
  function onStageClick(e: React.MouseEvent) {
    // fires only for clicks on empty stage (nodes stopPropagation on mousedown)
    if (armed) {
      const { x, y } = pct(e);
      addNode(armed, x, y);
    } else if (!connectMode) {
      setEditingId(null);
    }
  }

  const editing = editingId ? map.nodes.find((n) => n.id === editingId) : null;

  return (
    <div className="stack">
      {/* Toolbar */}
      <div className="ornate card">
        <div className="two-col">
          <div>
            <h3 className="section-title">Map background</h3>
            <ImageDrop value={map.background} onChange={setBackground} height={130} label="Drop the overworld map here" />
          </div>
          <div>
            <h3 className="section-title">Tools</h3>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <button
                className={"btn" + (connectMode ? " primary" : "")}
                onClick={() => { setConnectMode((v) => !v); setArmed(null); setEditingId(null); setSel([]); }}
              >
                {connectMode ? "Connecting…" : "Connect nodes"}
              </button>
              {connectMode && (
                <>
                  <button className="btn" onClick={connectSelected} disabled={sel.length < 2}>Join ({sel.length})</button>
                  <button className="btn ghost" onClick={disconnectSelected} disabled={sel.length < 2}>Disconnect</button>
                  <button className="btn ghost" onClick={() => setSel([])} disabled={!sel.length}>Clear</button>
                </>
              )}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {connectMode
                ? "Click nodes in order, then Join to link them with paths."
                : armed
                ? "Placing — click the map to drop markers. Drag markers to move; drag onto the bin to delete."
                : "Pick an icon below to place it, or drag existing markers around. Click a marker to edit it."}
            </p>
            <label className="dev-toggle" style={{ marginTop: 4 }}>
              <input
                type="checkbox"
                checked={!!map.hideMarkers}
                onChange={(e) => update((d) => (d.map.hideMarkers = e.target.checked))}
              />
              <span>Hide markers on the live map (players click the image; they stay visible here)</span>
            </label>
          </div>
        </div>

        {/* Icon type palette */}
        <div className="divider" />
        <div className="spread" style={{ marginBottom: 8 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Icon types — click to place</h3>
          <button className="btn tiny" onClick={() => setShowTypes((v) => !v)}>{showTypes ? "Done managing" : "Manage types"}</button>
        </div>
        <div className="icon-palette">
          {db.iconTypes.map((t) => (
            <button
              key={t.id}
              className={"palette-icon" + (armed === t.id ? " armed" : "")}
              onClick={() => { setArmed((a) => (a === t.id ? null : t.id)); setConnectMode(false); }}
              title={t.name}
            >
              <MapIcon type={t} size={Math.min(30, t.size)} />
              <span>{t.name}</span>
            </button>
          ))}
          {armed && <button className="btn tiny ghost" onClick={() => setArmed(null)}>Stop placing</button>}
        </div>
      </div>

      {showTypes && <IconTypeManager />}

      {/* Map stage */}
      <div
        className="map-stage"
        ref={stageRef}
        onClick={onStageClick}
        onMouseMove={onStageMove}
        onMouseUp={onStageUp}
        onMouseLeave={onStageUp}
        style={{ cursor: armed ? "crosshair" : "default" }}
      >
        {map.background ? (
          <img className="map-bg" src={map.background} alt="map" draggable={false} />
        ) : (
          <div className="map-bg-stage"><MapBackdrop /></div>
        )}

        {map.edges.map((e) => {
          const a = map.nodes.find((n) => n.id === e.from);
          const b = map.nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          return edgeDots(a, b).map((d, i) => (
            <span key={e.id + i} className="map-dot" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
          ));
        })}

        {map.nodes.map((n) => {
          const t = typeById(n.iconTypeId);
          if (!t) return null;
          const selected = sel.includes(n.id);
          return (
            <div
              key={n.id}
              className={"map-node icon-node editable" + (selected ? " connect-sel" : "") + (editingId === n.id ? " editing" : "")}
              style={{ left: `${n.x}%`, top: `${n.y}%`, cursor: connectMode ? "pointer" : "grab" }}
              onMouseDown={(e) => onNodeDown(e, n.id)}
              onClick={(e) => e.stopPropagation()}
            >
              <MapIcon type={t} blocked={n.blocked} inactive={n.inactive} />
              {n.label && <div className="node-label always">{n.label}</div>}
            </div>
          );
        })}

        {/* delete bin */}
        <div ref={binRef} className={"map-bin" + (overBin ? " over" : "")}>🗑 Drop to delete</div>
      </div>

      {/* Selected-node editor */}
      {editing && (
        <div className="ornate card">
          <div className="spread">
            <h3 className="section-title" style={{ margin: 0 }}>Selected marker</h3>
            <button className="icon-btn" onClick={() => setEditingId(null)}>✕</button>
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
            <label className="field" style={{ margin: 0, minWidth: 160 }}>
              <span>Icon type</span>
              <select value={editing.iconTypeId} onChange={(e) => patchNode(editing.id, { iconTypeId: e.target.value })}>
                {db.iconTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field" style={{ margin: 0, minWidth: 200 }}>
              <span>Label (shown on hover)</span>
              <input type="text" value={editing.label} onChange={(e) => patchNode(editing.id, { label: e.target.value })} />
            </label>
            <label className="chip-toggle" style={{ height: 38 }}>
              <input type="checkbox" checked={editing.blocked} onChange={(e) => patchNode(editing.id, { blocked: e.target.checked })} /> Blocked
            </label>
            <label className="chip-toggle" style={{ height: 38 }}>
              <input type="checkbox" checked={editing.inactive} onChange={(e) => patchNode(editing.id, { inactive: e.target.checked })} /> Inactive
            </label>
            <button className="btn tiny danger" onClick={() => removeNode(editing.id)}>Delete</button>
          </div>
        </div>
      )}

      <div className="ornate card">
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {map.nodes.length} markers · {map.edges.length} paths. Connector dots are drawn automatically along each path.
        </p>
      </div>
    </div>
  );
}

// ---- Icon type CRUD ---------------------------------------------------------
function IconTypeManager() {
  const { db, update } = useDB();
  const [name, setName] = useState("");

  function add() {
    const n = name.trim();
    if (!n) return;
    update((d) => {
      d.iconTypes.push({ id: uid("it_"), name: n, image: null, shape: "circle", size: 22, color: "#d8b66a" });
    });
    setName("");
  }
  function patch(id: string, p: Partial<IconType>) {
    update((d) => {
      const t = d.iconTypes.find((x) => x.id === id);
      if (t) Object.assign(t, p);
    });
  }
  function remove(id: string) {
    if (db.map.nodes.some((n) => n.iconTypeId === id)) {
      alert("This icon type is still used by markers on the map. Reassign or delete those markers first.");
      return;
    }
    update((d) => (d.iconTypes = d.iconTypes.filter((t) => t.id !== id)));
  }

  return (
    <div className="ornate card">
      <h3 className="section-title">Manage icon types</h3>
      <div className="inline-add" style={{ marginBottom: 12 }}>
        <input type="text" placeholder="New icon type name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn primary" onClick={add}>Add type</button>
      </div>
      <div className="list-rows">
        {db.iconTypes.map((t) => (
          <div className="list-row ornate" key={t.id} style={{ alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 44, display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <MapIcon type={t} size={Math.min(36, t.size)} />
            </div>
            <div className="grow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, alignItems: "end" }}>
              <label className="field" style={{ margin: 0 }}><span>Name</span>
                <input type="text" value={t.name} onChange={(e) => patch(t.id, { name: e.target.value })} />
              </label>
              <label className="field" style={{ margin: 0 }}><span>Shape</span>
                <select value={t.shape} onChange={(e) => patch(t.id, { shape: e.target.value as IconShape })}>
                  {SHAPE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="field" style={{ margin: 0, width: 84 }}><span>Size</span>
                <input type="number" min={6} max={80} value={t.size} onChange={(e) => patch(t.id, { size: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ margin: 0, width: 60 }}><span>Color</span>
                <input type="color" value={t.color} onChange={(e) => patch(t.id, { color: e.target.value })} style={{ height: 38, padding: 3 }} />
              </label>
            </div>
            <div style={{ width: 120 }}>
              <label className="field" style={{ margin: 0 }}><span>Image</span></label>
              <ImageDrop value={t.image} onChange={(url) => patch(t.id, { image: url })} height={66} label="Icon" />
            </div>
            <button className="btn tiny danger" onClick={() => remove(t.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
