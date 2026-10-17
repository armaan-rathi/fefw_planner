import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { LEARNSET_RANKS } from "../../types";

export function LearnsetEditor() {
  const { db, update } = useDB();
  const magicSkills = db.skillTypes.filter((s) => ["reason", "faith"].includes(s.id));
  const skillChoices = magicSkills.length ? magicSkills : db.skillTypes;
  const [prof, setProf] = useState<string>(skillChoices[0]?.id ?? "reason");
  const [unitId, setUnitId] = useState<string>(db.units[0]?.id ?? "");

  const spells = useMemo(() => (db.spells ?? []).filter((s) => s.proficiency === prof), [db.spells, prof]);
  const spellName = (id: string) => spells.find((s) => s.id === id)?.name ?? "?";
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

      {spells.length === 0 ? (
        <div className="empty-hint">No spells for this proficiency yet. Add them in Dev Mode → Magic first.</div>
      ) : !unit ? (
        <div className="empty-hint">No unit selected.</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Pick the spells learned at each proficiency rank. Multiple per rank is fine.</p>
          {LEARNSET_RANKS.map((rank) => {
            const ids = idsAt(rank);
            const available = spells.filter((s) => !ids.includes(s.id));
            return (
              <div className="row" key={rank} style={{ gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 700, width: 34, color: "var(--gold-bright)", paddingTop: 4 }}>{rank}</span>
                <div className="chip-wrap" style={{ flex: 1 }}>
                  {ids.map((id) => (
                    <span className="tag" key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {spellName(id)}
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
