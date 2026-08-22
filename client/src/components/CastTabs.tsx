import { NavLink } from "react-router-dom";

// Sub-navigation shared across the three character listings. Units are the
// playable cast; Gods and Important NPCs are separate, non-playable records.
export function CastTabs() {
  return (
    <div className="cast-tabs">
      <NavLink to="/characters" end>Units</NavLink>
      <NavLink to="/gods">Gods</NavLink>
      <NavLink to="/npcs">Important NPCs</NavLink>
    </div>
  );
}
