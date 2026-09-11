import { RARITIES, DEFAULT_RATES } from "../types";
import type { Banner, CardDisplay, DB, GachaCard, Rarity, RarityDef } from "../types";

// The rarities in play — all five normally, or just 3–5★ in FEH mode.
export function activeRarities(db: DB): RarityDef[] {
  return db.gacha?.fehMode ? RARITIES.filter((r) => r.stars >= 3) : RARITIES;
}

// Which card elements to show — stars are off by default; the rest on.
export function cardDisplay(db: DB): Required<CardDisplay> {
  const d = db.gacha?.cardDisplay ?? {};
  return { stars: d.stars ?? false, name: d.name ?? true, title: d.title ?? true, class: d.class ?? true };
}

type Subject = { name: string; portrait: string | null };

// The unit / god / npc a card depicts.
export function cardSubject(db: DB, card: GachaCard): Subject | null {
  const list = card.subjectKind === "god" ? db.gods : card.subjectKind === "npc" ? db.npcs : db.units;
  const e = (list ?? []).find((x) => x.id === card.subjectId);
  return e ? { name: e.name, portrait: e.portrait } : null;
}

export function cardName(db: DB, card: GachaCard): string {
  return cardSubject(db, card)?.name || "Unknown";
}

// Card art = uploaded override, else the subject's LIVE portrait (kept linked, so
// updating the unit's portrait updates the card automatically).
export function cardArt(db: DB, card: GachaCard): string | null {
  return card.art || cardSubject(db, card)?.portrait || null;
}

export function cardClass(db: DB, card: GachaCard): string | null {
  if (!card.classId) return null;
  return db.classes.find((c) => c.id === card.classId)?.name || null;
}

export const allCards = (db: DB): GachaCard[] => db.gacha?.cards ?? [];
export const allBanners = (db: DB): Banner[] => db.gacha?.banners ?? [];

export function bannerCards(db: DB, banner: Banner): GachaCard[] {
  const byId = new Map(allCards(db).map((c) => [c.id, c]));
  return banner.cardIds.map((id) => byId.get(id)).filter((c): c is GachaCard => !!c);
}

// Weighted pick of a rarity among those that actually have cards in the banner.
function pickRarity(rates: Record<Rarity, number>, available: Rarity[]): Rarity {
  const weights = available.map((r) => Math.max(0, rates?.[r] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return available[Math.floor(Math.random() * available.length)];
  let roll = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll < 0) return available[i];
  }
  return available[available.length - 1];
}

// Roll `count` cards from a banner (independent draws; ephemeral — nothing stored).
export function rollPull(db: DB, banner: Banner, count: number): GachaCard[] {
  const cards = bannerCards(db, banner);
  const byRarity: Partial<Record<Rarity, GachaCard[]>> = {};
  for (const c of cards) (byRarity[c.rarity] ??= []).push(c);
  // Only rarities allowed by the mode (FEH mode blocks 1–2★) that have cards.
  const allowed = new Set(activeRarities(db).map((r) => r.id));
  const available = RARITIES.map((r) => r.id).filter((r) => allowed.has(r) && byRarity[r]?.length);
  const out: GachaCard[] = [];
  if (available.length === 0) return out;
  for (let i = 0; i < count; i++) {
    const rarity = pickRarity(banner.rates ?? DEFAULT_RATES, available);
    const pool = byRarity[rarity]!;
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return out;
}
