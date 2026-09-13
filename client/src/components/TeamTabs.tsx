import { NavLink } from "react-router-dom";

// Sub-navigation for the team-planning pages.
export function TeamTabs() {
  return (
    <div className="cast-tabs">
      <NavLink to="/split">Route Split</NavLink>
      <NavLink to="/team" end>Team Builder</NavLink>
    </div>
  );
}
