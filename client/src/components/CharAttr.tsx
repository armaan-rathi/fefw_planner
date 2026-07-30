import React from "react";
import { useDB } from "../data/DataContext";
import { fieldDisplay } from "../data/fields";
import { ProficiencyGrid } from "./ProficiencyGrid";
import type { Unit } from "../types";

function Field({
  label,
  compact,
  block,
  children,
}: {
  label: string;
  compact?: boolean;
  block?: boolean;
  children: React.ReactNode;
}) {
  if (compact) {
    return (
      <div className="char-attr compact">
        <span className="k">{label}:</span> <span className="v">{children}</span>
      </div>
    );
  }
  return (
    <div className={"char-attr" + (block ? " block" : "")}>
      <div className="k">{label}</div>
      <div className="v">{children}</div>
    </div>
  );
}

// Renders one configured attribute for a unit (compact on preview cards, full in the popup).
export function CharAttr({ id, unit, compact }: { id: string; unit: Unit; compact?: boolean }) {
  const { db } = useDB();

  if (id === "class") {
    const cls = db.classes.find((c) => c.id === unit.classId);
    if (!cls) return null;
    return (
      <Field label="Class" compact={compact}>
        <span className="tag">{cls.name}</span>
      </Field>
    );
  }

  if (id === "routes") {
    if (unit.routeIds.length === 0) {
      return (
        <Field label="Routes" compact={compact}>
          <span className="muted">All routes</span>
        </Field>
      );
    }
    return (
      <Field label="Routes" compact={compact}>
        <span className="chip-wrap" style={{ display: "inline-flex" }}>
          {unit.routeIds.map((rid) => {
            const r = db.routes.find((x) => x.id === rid);
            return r ? (
              <span className="tag" key={rid} style={{ borderColor: r.color, color: r.color }}>
                {r.name}
              </span>
            ) : null;
          })}
        </span>
      </Field>
    );
  }

  if (id === "proficiencies") {
    if (unit.boons.length === 0 && unit.banes.length === 0 && Object.keys(unit.skillLevels).length === 0) return null;
    const cls = db.classes.find((c) => c.id === unit.classId);
    return (
      <div className="char-attr block">
        <div className="k">Boons &amp; Banes</div>
        <ProficiencyGrid
          skillTypes={db.skillTypes}
          boons={unit.boons}
          banes={unit.banes}
          proficiencies={cls?.proficiencies ?? []}
          skillLevels={unit.skillLevels}
          compact
        />
      </div>
    );
  }

  if (id === "personalSkill") {
    const ps = unit.personalSkill;
    if (!ps?.name && !ps?.description) return null;
    return (
      <Field label="Personal Skill" compact={compact}>
        {ps.name && <b>{ps.name}</b>}
        {ps.name && ps.description ? " — " : ""}
        {ps.description}
      </Field>
    );
  }

  if (id.startsWith("field:")) {
    const key = id.slice(6);
    const f = db.fieldDefs.find((x) => x.key === key);
    if (!f) return null;
    const raw = unit.fields[key];
    const val = fieldDisplay(db, f, raw);
    if (!val) return null;
    if (f.type === "longtext") {
      const text = String(raw);
      if (compact) {
        return (
          <Field label={f.label} compact>
            {text.length > 90 ? text.slice(0, 90).trim() + "…" : text}
          </Field>
        );
      }
      return (
        <div className="char-attr block">
          <div className="k">{f.label}</div>
          <p className="char-longtext">{text}</p>
        </div>
      );
    }
    return (
      <Field label={f.label} compact={compact}>
        {val}
      </Field>
    );
  }

  return null;
}
