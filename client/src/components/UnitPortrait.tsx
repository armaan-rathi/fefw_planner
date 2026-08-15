interface Props {
  src: string | null;
  name?: string;
  size?: number;
  className?: string;
  shape?: "round" | "square";
  question?: boolean; // shows a "?" badge (e.g. possibly enemy-only)
}

// Shows a portrait or a themed placeholder with the unit's initial.
export function UnitPortrait({ src, name = "?", size = 56, className = "", shape = "round", question = false }: Props) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.42 } as React.CSSProperties;
  const portrait = (
    <div className={`portrait ${shape} ${className}`} style={style}>
      {src ? <img src={src} alt={name} /> : <span className="portrait-initial">{initial}</span>}
    </div>
  );
  if (!question) return portrait;
  const q = Math.max(14, Math.round(size * 0.4));
  return (
    <span className="portrait-wrap">
      {portrait}
      <span className="portrait-q" style={{ width: q, height: q, fontSize: q * 0.66 }} title="Possibly enemy-only">?</span>
    </span>
  );
}
