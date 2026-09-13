import { useLayoutEffect, useRef } from "react";
import { rarityDef } from "../types";
import type { CardDisplay, Rarity } from "../types";

export function Stars({ rarity, className }: { rarity: Rarity; className?: string }) {
  const n = rarityDef(rarity).stars;
  return (
    <span className={"gcard-stars " + (className || "")}>
      {Array.from({ length: n }).map((_, i) => <span key={i}>★</span>)}
    </span>
  );
}

// The title line: always rendered (blank space reserved when there's no title),
// and its font shrinks to keep a long title on a single line.
function CardTitle({ title }: { title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = ""; // reset to the CSS base each time
      let size = parseFloat(getComputedStyle(el).fontSize);
      let guard = 40;
      while (el.scrollWidth > el.clientWidth + 0.5 && size > 6.5 && guard-- > 0) {
        size -= 0.5;
        el.style.fontSize = size + "px";
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [title]);
  return <div ref={ref} className="gcard-title">{title || " "}</div>;
}

// A single gacha card. `faceDown` shows the card back (for the reveal flip).
export function CardView({
  art,
  name,
  title,
  rarity,
  cls,
  size = "md",
  faceDown = false,
  show,
}: {
  art: string | null;
  name: string;
  title?: string;
  rarity: Rarity;
  cls?: string | null;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  show?: CardDisplay;
}) {
  const rd = rarityDef(rarity);
  const s = { stars: show?.stars ?? true, name: show?.name ?? true, title: show?.title ?? true, class: show?.class ?? true };
  const showInfo = s.stars || s.name || s.title || (s.class && !!cls);
  return (
    <div className={`gcard sz-${size} r-${rarity}` + (faceDown ? " down" : "")} style={{ ["--rc" as any]: rd.color }}>
      <div className="gcard-flip">
        <div className="gcard-face gcard-back"><span className="gcard-back-mark">✦</span></div>
        <div className="gcard-face gcard-front">
          <div className="gcard-art">
            <div className="gcard-glow" />
            {art ? <img src={art} alt={name} loading="eager" decoding="async" /> : <span className="gcard-initial">{(name[0] || "?").toUpperCase()}</span>}
          </div>
          {showInfo && (
            <div className="gcard-info">
              {s.stars && <Stars rarity={rarity} />}
              {s.name && <div className="gcard-name">{name}</div>}
              {s.title && <CardTitle title={title} />}
              {s.class && cls && <div className="gcard-class">{cls}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
