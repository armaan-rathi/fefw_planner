import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { UnitPortrait } from "../../components/UnitPortrait";
import { ImageDrop } from "../../components/ImageDrop";
import { Modal } from "../../components/Modal";
import type { Route } from "../../types";

export function RoutesEditor() {
  const { db, update } = useDB();
  const [editing, setEditing] = useState<Route | null>(null);

  function save(route: Route) {
    update((d) => {
      const i = d.routes.findIndex((r) => r.id === route.id);
      if (i >= 0) d.routes[i] = route;
      else d.routes.push(route);
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Delete this route? Units locked to or starting on it will be unassigned (the units themselves stay).")) return;
    update((d) => {
      d.routes = d.routes.filter((r) => r.id !== id);
      d.units.forEach((u) => {
        u.routeIds = u.routeIds.filter((x) => x !== id);
        u.starterFor = u.starterFor.filter((x) => x !== id);
      });
    });
  }
  function addNew() {
    setEditing({ id: uid("route_"), name: "", title: "", description: "", color: "#5b7cc2", portrait: null, banner: null });
  }

  return (
    <div>
      <div className="spread" style={{ marginBottom: 14 }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>Routes ({db.routes.length})</h3>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            The story paths. Each lord is a <b>unit</b> (with “Is lord?” checked) locked to their route — edit them under Units.
          </p>
        </div>
        <button className="btn primary" onClick={addNew}>+ New Route</button>
      </div>

      <div className="grid-cards">
        {db.routes.map((r) => {
          const lord = db.units.find((u) => u.isLord && u.routeIds.includes(r.id));
          return (
            <div className="ornate card" key={r.id} style={{ ["--accent" as any]: r.color }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <UnitPortrait src={r.portrait} name={r.name} size={56} shape="square" />
                <div className="grow">
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{r.name || "Unnamed route"}</div>
                  {r.title && <div className="muted" style={{ fontSize: 12.5 }}>{r.title}</div>}
                  <span className="dot" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: r.color, marginTop: 4 }} />
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13, minHeight: 38 }}>{r.description || "No path description yet."}</p>
              <div className="row spread">
                <span className="muted" style={{ fontSize: 12 }}>Lord: {lord ? lord.name : "— none set —"}</span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn tiny" onClick={() => setEditing(r)}>Edit</button>
                <button className="btn tiny danger" onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <RouteModal route={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function RouteModal({ route, onClose, onSave }: { route: Route; onClose: () => void; onSave: (r: Route) => void }) {
  const [draft, setDraft] = useState<Route>(route);
  const set = (patch: Partial<Route>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Modal
      open
      title={route.name ? `Edit ${route.name}` : "New Route"}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(draft)}>Save</button>
        </>
      }
    >
      <div className="two-col">
        <div>
          <label className="field"><span>Route name</span>
            <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="field"><span>Banner / faction</span>
            <input type="text" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="field"><span>Motif color</span>
            <input type="color" value={draft.color} onChange={(e) => set({ color: e.target.value })} style={{ height: 40, padding: 4 }} />
          </label>
        </div>
        <div>
          <label className="field"><span>Route splash art (optional)</span></label>
          <ImageDrop value={draft.portrait} onChange={(url) => set({ portrait: url })} height={160} />
        </div>
      </div>
      <label className="field"><span>Banner (used on the Route Split page)</span></label>
      <ImageDrop value={draft.banner ?? null} onChange={(url) => set({ banner: url })} height={110} label="Drop the route banner here" />
      <label className="field"><span>Path description</span>
        <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={5} />
      </label>
    </Modal>
  );
}
