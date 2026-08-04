import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { Modal } from "../components/Modal";
import { CastTabs } from "../components/CastTabs";
import { CharAttr } from "../components/CharAttr";
import { availableAttrs, charPageConfig } from "../data/characterAttrs";
import { unitFaction } from "../data/units";
import type { Unit } from "../types";

function Portrait({ unit, className }: { unit: Unit; className?: string }) {
  const initial = (unit.name.trim()[0] || "?").toUpperCase();
  return (
    <div className={"char-portrait " + (className || "")}>
      {unit.portrait ? <img src={unit.portrait} alt={unit.name} /> : <span className="char-initial">{initial}</span>}
    </div>
  );
}

export function CharacterList() {
  const { db } = useDB();
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const cfg = charPageConfig(db);
  const attrs = availableAttrs(db);
  const previewAttrs = cfg.preview.filter((id) => attrs.some((a) => a.id === id));
  const detailAttrs = cfg.detail.filter((id) => attrs.some((a) => a.id === id));

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return db.units;
    return db.units.filter((u) => (u.name + " " + unitFaction(u)).toLowerCase().includes(q));
  }, [db.units, query]);

  const openUnit = openId ? db.units.find((u) => u.id === openId) : null;

  return (
    <div>
      <CastTabs />
      <div className="page-head">
        <div>
          <h2>Character Database</h2>
          <p>Browse the playable cast. Click a character to see full details.</p>
        </div>
        <input
          type="text"
          placeholder="Search characters…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint">{db.units.length === 0 ? "No characters yet." : "No characters match your search."}</div>
      ) : (
        <div className="char-grid">
          {filtered.map((u) => (
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
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
