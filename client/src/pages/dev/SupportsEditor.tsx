import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";

const RANKS = ["A", "B", "C"];

export function SupportsEditor() {
  const { db, update } = useDB();
  const unitById = useMemo(() => new Map(db.units.map((u) => [u.id, u])), [db.units]);
  const unitsSorted = useMemo(() => [...db.units].sort((x, y) => x.name.localeCompare(y.name)), [db.units]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [rank, setRank] = useState("C");
  const [query, setQuery] = useState("");

  function setPair(ua: string, ub: string, r: string) {
    if (!ua || !ub || ua === ub) return;
    update((d) => {
      const list = (d.supports ?? []).filter((e) => !((e.a === ua && e.b === ub) || (e.a === ub && e.b === ua)));
      list.push({ a: ua, b: ub, rank: r });
      d.supports = list;
    });
  }
  function removeAt(idx: number) {
    update((d) => { d.supports = (d.supports ?? []).filter((_, i) => i !== idx); });
  }

  const rows = (db.supports ?? []).map((e, i) => ({ e, i, an: unitById.get(e.a)?.name ?? e.a, bn: unitById.get(e.b)?.name ?? e.b }));
  const q = query.toLowerCase().trim();
  const filtered = rows.filter((r) => !q || r.an.toLowerCase().includes(q) || r.bn.toLowerCase().includes(q)).sort((x, y) => x.an.localeCompare(y.an) || x.bn.localeCompare(y.bn));

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title" style={{ marginTop: 0 }}>Add / update a support</h3>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Supports are symmetric. Setting a pair overwrites any existing link between them.</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="field"><span>Character A</span>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">—</option>
              {unitsSorted.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Character B</span>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">—</option>
              {unitsSorted.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="field" style={{ maxWidth: 90 }}><span>Max rank</span>
            <select value={rank} onChange={(e) => setRank(e.target.value)}>
              {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button className="btn primary" onClick={() => setPair(a, b, rank)} disabled={!a || !b || a === b}>Set support</button>
        </div>
      </div>

      <div className="ornate card">
        <div className="spread" style={{ marginBottom: 6 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Support links ({rows.length})</h3>
          <input type="text" placeholder="Search a character…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="rate-table">
            <thead><tr><th>Character A</th><th>Character B</th><th style={{ width: 70 }}>Rank</th><th style={{ width: 70 }} /></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.i}>
                  <td>{r.an}</td>
                  <td>{r.bn}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{r.e.rank}</td>
                  <td><button className="btn danger" onClick={() => removeAt(r.i)}>✕</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4}><span className="muted">No matching supports.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
