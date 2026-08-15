import { useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { UnitPortrait } from "../components/UnitPortrait";
import { uid } from "../api";

type Tier = { id: string; label: string };
type TierListData = { tiers: Tier[]; placements: Record<string, string[]> }; // tierId -> item ids
type RankItem = { id: string; name: string; portrait: string | null; question?: boolean };

const DEFAULT_TIERS: Tier[] = ["S", "A", "B", "C", "D"].map((l) => ({ id: "t_" + l.toLowerCase(), label: l }));
const DEFAULT_DATA: TierListData = { tiers: DEFAULT_TIERS, placements: {} };
const TIER_COLORS = ["#e0555f", "#e0894b", "#d8b64a", "#9ac06a", "#5cb0a6", "#5f8ad8", "#9b6fd0", "#c76fb0"];

export function TierList() {
  const { db } = useDB();
  const [data, setData] = useLocalStorage<TierListData>("fw.tierList", DEFAULT_DATA);
  const [includeGods, setIncludeGods] = useLocalStorage<boolean>("fw.tierIncludeGods", false);
  const [includeNpcs, setIncludeNpcs] = useLocalStorage<boolean>("fw.tierIncludeNpcs", false);
  const { tiers, placements } = data;
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ unitId: string; rect: DOMRect } | null>(null);

  // Rankable items: units, plus Gods / Important NPCs when toggled on.
  const items = useMemo<RankItem[]>(() => {
    const list: RankItem[] = db.units.map((u) => ({ id: u.id, name: u.name, portrait: u.portrait, question: u.possiblyEnemyOnly }));
    if (includeGods) for (const g of db.gods ?? []) list.push({ id: g.id, name: g.name, portrait: g.portrait });
    if (includeNpcs) for (const n of db.npcs ?? []) list.push({ id: n.id, name: n.name, portrait: n.portrait });
    return list;
  }, [db.units, db.gods, db.npcs, includeGods, includeNpcs]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const { tierUnits, pool, placedSet } = useMemo(() => {
    const placed = new Set<string>();
    const tierUnits: Record<string, RankItem[]> = {};
    for (const t of tiers) {
      const list: RankItem[] = [];
      for (const id of placements[t.id] ?? []) {
        if (placed.has(id) || !byId.has(id)) continue;
        list.push(byId.get(id)!);
        placed.add(id);
      }
      tierUnits[t.id] = list;
    }
    const pool = items.filter((u) => !placed.has(u.id));
    return { tierUnits, pool, placedSet: placed };
  }, [tiers, placements, items, byId]);

  // ---- mutations ----
  function place(unitId: string, tierId: string, beforeId?: string) {
    setData((prev) => {
      const next: Record<string, string[]> = {};
      for (const t of prev.tiers) next[t.id] = (prev.placements[t.id] ?? []).filter((id) => id !== unitId);
      const arr = next[tierId] ?? [];
      const idx = beforeId ? arr.indexOf(beforeId) : -1;
      if (idx >= 0) arr.splice(idx, 0, unitId);
      else arr.push(unitId);
      next[tierId] = arr;
      return { ...prev, placements: next };
    });
  }
  function unassign(unitId: string) {
    setData((prev) => {
      const next: Record<string, string[]> = {};
      for (const t of prev.tiers) next[t.id] = (prev.placements[t.id] ?? []).filter((id) => id !== unitId);
      return { ...prev, placements: next };
    });
  }
  function renameTier(id: string, label: string) {
    setData((prev) => ({ ...prev, tiers: prev.tiers.map((t) => (t.id === id ? { ...t, label } : t)) }));
  }
  function addTier() {
    setData((prev) => ({ ...prev, tiers: [...prev.tiers, { id: uid("t_"), label: "New" }] }));
  }
  function removeTier(id: string) {
    if (!window.confirm("Remove this tier? Its units go back to the pool.")) return;
    setData((prev) => {
      const placements = { ...prev.placements };
      delete placements[id];
      return { tiers: prev.tiers.filter((t) => t.id !== id), placements };
    });
  }
  function moveTier(id: string, dir: -1 | 1) {
    setData((prev) => {
      const i = prev.tiers.findIndex((t) => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.tiers.length) return prev;
      const tiers = [...prev.tiers];
      [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
      return { ...prev, tiers };
    });
  }
  function reset() {
    if (window.confirm("Reset the tier list back to empty S–D tiers?")) setData(DEFAULT_DATA);
  }

  // ---- drag (desktop) + tap menu (mobile) ----
  const onDragStart = (id: string) => (e: React.DragEvent) => e.dataTransfer.setData("text/tier-unit", id);
  const dropTo = (handler: (id: string) => void) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/tier-unit");
    if (id) handler(id);
  };
  const over = (target: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget(target); },
    onDragLeave: () => setDropTarget((t) => (t === target ? null : t)),
  });

  const chip = (u: RankItem, tierId?: string) => (
    <div
      key={u.id}
      className="tier-chip"
      draggable
      onDragStart={onDragStart(u.id)}
      onDragOver={tierId ? (e) => e.preventDefault() : undefined}
      onDrop={
        tierId
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropTarget(null);
              const id = e.dataTransfer.getData("text/tier-unit");
              if (id && id !== u.id) place(id, tierId, u.id); // insert before -> reorder / move
            }
          : undefined
      }
      onClick={(e) => setMenu({ unitId: u.id, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
      title={u.name || "Unnamed"}
    >
      <UnitPortrait src={u.portrait} name={u.name} size={46} question={u.question} />
      <span className="tier-chip-name">{u.name || "Unnamed"}</span>
    </div>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Tier List</h2>
          <p>Rank the cast — drag a unit onto a tier (drop onto another unit to slot it in / reorder), or tap a unit and pick a tier. Rename a tier by typing in its label.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className={"btn" + (includeGods ? " primary" : " ghost")}
            onClick={() => setIncludeGods((v) => !v)}
            title="Include Gods in the pool"
          >
            {includeGods ? "✓ Gods" : "Include Gods"}
          </button>
          <button
            className={"btn" + (includeNpcs ? " primary" : " ghost")}
            onClick={() => setIncludeNpcs((v) => !v)}
            title="Include Important NPCs in the pool"
          >
            {includeNpcs ? "✓ NPCs" : "Include NPCs"}
          </button>
          <button className="btn" onClick={addTier}>+ Add tier</button>
          <button className="btn ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Unranked pool */}
      <div className={"tier-pool" + (dropTarget === "pool" ? " drop" : "")} {...over("pool")} onDrop={dropTo(unassign)}>
        {pool.length === 0 ? (
          <span className="muted" style={{ margin: "auto" }}>Everyone's ranked.</span>
        ) : (
          pool.map((u) => chip(u))
        )}
      </div>

      {/* Tiers */}
      <div className="tier-rows">
        {tiers.map((t, i) => (
          <div key={t.id} className={"tier-row" + (dropTarget === t.id ? " drop" : "")} {...over(t.id)} onDrop={dropTo((id) => place(id, t.id))}>
            <div className="tier-label" style={{ background: TIER_COLORS[i % TIER_COLORS.length] }}>
              <input value={t.label} onChange={(e) => renameTier(t.id, e.target.value)} aria-label="Tier name" />
            </div>
            <div className="tier-units">
              {(tierUnits[t.id] ?? []).map((u) => chip(u, t.id))}
            </div>
            <div className="tier-controls">
              <button className="icon-btn" title="Move up" disabled={i === 0} onClick={() => moveTier(t.id, -1)}>▲</button>
              <button className="icon-btn" title="Move down" disabled={i === tiers.length - 1} onClick={() => moveTier(t.id, 1)}>▼</button>
              <button className="icon-btn" title="Remove tier" onClick={() => removeTier(t.id)}>✕</button>
            </div>
          </div>
        ))}
        {tiers.length === 0 && <div className="empty-hint">No tiers. Add one to start ranking.</div>}
      </div>

      {/* Tap menu: pick a tier (mobile-friendly) */}
      {menu && (
        <>
          <div className="split-menu-backdrop" onClick={() => setMenu(null)} />
          <div className="tier-menu" style={{ left: Math.min(menu.rect.left, window.innerWidth - 200), top: menu.rect.bottom + 6 }}>
            {tiers.map((t, i) => (
              <button
                key={t.id}
                className="tier-menu-item"
                style={{ background: TIER_COLORS[i % TIER_COLORS.length] }}
                onClick={() => { place(menu.unitId, t.id); setMenu(null); }}
              >
                {t.label || "—"}
              </button>
            ))}
            {placedSet.has(menu.unitId) && (
              <button className="tier-menu-item pool" onClick={() => { unassign(menu.unitId); setMenu(null); }}>Pool</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
