import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { PollChart } from "../../components/PollChart";
import { resolvePollOptions, pollSourceLabel, POLL_SOURCES } from "../../data/polls";
import { POLL_PALETTE, type Poll, type PollGraph, type PollOption, type PollOptionsSource } from "../../types";

const GRAPHS: { value: PollGraph; label: string }[] = [
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "hbar", label: "Horizontal bars" },
  { value: "vbar", label: "Vertical bars" },
];

function blankPoll(): Poll {
  return {
    id: uid("poll_"),
    question: "",
    description: "",
    options: [
      { id: uid("opt_"), label: "Option 1", color: POLL_PALETTE[0] },
      { id: uid("opt_"), label: "Option 2", color: POLL_PALETTE[1] },
    ],
    maxSelections: 1,
    graph: "hbar",
    showValues: true,
    showPercent: true,
    showRank: true,
  };
}

// How many options to show in the editor preview — enough to see the whole
// palette cycle (and a little of the wrap-around) without an enormous chart.
const PREVIEW_LIMIT = 16;

// Deterministic sample tallies so every previewed option keeps a clearly visible
// bar/slice (so you can actually make out each colour).
function sampleCounts(opts: PollOption[]): Record<string, number> {
  const c: Record<string, number> = {};
  opts.forEach((o, i) => (c[o.id] = Math.max(6, 40 - i * 2 + ((i * 5) % 4))));
  return c;
}

export function PollsEditor() {
  const { db, update } = useDB();
  const polls = db.polls ?? [];

  function addPoll() {
    update((d) => { (d.polls ??= []).push(blankPoll()); });
  }
  function patchPoll(id: string, p: Partial<Poll>) {
    update((d) => {
      const poll = (d.polls ?? []).find((x) => x.id === id);
      if (poll) Object.assign(poll, p);
    });
  }
  function removePoll(id: string) {
    if (!confirm("Delete this poll? Existing votes stay in the store but the poll disappears from the site.")) return;
    update((d) => { d.polls = (d.polls ?? []).filter((x) => x.id !== id); });
  }
  function movePoll(id: string, dir: -1 | 1) {
    update((d) => {
      const arr = d.polls ?? [];
      const i = arr.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    });
  }
  function withPoll(id: string, fn: (poll: Poll) => void) {
    update((d) => {
      const poll = (d.polls ?? []).find((x) => x.id === id);
      if (poll) fn(poll);
    });
  }
  function setSource(id: string, src: PollOptionsSource | "") {
    withPoll(id, (poll) => {
      if (src) poll.optionsSource = src;
      else delete poll.optionsSource;
    });
  }
  function addOption(id: string) {
    withPoll(id, (poll) => {
      poll.options.push({ id: uid("opt_"), label: "Option " + (poll.options.length + 1), color: POLL_PALETTE[poll.options.length % POLL_PALETTE.length] });
    });
  }
  function patchOption(id: string, optId: string, p: Partial<PollOption>) {
    withPoll(id, (poll) => {
      const o = poll.options.find((x) => x.id === optId);
      if (o) Object.assign(o, p);
    });
  }
  function removeOption(id: string, optId: string) {
    withPoll(id, (poll) => {
      if (poll.options.length <= 2) return; // keep at least two
      poll.options = poll.options.filter((x) => x.id !== optId);
      poll.maxSelections = Math.min(poll.maxSelections, poll.options.length);
    });
  }
  function moveOption(id: string, optId: string, dir: -1 | 1) {
    withPoll(id, (poll) => {
      const i = poll.options.findIndex((x) => x.id === optId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= poll.options.length) return;
      [poll.options[i], poll.options[j]] = [poll.options[j], poll.options[i]];
    });
  }

  // ---- Palette (colours cycled across sourced options) ----
  const materialize = (poll: Poll) => { if (!poll.palette || !poll.palette.length) poll.palette = [...POLL_PALETTE]; };
  function editColor(id: string, i: number, color: string) {
    withPoll(id, (poll) => { materialize(poll); poll.palette![i] = color; });
  }
  function addColor(id: string, color: string) {
    withPoll(id, (poll) => { materialize(poll); poll.palette!.push(color); });
  }
  function removeColor(id: string, i: number) {
    withPoll(id, (poll) => { materialize(poll); if (poll.palette!.length > 1) poll.palette!.splice(i, 1); });
  }
  function moveColor(id: string, i: number, dir: -1 | 1) {
    withPoll(id, (poll) => {
      materialize(poll);
      const j = i + dir;
      if (j < 0 || j >= poll.palette!.length) return;
      [poll.palette![i], poll.palette![j]] = [poll.palette![j], poll.palette![i]];
    });
  }
  function resetPalette(id: string) {
    withPoll(id, (poll) => { delete poll.palette; });
  }

  return (
    <div className="stack">
      <div className="spread" style={{ marginBottom: 4 }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>Polls ({polls.length})</h3>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            Build pre-release polls. Definitions publish with your push; live votes are tracked separately (Vercel KV).
          </p>
        </div>
        <button className="btn primary" onClick={addPoll}>+ New Poll</button>
      </div>

      {polls.length === 0 ? (
        <div className="empty-hint">No polls yet. Create one to get started.</div>
      ) : (
        polls.map((poll, i) => {
          const resolved = resolvePollOptions(db, poll);
          const preview = resolved.slice(0, PREVIEW_LIMIT);
          const pal = poll.palette && poll.palette.length ? poll.palette : POLL_PALETTE;
          const maxPick = poll.optionsSource ? resolved.length : poll.options.length;
          return (
          <div className="ornate card" key={poll.id}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <span className="muted" style={{ fontSize: 12 }}>Poll {i + 1}</span>
              <span className="row" style={{ gap: 4 }}>
                <button className="icon-btn" title="Move up" disabled={i === 0} onClick={() => movePoll(poll.id, -1)}>▲</button>
                <button className="icon-btn" title="Move down" disabled={i === polls.length - 1} onClick={() => movePoll(poll.id, 1)}>▼</button>
                <button className="btn tiny danger" onClick={() => removePoll(poll.id)}>Delete</button>
              </span>
            </div>

            <div className="two-col">
              <div className="stack" style={{ gap: 10 }}>
                <label className="field" style={{ margin: 0 }}><span>Question</span>
                  <input type="text" value={poll.question} onChange={(e) => patchPoll(poll.id, { question: e.target.value })} />
                </label>
                <label className="field" style={{ margin: 0 }}><span>Description (optional)</span>
                  <input type="text" value={poll.description ?? ""} onChange={(e) => patchPoll(poll.id, { description: e.target.value })} />
                </label>

                <div className="field" style={{ margin: 0 }}>
                  <span>Options</span>
                  <label className="row" style={{ gap: 8, fontSize: 12.5, marginBottom: 8 }}>
                    <span className="muted">Options from</span>
                    <select value={poll.optionsSource ?? ""} onChange={(e) => setSource(poll.id, e.target.value as PollOptionsSource | "")} style={{ width: 280 }}>
                      <option value="">Custom list</option>
                      {POLL_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </label>
                  {poll.optionsSource ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      Pulling <b>{resolved.length}</b> option{resolved.length === 1 ? "" : "s"} live from your <b>{pollSourceLabel(poll.optionsSource)}</b> — new entries appear automatically, and portraits show as icons.
                    </div>
                  ) : (
                    <>
                      <div className="stack" style={{ gap: 6 }}>
                        {poll.options.map((o, oi) => (
                          <div className="row" key={o.id} style={{ gap: 6 }}>
                            <span className="row" style={{ gap: 2 }}>
                              <button className="icon-btn" title="Move up" disabled={oi === 0} onClick={() => moveOption(poll.id, o.id, -1)}>▲</button>
                              <button className="icon-btn" title="Move down" disabled={oi === poll.options.length - 1} onClick={() => moveOption(poll.id, o.id, 1)}>▼</button>
                            </span>
                            <input type="color" value={o.color} onChange={(e) => patchOption(poll.id, o.id, { color: e.target.value })} className="poll-color" title="Option colour" />
                            <input type="text" value={o.label} onChange={(e) => patchOption(poll.id, o.id, { label: e.target.value })} style={{ flex: 1 }} />
                            <button className="icon-btn" title="Remove option" disabled={poll.options.length <= 2} onClick={() => removeOption(poll.id, o.id)}>✕</button>
                          </div>
                        ))}
                      </div>
                      <button className="btn tiny" style={{ marginTop: 6 }} onClick={() => addOption(poll.id)}>+ Add option</button>
                    </>
                  )}
                </div>

                {poll.optionsSource && (
                  <div className="field" style={{ margin: 0 }}>
                    <span>Colour palette (loops in order)</span>
                    <div className="pal-list">
                      {pal.map((c, ci) => (
                        <div className="pal-chip" key={ci}>
                          <input type="color" value={c} onChange={(e) => editColor(poll.id, ci, e.target.value)} className="pal-swatch" title="Pick any colour" />
                          <div className="pal-ctrls">
                            <button className="icon-btn" title="Move left" disabled={ci === 0} onClick={() => moveColor(poll.id, ci, -1)}>◀</button>
                            <button className="icon-btn" title="Remove" disabled={pal.length <= 1} onClick={() => removeColor(poll.id, ci)}>✕</button>
                            <button className="icon-btn" title="Move right" disabled={ci === pal.length - 1} onClick={() => moveColor(poll.id, ci, 1)}>▶</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="btn tiny" onClick={() => addColor(poll.id, "#888888")}>+ Add colour</button>
                      <button className="btn tiny ghost" onClick={() => resetPalette(poll.id)}>Reset to default 12</button>
                      <span className="muted" style={{ fontSize: 11 }}>or add from standard:</span>
                      <span className="row" style={{ gap: 3, flexWrap: "wrap" }}>
                        {POLL_PALETTE.map((c, ci) => (
                          <button key={ci} className="pal-std" style={{ background: c }} title={"Add " + c} onClick={() => addColor(poll.id, c)} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="two-col">
                  <label className="field" style={{ margin: 0 }}><span>Options a voter can pick</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, maxPick)}
                      value={poll.maxSelections}
                      onChange={(e) => patchPoll(poll.id, { maxSelections: Math.min(Math.max(1, maxPick), Math.max(1, Number(e.target.value) || 1)) })}
                    />
                  </label>
                  <label className="field" style={{ margin: 0 }}><span>Graph type</span>
                    <select value={poll.graph} onChange={(e) => patchPoll(poll.id, { graph: e.target.value as PollGraph })}>
                      {GRAPHS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
                  <label className="dev-toggle"><input type="checkbox" checked={!!poll.showValues} onChange={(e) => patchPoll(poll.id, { showValues: e.target.checked })} /><span>Show vote counts</span></label>
                  <label className="dev-toggle"><input type="checkbox" checked={!!poll.showPercent} onChange={(e) => patchPoll(poll.id, { showPercent: e.target.checked })} /><span>Show percentages</span></label>
                  <label className="dev-toggle"><input type="checkbox" checked={poll.showRank !== false} onChange={(e) => patchPoll(poll.id, { showRank: e.target.checked })} /><span>Show rank (bars)</span></label>
                  <label className="dev-toggle"><input type="checkbox" checked={!!poll.closed} onChange={(e) => patchPoll(poll.id, { closed: e.target.checked })} /><span>Closed (no new votes)</span></label>
                </div>
              </div>

              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Preview (sample data)</div>
                <div className="poll-preview">
                  <PollChart poll={poll} options={preview} counts={sampleCounts(preview)} />
                  {resolved.length > preview.length && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Showing first {preview.length} of {resolved.length} options.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
