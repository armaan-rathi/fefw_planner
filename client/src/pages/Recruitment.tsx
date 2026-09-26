import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDB } from "../data/DataContext";
import { Modal } from "../components/Modal";
import { UnitPortrait } from "../components/UnitPortrait";
import { condFilled, isNum, recruitableUnits } from "../data/recruitment";
import type { DB, RecruitCondition, Unit } from "../types";

type Route = DB["routes"][number];
type View = "character" | "route";

// ---- Compact condition symbols: ♥ support, ✦ renown -------------------------
const HeartIcon = () => (
  <svg className="ci" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 20.7C5.9 17.1 3 13.4 3 9.6 3 7 5 5 7.6 5c1.8 0 3.2.9 4 2.3C12.2 5.9 13.6 5 15.4 5 18 5 20 7 20 9.6c0 3.8-2.9 7.5-8 11.1Z" /></svg>
);
const StarIcon = () => (
  <svg className="ci" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 1.6 14.7 9.3 22.4 12 14.7 14.7 12 22.4 9.3 14.7 1.6 12 9.3 9.3Z" /></svg>
);

export function Recruitment() {
  const { db } = useDB();
  const [view, setView] = useState<View>("character");
  const units = useMemo(() => recruitableUnits(db), [db]);
  const routes = db.routes;
  const [detail, setDetail] = useState<{ unit: Unit; route: Route } | null>(null);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Recruitment</h2>
          <p>How and where to recruit each character.</p>
        </div>
      </div>

      <div className="cast-tabs">
        <button className={view === "character" ? "active" : ""} onClick={() => setView("character")}>By Character</button>
        <button className={view === "route" ? "active" : ""} onClick={() => setView("route")}>By Route</button>
      </div>

      {units.length === 0 ? (
        <div className="empty-hint">No recruitment info yet. Add it in Dev Mode → Recruitment.</div>
      ) : view === "character" ? (
        <ByCharacter units={units} routes={routes} />
      ) : (
        <ByRoute units={units} routes={routes} onOpen={(unit, route) => setDetail({ unit, route })} />
      )}

      {detail && (
        <Modal open title={`${detail.unit.name || "Unit"} — ${detail.route.name || "Route"}`} onClose={() => setDetail(null)}>
          <RecruitDetail unit={detail.unit} route={detail.route} />
        </Modal>
      )}
    </div>
  );
}

// ---- By Character: rows of characters, a column per route ------------------
function ByCharacter({ units, routes }: { units: Unit[]; routes: Route[] }) {
  return (
    <div className="recruit-scroll">
      <table className="recruit-table">
        <thead>
          <tr>
            <th className="recruit-char-col">Character</th>
            {routes.map((r) => <th key={r.id}>{r.name || "Route"}</th>)}
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td className="recruit-char-col">
                <span className="row" style={{ gap: 9 }}>
                  <UnitPortrait src={u.portrait} name={u.name} size={34} />
                  <b>{u.name || "Unnamed"}</b>
                </span>
              </td>
              {routes.map((r) => {
                const cond = u.recruitment?.[r.id];
                return (
                  <td key={r.id}>
                    {condFilled(cond) ? <CondCell cond={cond!} /> : <span className="muted recruit-dash">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CondCell({ cond }: { cond: RecruitCondition }) {
  const starting = cond.extra === "Starting unit";
  const hasSyms = isNum(cond.support) || isNum(cond.renown);
  return (
    <div className="recruit-cell">
      {starting && <span className="recruit-ok">Starting</span>}
      {hasSyms && <CondSymbols cond={cond} />}
      {cond.paralogue && <div className="recruit-misc"><b>Paralogue:</b> {cond.paralogue}</div>}
      {cond.requirement && <div className="recruit-misc"><b>Req:</b> {cond.requirement}</div>}
    </div>
  );
}

// Heart/star symbols, matching the By Route cards. Negotiation lives in the
// By Route detail popup only.
function CondSymbols({ cond }: { cond: RecruitCondition }) {
  return (
    <span className="cond-syms">
      {isNum(cond.support) && <span className="cond-sym support" title={`Support Lv. ${cond.support}`}><HeartIcon />{cond.support}</span>}
      {isNum(cond.renown) && <span className="cond-sym renown" title={`Renown Lv. ${cond.renown}`}><StarIcon />{cond.renown}</span>}
    </span>
  );
}

// ---- By Route: renown-level rows × one column per route --------------------
type Bucket = { key: string; label: string; sort: number };
function bucketFor(c: RecruitCondition): Bucket {
  if (isNum(c.renown)) return { key: `r${c.renown}`, label: `${c.renown}R`, sort: c.renown! };
  if (c.extra === "Starting unit") return { key: "start", label: "1R", sort: 1 };
  return { key: "other", label: "Other", sort: 99 };
}
function ByRoute({ units, routes, onOpen }: { units: Unit[]; routes: Route[]; onOpen: (u: Unit, r: Route) => void }) {
  // Bucket each recruitable (unit, route) pair by renown level into a grid cell.
  const { buckets, cell } = useMemo(() => {
    const bmap = new Map<string, Bucket>();
    const cell = new Map<string, Unit[]>();
    for (const u of units) {
      for (const r of routes) {
        const c = u.recruitment?.[r.id];
        if (!condFilled(c)) continue;
        const b = bucketFor(c!);
        bmap.set(b.key, b);
        const k = b.key + "|" + r.id;
        let arr = cell.get(k);
        if (!arr) { arr = []; cell.set(k, arr); }
        arr.push(u);
      }
    }
    const buckets = [...bmap.values()].sort((a, b) => a.sort - b.sort);
    return { buckets, cell };
  }, [units, routes]);

  return (
    <div className="recruit-grid-scroll">
      <div className="recruit-grid" style={{ gridTemplateColumns: `52px repeat(${routes.length}, minmax(0, 1fr))` }}>
        <div className="rg-corner" />
        {routes.map((r) => (
          <div className="rg-head" key={r.id} style={{ color: r.color, borderColor: r.color }}>{r.name || "Route"}</div>
        ))}
        {buckets.map((b) => (
          <RgRow key={b.key} bucket={b} routes={routes} cell={cell} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function RgRow({ bucket, routes, cell, onOpen }: { bucket: Bucket; routes: Route[]; cell: Map<string, Unit[]>; onOpen: (u: Unit, r: Route) => void }) {
  return (
    <>
      <div className="rg-label">{bucket.label}</div>
      {routes.map((r) => {
        const here = cell.get(bucket.key + "|" + r.id) ?? [];
        return (
          <div className="rg-cell" key={r.id}>
            {here.map((u) => <RouteCard key={u.id} unit={u} cond={u.recruitment![r.id]} onOpen={() => onOpen(u, r)} />)}
          </div>
        );
      })}
    </>
  );
}

function RouteCard({ unit, cond, onOpen }: { unit: Unit; cond: RecruitCondition; onOpen: () => void }) {
  const initial = (unit.name?.trim()[0] || "?").toUpperCase();
  const hasIcons = isNum(cond.support) || isNum(cond.renown);
  return (
    <button className="rg-card" onClick={onOpen} title="See full conditions">
      <span className="rg-portrait">
        {unit.portrait ? <img src={unit.portrait} alt={unit.name} /> : <span className="rg-initial">{initial}</span>}
        {hasIcons && (
          <span className="rg-icons">
            {isNum(cond.support) && <span className="rg-ic support"><HeartIcon />{cond.support}</span>}
            {isNum(cond.renown) && <span className="rg-ic renown"><StarIcon />{cond.renown}</span>}
          </span>
        )}
      </span>
      <RgName name={unit.name || "Unnamed"} />
    </button>
  );
}

// Shrinks a card name's font just enough to keep it on one line at any card width.
function RgName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = 11.5;
      el.style.fontSize = size + "px";
      let guard = 0;
      while (el.scrollWidth > el.clientWidth && size > 8 && guard < 24) {
        size -= 0.5;
        el.style.fontSize = size + "px";
        guard++;
      }
    };
    fit();
    const parent = el.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [name]);
  return <span ref={ref} className="rg-name">{name}</span>;
}

function RecruitDetail({ unit, route }: { unit: Unit; route: Route }) {
  const cond = unit.recruitment?.[route.id];
  const starting = cond?.extra === "Starting unit";
  const hasSyms = !!cond && (isNum(cond.support) || isNum(cond.renown));
  const hasAny = !!cond && (hasSyms || !!cond.paralogue || !!cond.requirement);
  return (
    <div>
      <div className="row" style={{ gap: 12, marginBottom: 12 }}>
        <UnitPortrait src={unit.portrait} name={unit.name} size={56} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{unit.name || "Unnamed"}</div>
          <div className="muted">{route.name || "Route"}</div>
        </div>
      </div>
      {starting && <div className="recruit-ok" style={{ fontSize: 15, marginBottom: hasAny ? 10 : 0 }}>Starting</div>}
      {hasSyms && <div className="cond-syms-lg"><CondSymbols cond={cond!} /></div>}
      {cond?.paralogue && <div className="recruit-detail-line"><b>Paralogue:</b> {cond.paralogue}</div>}
      {cond?.requirement && <div className="recruit-detail-line"><b>Requirement:</b> {cond.requirement}</div>}
      {!starting && !hasAny && <p className="muted" style={{ margin: 0 }}>No conditions.</p>}
    </div>
  );
}
