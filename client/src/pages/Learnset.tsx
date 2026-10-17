import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { UnitPortrait } from "../components/UnitPortrait";
import { SkillMark } from "../components/icons";
import { combatArtsFor, learned, learnsetProficiencies, skillsForProf, spellsFor } from "../data/magic";
import { filterSpoilerUnits, useSpoilers } from "../data/spoilers";
import { LEARNSET_RANKS } from "../types";
import type { CombatArt, Skill, Spell } from "../types";

const num = (n: number | null) => (n === null || n === undefined ? "—" : String(n));
const sgn = (n: number | null) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n}`);

function spellTip(s: Spell): string {
  const parts = [`Mt ${num(s.power)}`, `Hit ${num(s.hit)}`, `Rng ${s.range || "—"}`, `Wt ${num(s.weight)}`, s.crit ? `Crit ${s.crit}` : "", s.uses !== null ? `Uses ${s.uses}` : ""].filter(Boolean);
  return s.effect ? `${parts.join(" · ")}\n${s.effect}` : parts.join(" · ");
}
function artTip(a: CombatArt): string {
  const parts = [`Cost ${num(a.cost)}`, `Mt ${sgn(a.might)}`, `Hit ${sgn(a.hit)}`, a.crit ? `Crit ${sgn(a.crit)}` : "", `Rng ${a.range || "—"}`].filter(Boolean);
  return a.effect ? `${parts.join(" · ")}\n${a.effect}` : parts.join(" · ");
}

export function Learnset() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();

  const profs = useMemo(() => learnsetProficiencies(db), [db]);
  const [prof, setProf] = useState<string>(profs[0] ?? "reason");
  const activeProf = profs.includes(prof) ? prof : profs[0] ?? "reason";
  const profLabel = (id: string) => db.skillTypes.find((s) => s.id === id)?.label ?? id;

  const spells = useMemo(() => spellsFor(db, activeProf), [db, activeProf]);
  const arts = useMemo(() => combatArtsFor(db, activeProf), [db, activeProf]);
  const catSkills = useMemo(() => skillsForProf(db, activeProf), [db, activeProf]);
  // Combined id → display name + tooltip across catalogs. Skills expand into
  // base / "+" / "++" keys (id, id+"+", id+"++").
  const byId = useMemo(() => {
    const m = new Map<string, { name: string; tip: string }>();
    for (const s of db.spells ?? []) m.set(s.id, { name: s.name, tip: spellTip(s) });
    for (const a of db.combatArts ?? []) m.set(a.id, { name: a.name, tip: artTip(a) });
    for (const s of db.skills ?? []) {
      m.set(s.id, { name: s.name, tip: s.description });
      if (s.plus) m.set(s.id + "+", { name: s.plus.name, tip: s.plus.description });
      if (s.plusPlus) m.set(s.id + "++", { name: s.plusPlus.name, tip: s.plusPlus.description });
    }
    return m;
  }, [db.spells, db.combatArts, db.skills]);

  const units = useMemo(() => {
    const list = db.units.filter((u) => {
      const ls = u.learnsets?.[activeProf];
      return ls && Object.values(ls).some((ids) => ids.length > 0);
    });
    return filterSpoilerUnits(list, allowSpoilers);
  }, [db.units, activeProf, allowSpoilers]);

  // Only show rank columns that are actually used in this proficiency.
  const ranks = useMemo(
    () => LEARNSET_RANKS.filter((r) => units.some((u) => learned(u, activeProf, r).length > 0)),
    [units, activeProf],
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Learnsets</h2>
          <p>Spells and combat arts each unit learns, by proficiency rank.</p>
        </div>
      </div>

      <div className="learnset-disclaimer">
        <p style={{ margin: 0 }}>Disclaimer: This list is not complete.</p>
        <p style={{ margin: "2px 0 0" }}>Credit to the <i>Fortune's Weave Learnsets and Info Community Collection Sheet</i></p>
      </div>

      {profs.length > 1 && (
        <div className="cast-tabs learnset-tabs">
          {profs.map((p) => {
            const st = db.skillTypes.find((s) => s.id === p);
            return (
              <button key={p} className={p === activeProf ? "active" : ""} onClick={() => setProf(p)} title={profLabel(p)} aria-label={profLabel(p)}>
                {st ? <SkillMark type={st} size={22} /> : profLabel(p)}
              </button>
            );
          })}
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
                {ranks.map((r) => <th key={r}>{r}</th>)}
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
                  {ranks.map((r) => {
                    const ids = learned(u, activeProf, r);
                    return (
                      <td key={r}>
                        {ids.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className="learnset-cell">
                            {ids.map((id) => {
                              const e = byId.get(id);
                              return <span className="tag" key={id} title={e?.tip}>{e?.name ?? "?"}</span>;
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
      {arts.length > 0 && <CombatArtReference arts={arts} label={profLabel(activeProf)} />}
      {/* Only show the skill-details table once descriptions exist for this proficiency. */}
      {catSkills.some((s) => s.description || s.plus?.description || s.plusPlus?.description) && (
        <SkillReference skills={catSkills} label={profLabel(activeProf)} />
      )}
    </div>
  );
}

function SkillReference({ skills, label }: { skills: Skill[]; label: string }) {
  return (
    <div style={{ marginTop: 22 }}>
      <h3 className="section-title">{label} skill details</h3>
      <div className="mount-table-scroll">
        <table className="mount-table">
          <thead>
            <tr><th>Skill</th><th>Description</th><th>+</th><th>++</th></tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.id}>
                <td className="mount-name-cell">{s.name}</td>
                <td className="mount-loc">{s.description || "—"}</td>
                <td className="mount-loc">{s.plus ? `${s.plus.name}${s.plus.description ? ` — ${s.plus.description}` : ""}` : "—"}</td>
                <td className="mount-loc">{s.plusPlus ? `${s.plusPlus.name}${s.plusPlus.description ? ` — ${s.plusPlus.description}` : ""}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            <tr><th>Spell</th><th>Mt</th><th>Hit</th><th>Rng</th><th>Wt</th><th>Crit</th><th>Avo</th><th>Uses</th><th>Effect</th></tr>
          </thead>
          <tbody>
            {spells.map((s) => (
              <tr key={s.id}>
                <td className="mount-name-cell">{s.name}</td>
                <td>{num(s.power)}</td><td>{num(s.hit)}</td><td>{s.range || "—"}</td><td>{num(s.weight)}</td>
                <td>{num(s.crit)}</td><td>{num(s.avo)}</td><td>{num(s.uses)}</td>
                <td className="mount-loc">{s.effect || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CombatArtReference({ arts, label }: { arts: CombatArt[]; label: string }) {
  return (
    <div style={{ marginTop: 22 }}>
      <h3 className="section-title">{label} combat art details</h3>
      <div className="mount-table-scroll">
        <table className="mount-table">
          <thead>
            <tr><th>Combat Art</th><th>Cost</th><th>Might</th><th>Hit</th><th>Crit</th><th>Rng</th><th>Effect</th></tr>
          </thead>
          <tbody>
            {arts.map((a) => (
              <tr key={a.id}>
                <td className="mount-name-cell">{a.name}</td>
                <td>{num(a.cost)}</td><td>{sgn(a.might)}</td><td>{sgn(a.hit)}</td><td>{sgn(a.crit)}</td><td>{a.range || "—"}</td>
                <td className="mount-loc">{a.effect || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
