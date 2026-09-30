import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { RANK_COLOR, RANK_ORDER, supportAdjacency, unitsWithSupports } from "../data/supports";
import type { Unit } from "../types";

const VB = 700;
const CENTER = VB / 2;

export function Supports() {
  const { db } = useDB();
  const adj = useMemo(() => supportAdjacency(db), [db]);
  const withSupports = useMemo(() => unitsWithSupports(db), [db]);
  const unitById = useMemo(() => new Map(db.units.map((u) => [u.id, u])), [db.units]);

  // Units that have at least one support, in unit order, for the picker.
  const selectable = useMemo(() => db.units.filter((u) => withSupports.has(u.id)), [db.units, withSupports]);
  const [centerId, setCenterId] = useState<string>(selectable[0]?.id ?? "");
  const center = unitById.get(centerId) ?? selectable[0];

  const neighbors = useMemo(() => {
    const list = (adj.get(center?.id ?? "") ?? []).slice();
    list.sort((a, b) => (RANK_ORDER[a.rank] ?? 9) - (RANK_ORDER[b.rank] ?? 9) || (unitById.get(a.id)?.name ?? "").localeCompare(unitById.get(b.id)?.name ?? ""));
    return list.map((x) => ({ ...x, unit: unitById.get(x.id) })).filter((x) => x.unit) as { id: string; rank: string; unit: Unit }[];
  }, [adj, center, unitById]);

  if (selectable.length === 0 || !center) return (
    <div>
      <div className="page-head"><div><h2>Supports</h2><p>Support links between characters.</p></div></div>
      <div className="empty-hint">No support data yet. Add it in Dev Mode → Supports.</div>
    </div>
  );

  const n = neighbors.length;
  const R = Math.min(275, 130 + n * 12);
  const nodes = neighbors.map((nb, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, n);
    return { ...nb, x: CENTER + R * Math.cos(ang), y: CENTER + R * Math.sin(ang) };
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Supports</h2>
          <p>Pick a character to see who they support with. Click any linked character to recenter.</p>
        </div>
        <label className="field" style={{ minWidth: 220 }}>
          <span>Character</span>
          <select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
            {selectable.map((u) => <option key={u.id} value={u.id}>{u.name || "Unnamed"}</option>)}
          </select>
        </label>
      </div>

      <div className="support-wrap">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="support-graph" role="img">
          <defs>
            <clipPath id="sup-clip-center"><circle cx={CENTER} cy={CENTER} r={46} /></clipPath>
            {nodes.map((nb) => (
              <clipPath id={`sup-clip-${nb.id}`} key={nb.id}><circle cx={nb.x} cy={nb.y} r={32} /></clipPath>
            ))}
          </defs>

          <g className="sup-anim" key={center.id}>
          {/* edges */}
          {nodes.map((nb) => (
            <line key={"e" + nb.id} x1={CENTER} y1={CENTER} x2={nb.x} y2={nb.y} className="sup-edge" />
          ))}
          {/* rank labels */}
          {nodes.map((nb) => {
            const lx = CENTER + (nb.x - CENTER) * 0.6;
            const ly = CENTER + (nb.y - CENTER) * 0.6;
            return (
              <g key={"r" + nb.id}>
                <circle cx={lx} cy={ly} r={12} className="sup-rank-bg" />
                <text x={lx} y={ly} className="sup-rank" style={{ fill: RANK_COLOR[nb.rank] ?? "#ccc" }}>{nb.rank}</text>
              </g>
            );
          })}

          {/* neighbor portraits */}
          {nodes.map((nb) => (
            <g key={"n" + nb.id} className="sup-node" onClick={() => setCenterId(nb.id)}>
              <circle cx={nb.x} cy={nb.y} r={33} className="sup-ring" />
              <Portrait unit={nb.unit} cx={nb.x} cy={nb.y} r={32} clip={`sup-clip-${nb.id}`} />
              <text x={nb.x} y={nb.y + 32 + 15} className="sup-name">{nb.unit.name}</text>
            </g>
          ))}

          {/* center */}
          <g className="sup-center">
            <circle cx={CENTER} cy={CENTER} r={48} className="sup-ring center" />
            <Portrait unit={center} cx={CENTER} cy={CENTER} r={46} clip="sup-clip-center" />
            <text x={CENTER} y={CENTER + 46 + 17} className="sup-name center">{center.name}</text>
          </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

function Portrait({ unit, cx, cy, r, clip }: { unit: Unit; cx: number; cy: number; r: number; clip: string }) {
  if (unit.portrait) {
    return <image href={unit.portrait} x={cx - r} y={cy - r} width={r * 2} height={r * 2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMin slice" />;
  }
  const initial = (unit.name?.trim()[0] || "?").toUpperCase();
  return (
    <>
      <circle cx={cx} cy={cy} r={r} className="sup-initial-bg" />
      <text x={cx} y={cy} className="sup-initial" style={{ fontSize: r }}>{initial}</text>
    </>
  );
}
