import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { learnsetEntries, learnsetProficiencies } from "../../data/magic";
import { LEARNSET_RANKS } from "../../types";

export function LearnsetEditor() {
  const { db, update } = useDB();
  const skillChoices = db.skillTypes;
  const [prof, setProf] = useState<string>(learnsetProficiencies(db)[0] ?? skillChoices[0]?.id ?? "reason");
  const [unitId, setUnitId] = useState<string>(db.units[0]?.id ?? "");

  // Learnset entries for this proficiency = spells + combat arts + mapped skills (+/++).
  const entries = useMemo(() => learnsetEntries(db, prof), [db, prof]);
  const entryName = (id: string) => entries.find((e) => e.id === id)?.name ?? "?";
  const unit = db.units.find((u) => u.id === unitId);

  function setRank(rank: string, ids: string[]) {
    update((d) => {
      const u = d.units.find((x) => x.id === unitId);
      if (!u) return;
      const ls = u.learnsets ?? (u.learnsets = {});
      const byProf = ls[prof] ?? (ls[prof] = {});
      if (ids.length) byProf[rank] = ids;
      else delete byProf[rank];
      if (Object.keys(byProf).length === 0) delete ls[prof];
      if (u.learnsets && Object.keys(u.learnsets).length === 0) delete u.learnsets;
    });
  }
  const idsAt = (rank: string) => unit?.learnsets?.[prof]?.[rank] ?? [];

  return (
    <div className="ornate card">
      <div className="row" style={{ gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <label className="field" style={{ margin: 0 }}><span>Proficiency</span>
          <select value={prof} onChange={(e) => setProf(e.target.value)}>
            {skillChoices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="field" style={{ margin: 0, minWidth: 220 }}><span>Unit</span>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {db.units.map((u) => <option key={u.id} value={u.id}>{u.name || "Unnamed"}</option>)}
          </select>
        </label>
      </div>

      {entries.length === 0 ? (
        <div className="empty-hint">No spells or combat arts for this proficiency yet. Add them in Dev Mode → Magic or Combat Arts first.</div>
      ) : !unit ? (
        <div className="empty-hint">No unit selected.</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Pick the spells learned at each proficiency rank. Multiple per rank is fine.</p>
          {LEARNSET_RANKS.map((rank) => {
            const ids = idsAt(rank);
            const available = entries.filter((s) => !ids.includes(s.id));
            return (
              <div className="row" key={rank} style={{ gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, width: 34, color: "var(--gold-bright)", paddingTop: 4 }}>{rank}</span>
                <div className="chip-wrap" style={{ flex: 1 }}>
                  {ids.map((id) => (
                    <span className="tag" key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {entryName(id)}
                      <button className="icon-btn" title="Remove" onClick={() => setRank(rank, ids.filter((x) => x !== id))}>✕</button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) setRank(rank, [...ids, e.target.value]); }}
                    disabled={available.length === 0}
                  >
                    <option value="">{available.length ? "+ add spell" : "—"}</option>
                    {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
