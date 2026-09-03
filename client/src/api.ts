import type { DB } from "./types";

// The deployed site is read-only; editing runs against the local dev server.
// `editable` tells the client whether to show the editor UI.
export async function getStatus(): Promise<{ editable: boolean }> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return { editable: false };
    const j = await res.json();
    return { editable: !!j.editable };
  } catch {
    return { editable: false };
  }
}

export async function fetchData(): Promise<DB> {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

export async function saveData(db: DB): Promise<void> {
  const res = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(db),
  });
  if (!res.ok) throw new Error("Failed to save data");
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Image upload failed");
  const json = await res.json();
  return json.url as string;
}

// Small id helper for client-created entities.
export function uid(prefix = ""): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Polls ----------------------------------------------------------------
export type PollResult = { counts: Record<string, number>; voters: number };

// A stable, anonymous per-device id used for soft one-vote-per-person dedup.
export function voterId(): string {
  try {
    let v = localStorage.getItem("fw.voterId");
    if (!v) {
      v = uid("v_");
      localStorage.setItem("fw.voterId", v);
    }
    return v;
  } catch {
    return uid("v_");
  }
}

export async function fetchPollResults(ids: string[]): Promise<Record<string, PollResult>> {
  const q = ids.length ? "?ids=" + encodeURIComponent(ids.join(",")) : "";
  const res = await fetch("/api/polls" + q);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load poll results");
  const json = await res.json();
  return json.results ?? {};
}

export async function castVote(pollId: string, optionIds: string[]): Promise<{ alreadyVoted: boolean; result: PollResult }> {
  const res = await fetch("/api/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, optionIds, voterId: voterId() }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Vote failed");
  return { alreadyVoted: !!json.alreadyVoted, result: json.result };
}
