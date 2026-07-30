import { useDB } from "../../data/DataContext";
import { availableAttrs, charPageConfig } from "../../data/characterAttrs";
import type { CharacterPageConfig } from "../../types";

export function CharacterPageEditor() {
  const { db, update } = useDB();
  const cfg = charPageConfig(db);
  const attrs = availableAttrs(db);

  function toggle(which: keyof CharacterPageConfig, id: string) {
    update((d) => {
      const current = d.characterPage ?? charPageConfig(d);
      const next: CharacterPageConfig = { preview: [...current.preview], detail: [...current.detail] };
      const arr = next[which];
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(id);
      d.characterPage = next;
    });
  }

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title">Characters page — visible details</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Choose which details appear on the character preview <b>cards</b> and in the <b>detail popup</b>. Name and portrait
          always show. Custom fields (Faction, Backstory, …) come from Unit Fields.
        </p>
        <table className="rate-table">
          <thead>
            <tr>
              <th>Detail</th>
              <th style={{ width: 120 }}>Preview card</th>
              <th style={{ width: 120 }}>Detail popup</th>
            </tr>
          </thead>
          <tbody>
            {attrs.map((a) => (
              <tr key={a.id}>
                <td>{a.label}</td>
                <td>
                  <label className="chip-toggle" style={{ height: 34 }}>
                    <input type="checkbox" checked={cfg.preview.includes(a.id)} onChange={() => toggle("preview", a.id)} /> Show
                  </label>
                </td>
                <td>
                  <label className="chip-toggle" style={{ height: 34 }}>
                    <input type="checkbox" checked={cfg.detail.includes(a.id)} onChange={() => toggle("detail", a.id)} /> Show
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {attrs.length === 0 && <p className="muted">No attributes available yet.</p>}
      </div>
    </div>
  );
}
