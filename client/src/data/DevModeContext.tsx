import React, { createContext, useContext, useEffect, useState } from "react";
import { getStatus, getToken, login as apiLogin, setToken } from "../api";

interface EditorValue {
  devMode: boolean; // editor mode active (signed in)
  protectedMode: boolean; // server requires a password
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<EditorValue | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [devMode, setDevMode] = useState<boolean>(() => !!getToken());
  const [protectedMode, setProtectedMode] = useState<boolean>(false);

  useEffect(() => {
    getStatus().then((s) => setProtectedMode(!!s.protected));
  }, []);

  async function login(password: string): Promise<boolean> {
    const token = await apiLogin(password);
    if (!token) return false;
    setDevMode(true);
    return true;
  }
  function logout() {
    setToken(null);
    setDevMode(false);
  }

  return <Ctx.Provider value={{ devMode, protectedMode, login, logout }}>{children}</Ctx.Provider>;
}

export function useDevMode(): EditorValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevMode must be used within DevModeProvider");
  return ctx;
}
