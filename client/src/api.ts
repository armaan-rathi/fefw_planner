import type { DB } from "./types";

const TOKEN_KEY = "fw.token";
export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export class AuthError extends Error {}

export async function getStatus(): Promise<{ protected: boolean }> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return { protected: false };
    return res.json();
  } catch {
    return { protected: false };
  }
}

/** Returns the minted token on success, or null on wrong password. */
export async function login(password: string): Promise<string | null> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  setToken(json.token);
  return json.token as string;
}

export async function fetchData(): Promise<DB> {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

export async function saveData(db: DB): Promise<void> {
  const res = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(db),
  });
  if (res.status === 401) throw new AuthError("Editor sign-in required");
  if (!res.ok) throw new Error("Failed to save data");
}

export async function uploadImage(file: File): Promise<string> {
  // Production (Vercel + Supabase): get a signed upload URL and PUT the bytes
  // straight to Storage. Falls back to the local multipart endpoint (Express).
  try {
    const r = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (r.status === 401) throw new AuthError("Editor sign-in required");
    if (r.ok) {
      const { signedUrl, publicUrl } = await r.json();
      const up = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!up.ok) throw new Error("Storage upload failed");
      return publicUrl as string;
    }
    // Non-401, non-OK (e.g. 404 locally) → fall through to multipart.
  } catch (e) {
    if (e instanceof AuthError) throw e;
    // network/parse error → try the local fallback
  }

  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd, headers: authHeaders() });
  if (res.status === 401) throw new AuthError("Editor sign-in required");
  if (!res.ok) throw new Error("Image upload failed");
  const json = await res.json();
  return json.url as string;
}

// Small id helper for client-created entities.
export function uid(prefix = ""): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
