import { createContext, useContext } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useData } from "./DataContext";

// Late-game (Part 3) class tiers hidden unless the viewer opts in.
export const SPOILER_TIERS = ["Master", "Divine"];
export const isSpoilerTier = (tier?: string): boolean => !!tier && SPOILER_TIERS.includes(tier);
export const isSpoilerUnit = (u?: { part3?: boolean }): boolean => !!u?.part3;

export function filterSpoilerUnits<T extends { part3?: boolean }>(units: T[], allow: boolean): T[] {
  return allow ? units : units.filter((u) => !u.part3);
}

// Shared, reactive site-wide preference so the navbar toggle updates every page.
type SpoilerCtx = [boolean, (v: boolean) => void];
const Ctx = createContext<SpoilerCtx | null>(null);

export function SpoilerProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useLocalStorage<boolean>("fw.allowP3Spoilers", false);
  const { db } = useData();
  // The toggle only takes effect once devs enable it (once Part 3 data exists).
  const enabled = !!db?.showSpoilerToggle;
  const value: SpoilerCtx = [pref && enabled, (v) => setPref(v)];
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpoilers(): SpoilerCtx {
  return useContext(Ctx) ?? [false, () => {}];
}
