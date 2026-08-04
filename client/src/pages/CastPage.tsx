import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { Modal } from "../components/Modal";
import { CastTabs } from "../components/CastTabs";
import type { CastKind, CastMember } from "../types";

function Portrait({ member, className }: { member: CastMember; className?: string }) {
  const initial = (member.name.trim()[0] || "?").toUpperCase();
  return (
    <div className={"char-portrait " + (className || "")}>
      {member.portrait ? <img src={member.portrait} alt={member.name} /> : <span className="char-initial">{initial}</span>}
    </div>
  );
}

// Listing page for a non-playable cast type (Gods, Important NPCs). These are
// kept entirely separate from db.units — they never appear as playable units.
export function CastPage({ kind, title, blurb }: { kind: CastKind; title: string; blurb: string }) {
  const { db } = useDB();
  const list = db[kind] ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return list;
    return list.filter((m) => (m.name + " " + m.subtitle).toLowerCase().includes(q));
  }, [list, query]);

  const open = openId ? list.find((m) => m.id === openId) : null;

  return (
    <div>
      <CastTabs />
      <div className="page-head">
        <div>
          <h2>{title}</h2>
          <p>{blurb}</p>
        </div>
        <input type="text" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint">
          {list.length === 0 ? `No ${title.toLowerCase()} yet. Add them in Dev Mode.` : "No matches."}
        </div>
      ) : (
        <div className="char-grid">
          {filtered.map((m) => (
            <button key={m.id} className="ornate char-card" onClick={() => setOpenId(m.id)}>
              <Portrait member={m} />
              <div className="char-card-body">
                <div className="char-name">{m.name || "Unnamed"}</div>
                {m.subtitle && <div className="muted" style={{ fontSize: 13 }}>{m.subtitle}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal open wide title={open.name || title} onClose={() => setOpenId(null)}>
          <div className="char-detail">
            <div className="char-detail-head">
              <Portrait member={open} className="large" />
              <div>
                <h2 className="char-detail-name">{open.name || "Unnamed"}</h2>
                {open.subtitle && <div className="muted">{open.subtitle}</div>}
              </div>
            </div>
            <div className="char-detail-attrs">
              {kind === "gods" ? (
                <>
                  {open.crest && (
                    <div className="cast-detail-block">
                      <div className="cast-detail-label">Crest</div>
                      <p style={{ margin: 0 }}>{open.crest}</p>
                    </div>
                  )}
                  {[0, 1, 2].map((i) =>
                    open.blessings?.[i] ? (
                      <div className="cast-detail-block" key={i}>
                        <div className="cast-detail-label">Blessing Lv. {i + 1}</div>
                        <p style={{ margin: 0 }}>{open.blessings[i]}</p>
                      </div>
                    ) : null
                  )}
                </>
              ) : (
                open.description && <p className="char-longtext">{open.description}</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
