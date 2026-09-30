import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { assignLanes, globalRange, ordToMD, paralogueColor, routeEvents, weekdayMon } from "../data/paralogues";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEADER = 24;
const BARH = 18;
const GAP = 3;

function textOn(bg: string): string {
  const h = bg.replace("#", "");
  if (h.length < 6) return "#f5f0e6";
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1512" : "#f5f0e6";
}

export function Paralogues() {
  const { db } = useDB();
  const routes = db.routes;
  const [routeId, setRouteId] = useState<string>(routes[0]?.id ?? "");

  const { min, max } = useMemo(() => globalRange(db), [db]);
  const events = useMemo(() => assignLanes(routeEvents(db, routeId)), [db, routeId]);

  // Whole weeks (Mon-start) covering the global range.
  const weeks = useMemo(() => {
    const startOrd = min - weekdayMon(min);
    const endOrd = max + (6 - weekdayMon(max));
    const out: number[] = [];
    for (let w = startOrd; w <= endOrd; w += 7) out.push(w);
    return out;
  }, [min, max]);

  // Legend: paralogues available on this route, with their windows.
  const legend = (db.paralogues ?? [])
    .map((p) => ({ p, wins: p.windows?.[routeId] ?? [] }))
    .filter(({ wins }) => wins.length > 0);

  const hasData = (db.paralogues ?? []).length > 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Paralogues</h2>
          <p>When each paralogue is available. Pick a route to see its schedule.</p>
        </div>
      </div>

      {!hasData ? (
        <div className="empty-hint">No paralogues yet. Add them in Dev Mode → Paralogues.</div>
      ) : (
        <>
          <div className="cast-tabs">
            {routes.map((r) => (
              <button
                key={r.id}
                className={routeId === r.id ? "active" : ""}
                onClick={() => setRouteId(r.id)}
                style={routeId === r.id ? { color: r.color, borderColor: r.color } : undefined}
              >
                {r.name || "Route"}
              </button>
            ))}
          </div>

          <div className="cal-legend">
            {legend.length === 0 ? (
              <span className="muted">No paralogues available on this route.</span>
            ) : (
              legend.map(({ p, wins }) => (
                <div className="cal-legend-item" key={p.id}>
                  <span className="cal-legend-swatch" style={{ background: paralogueColor(db, p) }} />
                  <b>{p.name}</b>
                  <span className="muted">{wins.map((w) => `${w.start} – ${w.end}`).join(", ")}</span>
                </div>
              ))
            )}
          </div>

          <div className="cal">
            <div className="cal-weekday-head">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            {weeks.map((wkStart) => {
              const wkEvents = events.filter((ev) => !(ev.end < wkStart || ev.start > wkStart + 6));
              const maxLane = wkEvents.reduce((mx, e) => Math.max(mx, e.lane), -1);
              const body = Math.max(44, (maxLane + 1) * (BARH + GAP) + (maxLane >= 0 ? 6 : 0));
              return (
                <div className="cal-week" key={wkStart} style={{ height: HEADER + body }}>
                  {Array.from({ length: 7 }, (_, i) => {
                    const ord = wkStart + i;
                    const { m, d } = ordToMD(ord);
                    const inRange = ord >= min && ord <= max;
                    return (
                      <div className={"cal-day" + (inRange ? "" : " out")} key={i}>
                        {d === 1 ? <span className="cal-month">{MONTHS[m]}</span> : <span className="cal-daynum">{d}</span>}
                      </div>
                    );
                  })}
                  {wkEvents.map((ev, idx) => {
                    const segStart = Math.max(ev.start, wkStart);
                    const segEnd = Math.min(ev.end, wkStart + 6);
                    const c0 = segStart - wkStart;
                    const c1 = segEnd - wkStart;
                    const isStart = segStart === ev.start;
                    const isEnd = segEnd === ev.end;
                    return (
                      <div
                        key={idx}
                        className="cal-bar"
                        title={ev.name}
                        style={{
                          left: `calc(${(c0 / 7) * 100}% + 3px)`,
                          width: `calc(${((c1 - c0 + 1) / 7) * 100}% - 6px)`,
                          top: HEADER + ev.lane * (BARH + GAP),
                          height: BARH,
                          background: ev.color,
                          color: textOn(ev.color),
                          borderTopLeftRadius: isStart ? 6 : 2,
                          borderBottomLeftRadius: isStart ? 6 : 2,
                          borderTopRightRadius: isEnd ? 6 : 2,
                          borderBottomRightRadius: isEnd ? 6 : 2,
                          opacity: isStart ? 1 : 0.92,
                        }}
                      >
                        {isStart ? ev.name : ""}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
