import { useDB } from "../../data/DataContext";
import { NAV_PAGES } from "../../data/navPages";

export function PagesEditor() {
  const { db, update } = useDB();
  const hidden = new Set(db.hiddenPages ?? []);

  function setShown(key: string, shown: boolean) {
    update((d) => {
      const set = new Set(d.hiddenPages ?? []);
      if (shown) set.delete(key);
      else set.add(key);
      d.hiddenPages = [...set];
    });
  }

  return (
    <div className="ornate card">
      <h3 className="section-title" style={{ marginTop: 0 }}>Navigation pages</h3>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
        Toggle which pages appear in the top navigation. Hiding a page only removes its nav link — the page is still reachable by direct URL. (Polls and Gacha have their own visibility settings.)
      </p>
      <div className="stack" style={{ gap: 4 }}>
        {NAV_PAGES.map((p) => (
          <label key={p.key} className="dev-toggle" style={{ marginLeft: 0 }}>
            <input type="checkbox" checked={!hidden.has(p.key)} onChange={(e) => setShown(p.key, e.target.checked)} />
            <span>{p.label}{p.row === 2 ? "  (Post-Release)" : ""}</span>
          </label>
        ))}
      </div>

      <div className="divider" />
      <h3 className="section-title">Spoilers</h3>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
        Shows the navbar “Allow Part 3 Spoilers” toggle. Leave off until Part 3 data (Part-3 characters, Master/Divine classes) is in — while off, that content stays hidden and the toggle isn’t shown.
      </p>
      <label className="dev-toggle" style={{ marginLeft: 0 }}>
        <input
          type="checkbox"
          checked={!!db.showSpoilerToggle}
          onChange={(e) => update((d) => { d.showSpoilerToggle = e.target.checked; })}
        />
        <span>Show the “Allow Part 3 Spoilers” toggle in the navbar</span>
      </label>
    </div>
  );
}
