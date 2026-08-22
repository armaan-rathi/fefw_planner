import { useEffect, useMemo, useState } from "react";
import { useDB } from "../data/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { UnitPortrait } from "../components/UnitPortrait";
import { TeamTabs } from "../components/TeamTabs";
import { ProficiencyGrid } from "../components/ProficiencyGrid";
import { SkillMark } from "../components/icons";
import { lordFirst, unitFaction, unitsForRoute } from "../data/units";
import { sortBySkillOrder } from "../data/skills";
import type { Unit } from "../types";

const SLOT_COUNT = 20;
const FREE_COLOR = "#e8eef0";
type Slot = { unitId: string; classId: string | null } | null;
type Teams = Record<string, Slot[]>; // route key -> slots

function emptyTeam(): Slot[] {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

export function TeamPlanner() {
  const { db } = useDB();
  const [route, setRoute] = useState<string>("free");
  const [teams, setTeams] = useLocalStorage<Teams>("fw.teams", {});
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null); // tap-to-add (mobile-friendly)

  const isFree = route === "free";
  const routeObj = isFree ? null : db.routes.find((r) => r.id === route) ?? null;
  const routeColor = routeObj?.color ?? FREE_COLOR;

  function resolveUnit(id: string): Unit | null {
    return db.units.find((u) => u.id === id) ?? null;
  }

  // Default team for a route = its starting units (the lord is one of them),
  // lord first.
  function defaultSlots(routeId: string): Slot[] {
    const slots = emptyTeam();
    const members = lordFirst(db.units.filter((u) => u.starterFor.includes(routeId)));
    members.slice(0, SLOT_COUNT).forEach((u, i) => {
      slots[i] = { unitId: u.id, classId: u.classId ?? null };
    });
    return slots;
  }

  // Seed a route's team with its defaults the first time it's opened.
  useEffect(() => {
    if (isFree) return;
    setTeams((t) => (route in t ? t : { ...t, [route]: defaultSlots(route) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, db.units]);

  // Pad teams saved before SLOT_COUNT grew (they were stored with fewer slots).
  const stored = teams[route] ?? emptyTeam();
  const slots = stored.length >= SLOT_COUNT ? stored : [...stored, ...Array(SLOT_COUNT - stored.length).fill(null)];

  function setSlots(next: Slot[]) {
    setTeams((t) => ({ ...t, [route]: next }));
  }

  // Palette: eligible units for the route, lord first.
  const available: Unit[] = useMemo(() => {
    return lordFirst(isFree ? db.units : unitsForRoute(db.units, route));
  }, [db.units, route, isFree]);

  const assignedIds = new Set(slots.filter(Boolean).map((s) => (s as any).unitId));

  function assign(slotIndex: number, unitId: string) {
    const next = slots.slice();
    const existing = next.findIndex((s) => s && s.unitId === unitId);
    if (existing >= 0) next[existing] = null;
    const unit = resolveUnit(unitId);
    next[slotIndex] = { unitId, classId: unit?.classId ?? null };
    setSlots(next);
  }
  function clearSlot(i: number) {
    const next = slots.slice();
    next[i] = null;
    setSlots(next);
  }
  // Tap-to-add: drop the unit into the first open slot (drag-and-drop doesn't work on touch).
  function addToTeam(unitId: string) {
    setPicked(null);
    if (slots.some((s) => s && s.unitId === unitId)) return; // already on the team
    const idx = slots.findIndex((s) => !s);
    if (idx < 0) {
      window.alert(`All ${SLOT_COUNT} slots are full — remove a unit first.`);
      return;
    }
    assign(idx, unitId);
  }
  function setSlotClass(i: number, classId: string | null) {
    const next = slots.slice();
    if (next[i]) next[i] = { ...(next[i] as any), classId };
    setSlots(next);
  }

  const routeOptions = [
    { id: "free", name: "Free Choice (all units)" },
    ...db.routes.map((r) => ({ id: r.id, name: r.name })),
  ];

  return (
    <div>
      <TeamTabs />
      <div className="page-head">
        <div>
          <h2>Team Planner</h2>
          <p>Pick a route to start with its lord &amp; retainers, then drag in more units and choose classes.</p>
        </div>
        <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
          {!isFree && (
            <button
              className="btn ghost"
              title="Reset this route's team to its starting units"
              onClick={() => setSlots(defaultSlots(route))}
            >
              Reset to default
            </button>
          )}
          <label className="field" style={{ margin: 0, minWidth: 240 }}>
            <span>Route</span>
            <select value={route} onChange={(e) => setRoute(e.target.value)}>
              {routeOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="route-banner" style={{ ["--accent" as any]: routeColor, marginBottom: 16 }}>
        <span className="dot" style={{ background: routeColor }} />
        {isFree ? (
          <span>Free Choice — build any team from every available unit.</span>
        ) : (
          <span>
            <b>{routeObj?.name}</b>
            {routeObj?.title ? ` · ${routeObj.title}` : ""} — team starts with the lord &amp; their retainers.
          </span>
        )}
      </div>

      <div className="team-layout">
        {/* Palette */}
        <div className="ornate card palette">
          <h3 className="section-title">Available Units ({available.length})</h3>
          {available.length === 0 ? (
            <div className="empty-hint" style={{ padding: 20 }}>No units available. Add some in Dev Mode.</div>
          ) : (
            <div className="palette-list">
              {available.map((u) => {
                const assigned = assignedIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className={"palette-item" + (assigned ? " assigned" : "") + (picked === u.id ? " picked" : "")}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/unit", u.id)}
                    onClick={() => setPicked((p) => (p === u.id ? null : u.id))}
                  >
                    <UnitPortrait src={u.portrait} name={u.name} size={36} question={u.possiblyEnemyOnly} />
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{u.name || "Unnamed"}</div>
                      {unitFaction(u) && <div className="muted" style={{ fontSize: 11.5 }}>{unitFaction(u)}</div>}
                    </div>
                    {assigned ? (
                      <span className="tag" title="Already on the team">On team</span>
                    ) : picked === u.id ? (
                      <button
                        className="btn tiny primary"
                        onClick={(e) => { e.stopPropagation(); addToTeam(u.id); }}
                      >
                        + Add
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Drag a unit onto a slot, or tap a unit and press <b>+ Add</b> to drop it in the next open slot.</p>
        </div>

        {/* Team grid */}
        <div className="team-grid">
          {slots.map((slot, i) => {
            const unit = slot ? resolveUnit(slot.unitId) : null;
            const isLord = !!unit && unit.isLord;
            const cls = slot?.classId ? db.classes.find((c) => c.id === slot.classId) : null;
            return (
              <div
                key={i}
                className={"team-slot" + (unit ? " filled" : "") + (dragOver === i ? " over" : "")}
                style={unit ? { ["--accent" as any]: isLord ? routeColor : undefined, borderColor: isLord ? routeColor : undefined } : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = e.dataTransfer.getData("text/unit");
                  if (id) assign(i, id);
                }}
              >
                {!unit ? (
                  <div className="slot-empty">Slot {i + 1} — drop a unit</div>
                ) : (
                  <>
                    <div className="spread">
                      <div className="row">
                        <UnitPortrait src={unit.portrait} name={unit.name} size={40} question={unit.possiblyEnemyOnly} />
                        <div>
                          <div className="row" style={{ gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>{unit.name || "Unnamed"}</span>
                          </div>
                          {unitFaction(unit) && <div className="muted" style={{ fontSize: 11.5 }}>{unitFaction(unit)}</div>}
                        </div>
                      </div>
                      <button className="icon-btn" title="Remove" onClick={() => clearSlot(i)}>✕</button>
                    </div>

                    <select value={slot!.classId ?? ""} onChange={(e) => setSlotClass(i, e.target.value || null)}>
                      <option value="">— Select class —</option>
                      {db.classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {cls && cls.proficiencies.length > 0 && (
                      <div>
                        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Available weapons / skills</div>
                        <div className="chip-wrap">
                          {sortBySkillOrder(cls.proficiencies, db.skillTypes).map((sid) => {
                            const st = db.skillTypes.find((s) => s.id === sid);
                            if (!st) return null;
                            return (
                              <span className="tag" key={sid} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <SkillMark type={st} size={13} /> {st.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(unit.boons.length > 0 || unit.banes.length > 0) && (
                      <div>
                        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Boons &amp; Banes</div>
                        <ProficiencyGrid
                          skillTypes={db.skillTypes}
                          boons={unit.boons}
                          banes={unit.banes}
                          proficiencies={cls?.proficiencies ?? []}
                          skillLevels={unit.skillLevels}
                          compact
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
