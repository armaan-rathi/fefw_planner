import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useData } from "./DataContext";
import type { Route } from "../types";

// Sub-lord routes ship as DLC and stay hidden until the viewer opts in.
export function filterRoutes<T extends { dlc?: boolean }>(routes: T[], showSublords: boolean): T[] {
  return showSublords ? routes : routes.filter((r) => !r.dlc);
}

// Shared, reactive site-wide preference so the navbar toggle updates every page.
type SublordsCtx = [boolean, (v: boolean) => void];
const Ctx = createContext<SublordsCtx | null>(null);

export function SublordsProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useLocalStorage<boolean>("fw.showSublords", false);
  const value: SublordsCtx = [pref, setPref];
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSublords(): SublordsCtx {
  return useContext(Ctx) ?? [false, () => {}];
}

// Routes the viewer should currently see (DLC sub-lord routes gated by the toggle).
export function useVisibleRoutes(): Route[] {
  const { db } = useData();
  const [show] = useSublords();
  return useMemo(() => filterRoutes(db?.routes ?? [], show), [db?.routes, show]);
}
