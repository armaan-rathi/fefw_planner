import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { SkillMark } from "../components/icons";
import { filterSpoilerUnits, useSpoilers } from "../data/spoilers";

type Mode = "boon" | "bane";

export function Proficiencies() {
  const { db } = useDB();
  const [allowSpoilers] = useSpoilers();
  const skills = db.skillTypes;
  const units = useMemo(() => filterSpoilerUnits(db.units.filter((u) => (u.boons?.length ?? 0) > 0 || (u.banes?.length ?? 0) > 0), allowSpoilers), [db.units, allowSpoilers]);
  const [filters, setFilters] = useState<Record<string, Mode>>({});

  function toggle(skillId: string, mode: Mode) {
    setFilters((f) => {
      const next = { ...f };
      if (next[skillId] === mode) delete next[skillId];
      else next[skillId] = mode;
      return next;
    });
  }

  const active = Object.entries(filters);
  const rows = units.filter((u) =>
    active.every(([sid, mode]) => (mode === "boon" ? u.boons?.includes(sid) : u.banes?.includes(sid))),
  );

  // Fixed name-column width from the longest name so it doesn't jump when filtering.
  const nameW = useMemo(() => Math.ceil(Math.max(4, ...units.map((u) => (u.name || "Unnamed").length)) * 9) + 26, [units]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Proficiencies</h2>
          <p>Boons (<span style={{ color: "var(--boon)" }}>▲</span>) and banes (<span style={{ color: "var(--bane)" }}>▼</span>) for every character. Use the ▲/▼ in each header to filter.</p>
        </div>
        {active.length > 0 && <button className="btn ghost" onClick={() => setFilters({})}>Clear filters ({active.length})</button>}
      </div>

      <div className="prof-scroll">
        <table className="prof-table" style={{ ["--prof-name-w" as string]: nameW + "px" }}>
          <thead>
            <tr>
              <th className="prof-unit-h">Unit <span className="muted">({rows.length})</span></th>
              {skills.map((st) => (
                <th key={st.id}>
                  <div className="prof-head">
                    <span className="prof-head-icon" title={st.label}><SkillMark type={st} size={22} /></span>
                    <span className="prof-head-filters">
                      <button
                        className={"prof-fbtn boon" + (filters[st.id] === "boon" ? " on" : "")}
                        title={`Filter: boon in ${st.label}`}
                        onClick={() => toggle(st.id, "boon")}
                      >▲</button>
                      <button
                        className={"prof-fbtn bane" + (filters[st.id] === "bane" ? " on" : "")}
                        title={`Filter: bane in ${st.label}`}
                        onClick={() => toggle(st.id, "bane")}
                      >▼</button>
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="prof-unit">{u.name || "Unnamed"}</td>
                {skills.map((st) => {
                  const boon = u.boons?.includes(st.id);
                  const bane = u.banes?.includes(st.id);
                  return (
                    <td key={st.id} className={"prof-c" + (boon ? " boon" : bane ? " bane" : "")}>
                      {boon ? "▲" : bane ? "▼" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={skills.length + 1}><span className="muted">No characters match those filters.</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
