import { POLL_PALETTE, type DB, type Poll, type PollOption, type PollOptionsSource } from "../types";

export const POLL_SOURCES: { value: PollOptionsSource; label: string }[] = [
  { value: "characters", label: "All characters (Units + Gods + NPCs)" },
  { value: "units", label: "Units" },
  { value: "gods", label: "Gods" },
  { value: "npcs", label: "Important NPCs" },
  { value: "routes", label: "Routes" },
];

export const pollSourceLabel = (s: PollOptionsSource): string =>
  POLL_SOURCES.find((o) => o.value === s)?.label ?? s;

// The colour cycle for a poll's (sourced) options: its own palette, else the
// shared 12-colour default.
export function pollPalette(poll: Poll): string[] {
  return poll.palette && poll.palette.length ? poll.palette : POLL_PALETTE;
}

type EntityLike = { id: string; name: string; portrait: string | null };

// The actual options a poll offers: either its custom list, or a live view of an
// entity list. Sourced options use the entity id as the (stable) value and its
// portrait as the icon, and colours cycle through the palette by position.
export function resolvePollOptions(db: DB, poll: Poll): PollOption[] {
  if (!poll.optionsSource) return poll.options;
  // Options are coloured by cycling the poll's palette in order (defaults to the
  // shared 12, whose first four are the lord colours).
  const palette = pollPalette(poll);
  const out: PollOption[] = [];
  const seen = new Set<string>();
  const push = (list?: EntityLike[]) => {
    for (const e of list ?? []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push({ id: e.id, label: e.name || "Unnamed", color: "", image: e.portrait ?? null });
    }
  };
  const src = poll.optionsSource;
  if (src === "routes") {
    for (const r of db.routes) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ id: r.id, label: r.name || r.title || "Route", color: "", image: r.portrait ?? r.banner ?? null });
    }
  }
  if (src === "units" || src === "characters") push(db.units);
  if (src === "gods" || src === "characters") push(db.gods);
  if (src === "npcs" || src === "characters") push(db.npcs);
  return out.map((o, i) => ({ ...o, color: palette[i % palette.length] }));
}
