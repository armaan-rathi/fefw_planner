import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Modal } from "../components/Modal";
import { CastTabs } from "../components/CastTabs";
import { CharAttr } from "../components/CharAttr";
import { availableAttrs, charPageConfig } from "../data/characterAttrs";
import { unitFaction } from "../data/units";
import type { DB, Unit } from "../types";

type SortMode = "default" | "faction";

const isNum = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

// Recruitment conditions per lord (route order), showing only the lords and
// requirements that have been filled in. Renders nothing if all are empty.
function RecruitmentSection({ unit, routes }: { unit: Unit; routes: DB["routes"] }) {
  const rec = unit.recruitment ?? {};
  const lines = routes
    .map((r) => ({ route: r, cond: rec[r.id] }))
    .filter(({ cond }) => cond && (isNum(cond.support) || isNum(cond.renown) || !!cond.negotiation || !!cond.extra));
  if (lines.length === 0) return null;
  return (
    <div className="char-attr block">
      <div className="k">Recruitment Conditions</div>
      <div className="recruit-list">
        {lines.map(({ route, cond }) => (
          <div className="recruit-line" key={route.id}>
            <span className="recruit-lord">{route.name || "Lord"}</span>
            <span className="chip-wrap" style={{ display: "inline-flex" }}>
              {isNum(cond!.support) && <span className="tag">Support Lv. {cond!.support}</span>}
              {isNum(cond!.renown) && <span className="tag">Renown Lv. {cond!.renown}</span>}
              {cond!.negotiation && <span className="tag">Negotiation: {cond!.negotiation}</span>}
            </span>
            {cond!.extra && (
              <span className="recruit-extra"><b>Miscellaneous:</b> {cond!.extra}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Portrait({ unit, className }: { unit: Unit; className?: string }) {
  const initial = (unit.name.trim()[0] || "?").toUpperCase();
  return (
    <div className={"char-portrait " + (className || "")}>
      {unit.portrait ? <img src={unit.portrait} alt={unit.name} /> : <span className="char-initial">{initial}</span>}
      {unit.possiblyEnemyOnly && <span className="char-q" title="Possibly enemy-only">?</span>}
    </div>
  );
}

export function CharacterList() {
  const { db } = useDB();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useLocalStorage<SortMode>("fw.charSort", "default");

  const cfg = charPageConfig(db);
  const attrs = availableAttrs(db);
  const previewAttrs = cfg.preview.filter((id) => attrs.some((a) => a.id === id));
  const detailAttrs = cfg.detail.filter((id) => attrs.some((a) => a.id === id));

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return db.units;
    return db.units.filter((u) => (u.name + " " + unitFaction(u)).toLowerCase().includes(q));
  }, [db.units, query]);

  // Faction order = the faction field's option order (dev-configurable). Units
  // are grouped by faction in that order; unaffiliated units go last. Order
  // within a faction follows my default (dev-mode) unit ordering.
  const factionOrder = useMemo(() => db.fieldDefs.find((f) => f.key === "faction")?.options ?? [], [db.fieldDefs]);

  const shown = useMemo(() => {
    if (sort !== "faction") return filtered;
    const affiliated = filtered.filter((u) => unitFaction(u));
    const unaffiliated = filtered.filter((u) => !unitFaction(u));
    // Configured factions first, then any others by first appearance.
    const names: string[] = [];
    const seen = new Set<string>();
    for (const n of factionOrder) if (!seen.has(n) && affiliated.some((u) => unitFaction(u) === n)) { names.push(n); seen.add(n); }
    for (const u of affiliated) { const n = unitFaction(u); if (!seen.has(n)) { names.push(n); seen.add(n); } }
    const out: Unit[] = [];
    for (const n of names) for (const u of affiliated) if (unitFaction(u) === n) out.push(u);
    return [...out, ...unaffiliated];
  }, [filtered, sort, factionOrder]);

  const openUnit = openId ? db.units.find((u) => u.id === openId) : null;

  return (
    <div>
      <CastTabs />
      <div className="page-head">
        <div>
          <h2>Character Database</h2>
          <p>Browse the playable cast. Click a character to see full details.</p>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label className="field" style={{ margin: 0 }}>
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
              <option value="default">Default</option>
              <option value="faction">By Faction</option>
            </select>
          </label>
          <input
            type="text"
            placeholder="Search characters…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty-hint">{db.units.length === 0 ? "No characters yet." : "No characters match your search."}</div>
      ) : (
        <div className="char-grid">
          {shown.map((u) => (
            <button key={u.id} className="ornate char-card" onClick={() => setOpenId(u.id)}>
              <Portrait unit={u} />
              <div className="char-card-body">
                <div className="char-name">
                  {u.name || "Unnamed"}
                </div>
                {previewAttrs.map((id) => (
                  <CharAttr key={id} id={id} unit={u} compact />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {openUnit && (
        <Modal open wide title={openUnit.name || "Character"} onClose={() => setOpenId(null)}>
          <div className="char-detail">
            <div className="char-detail-head">
              <Portrait unit={openUnit} className="large" />
              <div>
                <h2 className="char-detail-name">
                  {openUnit.name || "Unnamed"}
                </h2>
                {unitFaction(openUnit) && <div className="muted">{unitFaction(openUnit)}</div>}
              </div>
            </div>
            <div className="char-detail-attrs">
              {detailAttrs.map((id) => (
                <CharAttr key={id} id={id} unit={openUnit} />
              ))}
              {detailAttrs.length === 0 && (
                <p className="muted">No detail fields configured. Choose them in Dev Mode → Characters.</p>
              )}
              <RecruitmentSection unit={openUnit} routes={db.routes} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
