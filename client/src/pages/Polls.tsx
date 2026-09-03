import { useEffect, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { PollChart } from "../components/PollChart";
import { resolvePollOptions } from "../data/polls";
import { fetchPollResults, castVote, type PollResult } from "../api";
import type { DB, Poll, PollOption } from "../types";

export function Polls() {
  const { db } = useDB();
  const polls = db.polls ?? [];
  const [voted, setVoted] = useLocalStorage<Record<string, string[]>>("fw.pollVotes", {});
  const [results, setResults] = useState<Record<string, PollResult>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const idKey = polls.map((p) => p.id).join(",");
  useEffect(() => {
    if (polls.length === 0) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchPollResults(polls.map((p) => p.id))
      .then((r) => { if (alive) { setResults(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  const markVoted = (pollId: string, ids: string[]) => setVoted((prev) => ({ ...prev, [pollId]: ids }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Polls</h2>
          <p>Vote in the pre-release community polls — the results appear once you&apos;ve cast your vote.</p>
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="empty-hint">No polls yet. {db ? "Add some in Dev Mode → Polls." : ""}</div>
      ) : (
        <>
          {err && <div className="error-state" style={{ marginBottom: 14 }}>Couldn&apos;t load poll results: {err}</div>}
          <div className="poll-grid">
            {polls.map((p) => (
              <PollCard
                key={p.id}
                poll={p}
                options={resolvePollOptions(db as DB, p)}
                result={results[p.id]}
                loading={loading}
                votedIds={voted[p.id] ?? null}
                onVoted={markVoted}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PollCard({
  poll,
  options,
  result,
  loading,
  votedIds,
  onVoted,
}: {
  poll: Poll;
  options: PollOption[];
  result?: PollResult;
  loading: boolean;
  votedIds: string[] | null;
  onVoted: (pollId: string, ids: string[]) => void;
}) {
  const single = Math.max(1, poll.maxSelections) <= 1;
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<PollResult | undefined>(result);
  const [peeking, setPeeking] = useState(false); // viewing results without having voted
  useEffect(() => setLocalResult(result), [result]);

  const hasVoted = votedIds !== null;
  const showResults = hasVoted || !!poll.closed || peeking;
  const canGoBack = peeking && !hasVoted && !poll.closed; // came here via "Skip to Results"

  function toggle(id: string) {
    setErr(null);
    if (single) { setSel([id]); return; }
    setSel((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= poll.maxSelections
        ? prev
        : [...prev, id]
    );
  }

  async function submit() {
    if (sel.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const { result: r } = await castVote(poll.id, sel);
      setLocalResult(r);
      onVoted(poll.id, sel);
    } catch (e: any) {
      setErr(e.message || "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  const voters = localResult?.voters ?? 0;
  const remaining = poll.maxSelections - sel.length;

  return (
    <div className="ornate card poll-card">
      <div className="poll-q">{poll.question || "Untitled poll"}</div>
      {poll.description && <p className="muted poll-desc">{poll.description}</p>}

      {showResults ? (
        <>
          {poll.closed && !votedIds && <div className="poll-closed-note">This poll is closed.</div>}
          {localResult ? (
            <PollChart poll={poll} options={options} counts={localResult.counts} yourPicks={votedIds ?? []} />
          ) : loading ? (
            <div className="poll-empty">Loading results…</div>
          ) : (
            <div className="poll-empty">No votes yet.</div>
          )}
          <div className="poll-meta">
            {voters} {voters === 1 ? "vote" : "votes"}{votedIds ? " · thanks for voting!" : ""}
          </div>
          {canGoBack && (
            <div className="poll-actions">
              <button className="btn ghost" onClick={() => setPeeking(false)}>← Back to voting</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="poll-hint">
            {single ? "Pick one:" : `Pick up to ${poll.maxSelections}:`}
            {!single && <span className="muted"> {remaining} left</span>}
          </div>
          <div className="poll-options">
            {options.map((o) => {
              const on = sel.includes(o.id);
              return (
                <button
                  key={o.id}
                  className={"poll-option" + (on ? " on" : "")}
                  style={on ? { borderColor: o.color, boxShadow: `inset 0 0 0 1px ${o.color}` } : undefined}
                  onClick={() => toggle(o.id)}
                  aria-pressed={on}
                >
                  {o.image ? (
                    <img className="poll-option-icon" src={o.image} alt="" />
                  ) : (
                    <span className="poll-option-dot" style={{ background: o.color }} />
                  )}
                  <span className="grow">{o.label}</span>
                  {on && <span className="poll-check">✓</span>}
                </button>
              );
            })}
          </div>
          {err && <div className="error-text" style={{ marginTop: 8 }}>{err}</div>}
          <div className="poll-actions">
            <button className="btn primary" disabled={sel.length === 0 || busy} onClick={submit}>
              {busy ? "Submitting…" : "Vote"}
            </button>
            <button className="btn ghost" onClick={() => setPeeking(true)}>Skip to Results</button>
          </div>
        </>
      )}
    </div>
  );
}
