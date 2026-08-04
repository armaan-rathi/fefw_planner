import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { UnitsEditor } from "./UnitsEditor";
import { ClassesEditor } from "./ClassesEditor";
import { RoutesEditor } from "./RoutesEditor";
import { CharacterPageEditor } from "./CharacterPageEditor";
import { FieldsEditor } from "./FieldsEditor";
import { SkillTypesEditor } from "./SkillTypesEditor";
import { MapEditor } from "./MapEditor";
import { CastEditor } from "./CastEditor";

export function DevMode() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Dev Mode</h2>
          <p>Edit the underlying game data. Everything saves automatically to the local server.</p>
        </div>
      </div>

      <div className="dev-subnav">
        <NavLink to="units">Units</NavLink>
        <NavLink to="classes">Classes</NavLink>
        <NavLink to="routes">Routes</NavLink>
        <NavLink to="fields">Unit Fields</NavLink>
        <NavLink to="skills">Skill Types</NavLink>
        <NavLink to="map">Map</NavLink>
        <NavLink to="characters">Characters Page</NavLink>
        <NavLink to="gods">Gods</NavLink>
        <NavLink to="npcs">Important NPCs</NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="units" replace />} />
        <Route path="units" element={<UnitsEditor />} />
        <Route path="classes" element={<ClassesEditor />} />
        <Route path="routes" element={<RoutesEditor />} />
        <Route path="fields" element={<FieldsEditor />} />
        <Route path="skills" element={<SkillTypesEditor />} />
        <Route path="map" element={<MapEditor />} />
        <Route path="characters" element={<CharacterPageEditor />} />
        <Route path="gods" element={<CastEditor kind="gods" label="Gods" subtitleLabel="Domain" />} />
        <Route path="npcs" element={<CastEditor kind="npcs" label="Important NPCs" subtitleLabel="Affiliation / role" />} />
      </Routes>
    </div>
  );
}
