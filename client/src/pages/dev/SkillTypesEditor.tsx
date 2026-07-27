import { useState } from "react";
import { useDB } from "../../data/DataContext";
import { uid } from "../../api";
import { Icons, SkillIcon } from "../../components/icons";
import type { SkillType } from "../../types";

const ICON_KEYS = Object.keys(Icons);

export function SkillTypesEditor() {
  const { db, update } = useDB();
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("star");

  function add() {
    const l = label.trim();
    if (!l) return;
    update((d) => {
      d.skillTypes.push({ id: uid("st_"), label: l, icon });
    });
    setLabel("");
    setIcon("star");
  }
  function patch(id: string, p: Partial<SkillType>) {
    update((d) => {
      const s = d.skillTypes.find((x) => x.id === id);
      if (s) Object.assign(s, p);
    });
  }
  function remove(id: string) {
    if (!confirm("Remove this skill type? It will be removed from units' boons/banes and classes.")) return;
    update((d) => {
      d.skillTypes = d.skillTypes.filter((s) => s.id !== id);
      d.units.forEach((u) => {
        u.boons = u.boons.filter((x) => x !== id);
        u.banes = u.banes.filter((x) => x !== id);
        delete u.skillLevels[id];
      });
      d.classes.forEach((c) => (c.proficiencies = c.proficiencies.filter((x) => x !== id)));
    });
  }

  return (
    <div className="stack">
      <div className="ornate card">
        <h3 className="section-title">Skill / weapon types</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          These power the proficiency grid (boons, banes, class weapons). Edit labels and icons, or add new categories.
        </p>
        <div className="inline-add">
          <input type="text" placeholder="Label, e.g. Dark Magic" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <select value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 150 }}>
            {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <span className="prof-cell is-prof" style={{ width: 38, height: 38, flex: "none" }}><SkillIcon icon={icon} /></span>
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>

      <div className="ornate card">
        <div className="list-rows">
          {db.skillTypes.map((s) => (
            <div className="list-row ornate" key={s.id}>
              <span className="prof-cell is-prof" style={{ width: 40, height: 40, flex: "none" }}><SkillIcon icon={s.icon} /></span>
              <div className="grow">
                <input type="text" value={s.label} onChange={(e) => patch(s.id, { label: e.target.value })} />
              </div>
              <select value={s.icon} onChange={(e) => patch(s.id, { icon: e.target.value })} style={{ width: 140 }}>
                {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button className="btn tiny danger" onClick={() => remove(s.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
