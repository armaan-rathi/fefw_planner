import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useData } from "./data/DataContext";
import { DevModeProvider, useDevMode } from "./data/DevModeContext";
import { RouteSelection } from "./pages/RouteSelection";
import { TeamPlanner } from "./pages/TeamPlanner";
import { OverworldMap } from "./pages/OverworldMap";
import { CharacterList } from "./pages/CharacterList";
import { CastPage } from "./pages/CastPage";
import { ClassList } from "./pages/ClassList";
import { RouteSplit } from "./pages/RouteSplit";
import { DevMode } from "./pages/dev/DevMode";

function SaveBadge() {
  const { saveState } = useData();
  const map: Record<string, { t: string; c: string }> = {
    idle: { t: "", c: "" },
    saving: { t: "Saving…", c: "saving" },
    saved: { t: "Saved", c: "saved" },
    error: { t: "Save failed", c: "error" },
  };
  const s = map[saveState];
  if (!s.t) return null;
  return <span className={"save-badge " + s.c}>{s.t}</span>;
}

function EditorControls() {
  const { devMode, setDevMode, editable } = useDevMode();
  // Only the local dev server is editable; the live site shows no editor UI.
  if (!editable) return null;
  return (
    <label className="dev-toggle" title="Edit the underlying game data (local only)">
      <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} />
      <span>Editor</span>
    </label>
  );
}

function Shell() {
  const { devMode, editable, ready } = useDevMode();
  const { loading, error } = useData();

  return (
    <div className="app-root">
      <header className="topbar ornate-edge">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <h1>Fortune Weaver</h1>
            <p className="brand-sub">Planner for Fire Emblem: Fortune&apos;s Weave</p>
          </div>
        </div>
        <nav className="mainnav">
          <NavLink to="/routes">Route Selection</NavLink>
          <NavLink to="/characters">Character Database</NavLink>
          <NavLink to="/classes">Class List</NavLink>
          <NavLink to="/team">Team Planner</NavLink>
          <NavLink to="/map">Overworld Map</NavLink>
          {devMode && <NavLink to="/dev">Dev Mode</NavLink>}
        </nav>
        <div className="topbar-right">
          <SaveBadge />
          <EditorControls />
        </div>
      </header>

      <main className="page-wrap">
        {loading && <div className="loading-state">Summoning the archives…</div>}
        {error && (
          <div className="error-state">
            Couldn&apos;t reach the data server: {error}. Is the backend running on :5174?
          </div>
        )}
        {!loading && !error && (
          <Routes>
            <Route path="/" element={<Navigate to="/routes" replace />} />
            <Route path="/routes" element={<RouteSelection />} />
            <Route path="/characters" element={<CharacterList />} />
            <Route path="/classes" element={<ClassList />} />
            <Route path="/gods" element={<CastPage kind="gods" title="Gods" blurb="Deities you can worship at temples." />} />
            <Route path="/npcs" element={<CastPage kind="npcs" title="Important NPCs" blurb="Key non-playable characters in the story." />} />
            <Route path="/team" element={<TeamPlanner />} />
            <Route path="/split" element={<RouteSplit />} />
            <Route path="/map" element={<OverworldMap />} />
            {(!ready || editable) && <Route path="/dev/*" element={<DevMode />} />}
            <Route path="*" element={<Navigate to="/routes" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <DevModeProvider>
      <Shell />
    </DevModeProvider>
  );
}
