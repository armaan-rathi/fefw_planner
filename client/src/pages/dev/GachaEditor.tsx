import { useMemo, useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { ImageDrop } from "../../components/ImageDrop";
import { Stars } from "../../components/GachaCardView";
import { cardArt, cardName } from "../../data/gacha";
import { RARITIES, DEFAULT_RATES } from "../../types";
import type { Banner, CardSubjectKind, DB, GachaCard, Rarity } from "../../types";

function ensureGacha(d: DB) {
  d.gacha ??= { enabled: false, cards: [], banners: [] };
  d.gacha.cards ??= [];
  d.gacha.banners ??= [];
  return d.gacha;
}

const KIND_LABEL: Record<CardSubjectKind, string> = { unit: "Units", god: "Gods", npc: "NPCs" };

export function GachaEditor() {
  const { db, update } = useDB();
  const [tab, setTab] = useState<"cards" | "banners">("cards");
  const gacha = db.gacha;

  function setEnabled(v: boolean) { update((d) => { ensureGacha(d).enabled = v; }); }

  return (
    <div className="stack">
      <div className="ornate card">
        <label className="dev-toggle">
          <input type="checkbox" checked={!!gacha?.enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>Show the <b>Gacha</b> tab to everyone (off = only visible while Editor is on)</span>
        </label>
      </div>

      <div className="dev-subnav" style={{ marginBottom: 0 }}>
        <button className={"as-link" + (tab === "cards" ? " active" : "")} onClick={() => setTab("cards")}>Cards</button>
        <button className={"as-link" + (tab === "banners" ? " active" : "")} onClick={() => setTab("banners")}>Banners</button>
      </div>

      {tab === "cards" ? <CardsEditor /> : <BannersEditor />}
    </div>
  );
}

// ---- Cards ------------------------------------------------------------------
function CardsEditor() {
  const { db, update } = useDB();
  const [query, setQuery] = useState("");
  const cards = db.gacha?.cards ?? [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return cards;
    return cards.filter((c) => (cardName(db, c) + " " + (c.title ?? "")).toLowerCase().includes(q));
  }, [db, cards, query]);

  function patch(id: string, p: Partial<GachaCard>) {
    update((d) => { const c = ensureGacha(d).cards.find((x) => x.id === id); if (c) Object.assign(c, p); });
  }
  function addCard() {
    update((d) => {
      const g = ensureGacha(d);
      g.cards.push({ id: uid("card_"), subjectKind: "unit", subjectId: d.units[0]?.id ?? "", rarity: "common" });
    });
  }
  function remove(id: string) {
    update((d) => {
      const g = ensureGacha(d);
      g.cards = g.cards.filter((c) => c.id !== id);
      for (const b of g.banners) b.cardIds = b.cardIds.filter((cid) => cid !== id);
    });
  }
  const subjectsOf = (kind: CardSubjectKind) => (kind === "god" ? db.gods : kind === "npc" ? db.npcs : db.units) ?? [];

  return (
    <div className="stack">
      <div className="ornate card">
        <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
          <input type="text" placeholder="Search cards…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 260 }} />
          <button className="btn primary" onClick={addCard}>+ New Card</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
          Card art follows the unit/god/npc portrait automatically — upload override art only if you want something unique.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint">{cards.length === 0 ? "No cards yet." : "No cards match your search."}</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {filtered.map((c) => {
            const art = cardArt(db, c);
            return (
              <div className="ornate card gcard-row" key={c.id}>
                <div className={"gcard-row-thumb r-" + c.rarity} style={{ ["--rc" as any]: RARITIES.find((r) => r.id === c.rarity)?.color }}>
                  {art ? <img src={art} alt="" /> : <span>{(cardName(db, c)[0] || "?").toUpperCase()}</span>}
                </div>
                <div className="grow" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  <label className="field" style={{ margin: 0 }}><span>Type</span>
                    <select value={c.subjectKind} onChange={(e) => {
                      const kind = e.target.value as CardSubjectKind;
                      patch(c.id, { subjectKind: kind, subjectId: subjectsOf(kind)[0]?.id ?? "" });
                    }}>
                      {(["unit", "god", "npc"] as CardSubjectKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Character</span>
                    <select value={c.subjectId} onChange={(e) => patch(c.id, { subjectId: e.target.value })}>
                      {subjectsOf(c.subjectKind).map((s) => <option key={s.id} value={s.id}>{s.name || "Unnamed"}</option>)}
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Rarity</span>
                    <select value={c.rarity} onChange={(e) => patch(c.id, { rarity: e.target.value as Rarity })}>
                      {RARITIES.map((r) => <option key={r.id} value={r.id}>{r.label} ({"★".repeat(r.stars)})</option>)}
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Class (optional)</span>
                    <select value={c.classId ?? ""} onChange={(e) => patch(c.id, { classId: e.target.value || null })}>
                      <option value="">— None —</option>
                      {db.classes.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                    </select>
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Title (optional)</span>
                    <input type="text" value={c.title ?? ""} onChange={(e) => patch(c.id, { title: e.target.value || undefined })} />
                  </label>
                </div>
                <div style={{ width: 70 }}>
                  <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>Override art</div>
                  <ImageDrop value={c.art ?? null} onChange={(url) => patch(c.id, { art: url })} height={54} label="Art" />
                </div>
                <button className="btn tiny danger" onClick={() => remove(c.id)}>Delete</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Banners ----------------------------------------------------------------
function BannersEditor() {
  const { db, update } = useDB();
  const banners = db.gacha?.banners ?? [];
  const cards = db.gacha?.cards ?? [];

  function addBanner() {
    update((d) => { ensureGacha(d).banners.push({ id: uid("banner_"), name: "New Banner", cardIds: [], rates: { ...DEFAULT_RATES } }); });
  }
  function patch(id: string, p: Partial<Banner>) {
    update((d) => { const b = ensureGacha(d).banners.find((x) => x.id === id); if (b) Object.assign(b, p); });
  }
  function setRate(id: string, r: Rarity, val: number) {
    update((d) => { const b = ensureGacha(d).banners.find((x) => x.id === id); if (b) b.rates = { ...b.rates, [r]: val }; });
  }
  function remove(id: string) {
    if (!confirm("Delete this banner?")) return;
    update((d) => { const g = ensureGacha(d); g.banners = g.banners.filter((b) => b.id !== id); });
  }
  function setCards(id: string, ids: string[]) { patch(id, { cardIds: ids }); }

  if (cards.length === 0) {
    return <div className="empty-hint">Add some cards first (Cards tab), then build a banner from them.</div>;
  }

  return (
    <div className="stack">
      <div className="spread">
        <span className="muted" style={{ fontSize: 12.5 }}>{banners.length} banner{banners.length === 1 ? "" : "s"}</span>
        <button className="btn primary" onClick={addBanner}>+ New Banner</button>
      </div>
      {banners.length === 0 && <div className="empty-hint">No banners yet.</div>}
      {banners.map((b) => (
        <BannerCard key={b.id} banner={b} db={db} onName={(name) => patch(b.id, { name })} onImage={(image) => patch(b.id, { image })} onRate={(r, v) => setRate(b.id, r, v)} onCards={(ids) => setCards(b.id, ids)} onRemove={() => remove(b.id)} />
      ))}
    </div>
  );
}

function BannerCard({ banner, db, onName, onImage, onRate, onCards, onRemove }: {
  banner: Banner; db: DB;
  onName: (n: string) => void; onImage: (url: string | null) => void; onRate: (r: Rarity, v: number) => void; onCards: (ids: string[]) => void; onRemove: () => void;
}) {
  const [incGods, setIncGods] = useState(false);
  const [incNpcs, setIncNpcs] = useState(false);
  const cards = db.gacha?.cards ?? [];
  const selectable = cards.filter((c) => c.subjectKind === "unit" || (incGods && c.subjectKind === "god") || (incNpcs && c.subjectKind === "npc"));
  const selected = new Set(banner.cardIds);
  const rateTotal = RARITIES.reduce((s, r) => s + (banner.rates[r.id] ?? 0), 0);

  const toggle = (id: string) => onCards(selected.has(id) ? banner.cardIds.filter((x) => x !== id) : [...banner.cardIds, id]);
  const addAll = () => onCards(Array.from(new Set([...banner.cardIds, ...selectable.map((c) => c.id)])));
  const clear = () => onCards([]);

  return (
    <div className="ornate card">
      <div className="spread" style={{ marginBottom: 12 }}>
        <input type="text" value={banner.name} onChange={(e) => onName(e.target.value)} style={{ maxWidth: 320, fontWeight: 600 }} />
        <button className="btn tiny danger" onClick={onRemove}>Delete</button>
      </div>

      <div className="field" style={{ maxWidth: 360 }}>
        <span>Banner art</span>
        <ImageDrop value={banner.image ?? null} onChange={onImage} height={110} />
      </div>

      <div className="two-col">
        <div>
          <h4 className="section-title" style={{ marginTop: 0 }}>Rates {rateTotal !== 100 && <span className="muted" style={{ fontSize: 11 }}>(sum {rateTotal}% — normalized when rolling)</span>}</h4>
          <table className="rate-table">
            <tbody>
              {RARITIES.map((r) => (
                <tr key={r.id}>
                  <td><span style={{ color: r.color, fontWeight: 600 }}>{r.label}</span> <span className="muted">{"★".repeat(r.stars)}</span></td>
                  <td style={{ width: 110 }}>
                    <input type="number" min={0} step={0.1} value={banner.rates[r.id] ?? 0} onChange={(e) => onRate(r.id, Math.max(0, Number(e.target.value) || 0))} /> %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="spread" style={{ marginBottom: 6 }}>
            <h4 className="section-title" style={{ margin: 0 }}>Cards ({banner.cardIds.length})</h4>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn tiny" onClick={addAll}>Add All</button>
              <button className="btn tiny ghost" onClick={clear}>Clear</button>
            </div>
          </div>
          <div className="row" style={{ gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <label className="dev-toggle"><input type="checkbox" checked={incGods} onChange={(e) => setIncGods(e.target.checked)} /><span>Include Gods</span></label>
            <label className="dev-toggle"><input type="checkbox" checked={incNpcs} onChange={(e) => setIncNpcs(e.target.checked)} /><span>Include NPCs</span></label>
          </div>
          <div className="gacha-pick-list">
            {selectable.map((c) => {
              const on = selected.has(c.id);
              const art = cardArt(db, c);
              return (
                <button key={c.id} className={"gacha-pick" + (on ? " on" : "")} onClick={() => toggle(c.id)}>
                  <span className="gacha-pick-thumb">{art ? <img src={art} alt="" /> : (cardName(db, c)[0] || "?")}</span>
                  <span className="grow" style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontSize: 12.5 }}>{cardName(db, c)}</span>
                    <Stars rarity={c.rarity} />
                  </span>
                  <span className="gacha-pick-check">{on ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
