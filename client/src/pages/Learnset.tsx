import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { UnitPortrait } from "../components/UnitPortrait";
import { learned, spellMap, spellProficiencies, spellsFor } from "../data/magic";
import { filterSpoilerUnits, useSpoilers } from "../data/spoilers";
import { LEARNSET_RANKS } from "../types";
import type { Spell } from "../types";

const num = (n: number | null) => (n === null || n === undefined ? "—" : String(n));

function spellTip(s: Spell): string {
  const parts = [
    `Mt ${num(s.power)}`,
    `Hit ${num(s.hit)}`,
    `Rng ${s.range || "—"}`,
    `Wt ${num(s.weight)}`,
    s.crit ? `Crit ${s.crit}` : "",
    s.uses !== null ? `Uses ${s.uses}` : "",
  ].filter(Boolean);
  return s.effect ? `${parts.join(" · ")}\n${s.effect}` : parts.join(" · ");
}

export function Learnset() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();

  const profs = useMemo(() => spellProficiencies(db), [db]);
  const [prof, setProf] = useState<string>(profs[0] ?? "reason");
  const activeProf = profs.includes(prof) ? prof : profs[0] ?? "reason";
  const profLabel = (id: string) => db.skillTypes.find((s) => s.id === id)?.label ?? id;

  const spells = useMemo(() => spellsFor(db, activeProf), [db, activeProf]);
  const byId = useMemo(() => spellMap(db), [db]);

  // Units that learn anything in this proficiency.
  const units = useMemo(() => {
    const list = db.units.filter((u) => {
      const ls = u.learnsets?.[activeProf];
      return ls && Object.values(ls).some((ids) => ids.length > 0);
    });
    return filterSpoilerUnits(list, allowSpoilers);
  }, [db.units, activeProf, allowSpoilers]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Learnset</h2>
          <p>Spells and combat arts each unit learns, by proficiency rank.</p>
        </div>
      </div>

      <div className="learnset-disclaimer">
        <p style={{ margin: 0 }}>Disclaimer: This list is not complete.</p>
        <p style={{ margin: "2px 0 0" }}>Credit to the <i>Fortune's Weave Learnsets and Info Community Collection Sheet</i></p>
      </div>

      {profs.length > 1 && (
        <div className="cast-tabs">
          {profs.map((p) => (
            <button key={p} className={p === activeProf ? "active" : ""} onClick={() => setProf(p)}>{profLabel(p)}</button>
          ))}
        </div>
      )}

      {units.length === 0 ? (
        <div className="empty-hint">No {profLabel(activeProf)} learnsets yet. Add them in Dev Mode → Learnset.</div>
      ) : (
        <div className="recruit-scroll">
          <table className="recruit-table learnset-table">
            <thead>
              <tr>
                <th className="recruit-char-col">Unit</th>
                {LEARNSET_RANKS.map((r) => <th key={r}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="recruit-char-col">
                    <span className="row" style={{ gap: 9 }}>
                      <UnitPortrait src={u.portrait} name={u.name} size={30} />
                      <b>{u.name || "Unnamed"}</b>
                    </span>
                  </td>
                  {LEARNSET_RANKS.map((r) => {
                    const ids = learned(u, activeProf, r);
                    return (
                      <td key={r}>
                        {ids.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className="learnset-cell">
                            {ids.map((id) => {
                              const s = byId.get(id);
                              return <span className="tag" key={id} title={s ? spellTip(s) : undefined}>{s?.name ?? "?"}</span>;
                            })}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spells.length > 0 && <SpellReference spells={spells} label={profLabel(activeProf)} />}
    </div>
  );
}

function SpellReference({ spells, label }: { spells: Spell[]; label: string }) {
  return (
    <div style={{ marginTop: 22 }}>
      <h3 className="section-title">{label} spell details</h3>
      <div className="mount-table-scroll">
        <table className="mount-table">
          <thead>
            <tr>
              <th>Spell</th><th>Mt</th><th>Hit</th><th>Rng</th><th>Wt</th><th>Crit</th><th>Avo</th><th>Uses</th><th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {spells.map((s) => (
              <tr key={s.id}>
                <td className="mount-name-cell">{s.name}</td>
                <td>{num(s.power)}</td>
                <td>{num(s.hit)}</td>
                <td>{s.range || "—"}</td>
                <td>{num(s.weight)}</td>
                <td>{num(s.crit)}</td>
                <td>{num(s.avo)}</td>
                <td>{num(s.uses)}</td>
                <td className="mount-loc">{s.effect || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
