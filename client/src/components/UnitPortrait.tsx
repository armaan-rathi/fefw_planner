interface Props {
  src: string | null;
  name?: string;
  size?: number;
  className?: string;
  shape?: "round" | "square";
}

// Shows a portrait or a themed placeholder with the unit's initial.
export function UnitPortrait({ src, name = "?", size = 56, className = "", shape = "round" }: Props) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.42 } as React.CSSProperties;
  return (
    <div className={`portrait ${shape} ${className}`} style={style}>
      {src ? <img src={src} alt={name} /> : <span className="portrait-initial">{initial}</span>}
    </div>
  );
}
