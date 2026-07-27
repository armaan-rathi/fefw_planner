import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type { DB } from "../types";
import { fetchData, saveData } from "../api";

type SaveState = "idle" | "saving" | "saved" | "error";

interface DataContextValue {
  db: DB | null;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
  /** Apply an immutable update to the DB and persist it (debounced). */
  update: (mutator: (draft: DB) => void) => void;
  /** Replace the whole DB (used by import / reset). */
  replace: (db: DB) => void;
  reload: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// Cheap structured clone that works in every browser.
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<number | null>(null);
  const pending = useRef<DB | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchData()
      .then((data) => {
        setDb(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(() => {
    if (!pending.current) return;
    const toSave = pending.current;
    pending.current = null;
    setSaveState("saving");
    saveData(toSave)
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  }, []);

  const schedule = useCallback(
    (next: DB) => {
      pending.current = next;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flush, 400);
    },
    [flush]
  );

  const update = useCallback(
    (mutator: (draft: DB) => void) => {
      setDb((current) => {
        if (!current) return current;
        const draft = clone(current);
        mutator(draft);
        schedule(draft);
        return draft;
      });
    },
    [schedule]
  );

  const replace = useCallback(
    (next: DB) => {
      setDb(next);
      schedule(next);
    },
    [schedule]
  );

  return (
    <DataContext.Provider value={{ db, loading, error, saveState, update, replace, reload: load }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

/** Convenience hook that asserts the DB is loaded (use inside pages). */
export function useDB(): { db: DB; update: DataContextValue["update"] } {
  const { db, update } = useData();
  if (!db) throw new Error("DB not loaded yet");
  return { db, update };
}
