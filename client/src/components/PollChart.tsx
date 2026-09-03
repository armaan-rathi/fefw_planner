import { useEffect, useState } from "react";
import type { Poll, PollOption } from "../types";

interface Props {
  poll: Poll;
  counts: Record<string, number>;
  options?: PollOption[]; // resolved options (custom or sourced); falls back to poll.options
  yourPicks?: string[]; // option ids this viewer voted for (highlighted)
}

type Row = { id: string; label: string; color: string; image?: string | null; value: number; pct: number; mine: boolean };

function rows(opts: PollOption[], counts: Record<string, number>, yourPicks: string[]): { data: Row[]; total: number } {
  const total = opts.reduce((s, o) => s + (counts[o.id] ?? 0), 0);
  const data = opts.map((o) => {
    const value = counts[o.id] ?? 0;
    return { id: o.id, label: o.label, color: o.color, image: o.image, value, pct: total ? (value / total) * 100 : 0, mine: yourPicks.includes(o.id) };
  });
  return { data, total };
}

const Icon = ({ r }: { r: Row }) => (r.image ? <img className="poll-icon" src={r.image} alt="" /> : null);

const fmtPct = (p: number) => (Math.round(p * 10) / 10).toString().replace(/\.0$/, "") + "%";

const votesStr = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

function valueLabel(poll: Poll, r: Row): string {
  const parts: string[] = [];
  if (poll.showValues) parts.push(votesStr(r.value));
  if (poll.showPercent) parts.push(fmtPct(r.pct));
  return parts.join(" · ");
}

// Dense ranking ("1-2-2-3"): ties share a rank, and the next distinct value
// takes the very next rank (no gaps).
function rankOf(data: Row[], value: number): number {
  return 1 + new Set(data.filter((d) => d.value > value).map((d) => d.value)).size;
}

// Small mount animation: grow bars / fade the pie in.
function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return grown;
}

export function PollChart({ poll, counts, options, yourPicks = [] }: Props) {
  const grown = useGrown();
  const { data, total } = rows(options ?? poll.options, counts, yourPicks);

  if (total === 0) {
    return <div className="poll-empty">No votes yet — be the first!</div>;
  }

  if (poll.graph === "pie" || poll.graph === "donut") {
    return <PieChart poll={poll} data={data} grown={grown} donut={poll.graph === "donut"} />;
  }
  if (poll.graph === "vbar") {
    return <VBar poll={poll} data={data} grown={grown} />;
  }
  return <HBar poll={poll} data={data} grown={grown} />;
}

// ---- Horizontal bars --------------------------------------------------------
function HBar({ poll, data, grown }: { poll: Poll; data: Row[]; grown: boolean }) {
  const max = Math.max(1, ...data.map((r) => r.value));
  // Results read best ranked — highest votes on top; ties keep their original
  // order (stable sort), matching the tie-aware rank numbers.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const showRank = poll.showRank !== false;
  return (
    <div className="poll-hbar">
      {sorted.map((r) => {
        const base = valueLabel(poll, r);
        return (
        <div className={"poll-hbar-row" + (r.mine ? " mine" : "")} key={r.id}>
          <div className="poll-hbar-head">
            <span className="poll-row-label"><Icon r={r} />{r.label}{r.mine && <span className="poll-you">your pick</span>}</span>
            {(showRank || base) && (
              <span className="poll-row-value">
                {showRank && <span className="poll-rank">#{rankOf(data, r.value)}</span>}
                {showRank && base ? " · " : ""}
                {base}
              </span>
            )}
          </div>
          <div className="poll-hbar-track">
            <div
              className="poll-hbar-fill"
              style={{ width: (grown ? (r.value / max) * 100 : 0) + "%", background: r.color }}
            />
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ---- Vertical bars ----------------------------------------------------------
function VBar({ poll, data, grown }: { poll: Poll; data: Row[]; grown: boolean }) {
  const max = Math.max(1, ...data.map((r) => r.value));
  return (
    <div className="poll-vbar">
      {data.map((r) => (
        <div className={"poll-vbar-col" + (r.mine ? " mine" : "")} key={r.id}>
          {(poll.showValues || poll.showPercent) && <div className="poll-vbar-value">{valueLabel(poll, r)}</div>}
          <div className="poll-vbar-track">
            <div
              className="poll-vbar-fill"
              style={{ height: (grown ? (r.value / max) * 100 : 0) + "%", background: r.color }}
            />
          </div>
          <Icon r={r} />
          <div className="poll-vbar-label" title={r.label}>{r.label}{r.mine && <span className="poll-you">✓</span>}</div>
        </div>
      ))}
    </div>
  );
}

// ---- Pie / donut ------------------------------------------------------------
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function PieChart({ poll, data, grown, donut }: { poll: Poll; data: Row[]; grown: boolean; donut: boolean }) {
  const size = 210;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  const active = data.filter((d) => d.value > 0);

  // Pre-compute each slice's angles so we can draw the wedge and place its % label.
  const slices: { d: Row; a0: number; a1: number; mid: number }[] = [];
  let angle = -Math.PI / 2;
  for (const d of active) {
    const sweep = (d.pct / 100) * Math.PI * 2;
    slices.push({ d, a0: angle, a1: angle + sweep, mid: angle + sweep / 2 });
    angle += sweep;
  }
  const rLabel = donut ? r * 0.78 : r * 0.6; // where the % sits within a slice
  const labelMin = 6; // hide the on-slice % for slivers too small to read

  return (
    <div className="poll-pie-wrap">
      <div className={"poll-pie" + (grown ? " grown" : "")}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img">
          {active.length === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill={active[0].color} />
          ) : (
            slices.map((s) => (
              <path key={s.d.id} d={arcPath(cx, cy, r, s.a0, s.a1)} fill={s.d.color} stroke="var(--panel)" strokeWidth={2} className={s.d.mine ? "mine" : undefined} />
            ))
          )}
          {donut && <circle cx={cx} cy={cy} r={r * 0.56} fill="var(--panel)" />}
          {/* % labels on top of the slices */}
          {poll.showPercent && active.length === 1 && (
            <text x={cx} y={donut ? cy - rLabel : cy} textAnchor="middle" dominantBaseline="central" className="poll-pie-pct">{fmtPct(100)}</text>
          )}
          {poll.showPercent && active.length > 1 && slices.filter((s) => s.d.pct >= labelMin).map((s) => (
            <text
              key={s.d.id}
              x={cx + rLabel * Math.cos(s.mid)}
              y={cy + rLabel * Math.sin(s.mid)}
              textAnchor="middle"
              dominantBaseline="central"
              className="poll-pie-pct"
            >
              {fmtPct(s.d.pct)}
            </text>
          ))}
        </svg>
      </div>
      <div className="poll-legend">
        {data.map((r2) => (
          <div className={"poll-legend-row" + (r2.mine ? " mine" : "")} key={r2.id}>
            <span className="poll-legend-dot" style={{ background: r2.color }} />
            <Icon r={r2} />
            <span className="poll-legend-label">{r2.label}{r2.mine && <span className="poll-you">your pick</span>}</span>
            {(poll.showValues || poll.showPercent) && <span className="poll-legend-value">{valueLabel(poll, r2)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
