import React, { createContext, useContext, useEffect, useState } from "react";
import { getStatus } from "../api";
import { useLocalStorage } from "../hooks/useLocalStorage";

interface EditorValue {
  devMode: boolean; // editor mode active (only possible when `editable`)
  setDevMode: (v: boolean) => void;
  editable: boolean; // this server accepts edits (i.e. the local dev server)
}

const Ctx = createContext<EditorValue | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorage<boolean>("fw.devMode", false);
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    getStatus().then((s) => setEditable(!!s.editable));
  }, []);

  // On the read-only live site, editing is never active regardless of the
  // locally-stored toggle.
  const devMode = editable && stored;

  return <Ctx.Provider value={{ devMode, setDevMode: setStored, editable }}>{children}</Ctx.Provider>;
}

export function useDevMode(): EditorValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevMode must be used within DevModeProvider");
  return ctx;
}
