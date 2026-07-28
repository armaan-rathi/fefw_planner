import { useId } from "react";
import type { CSSProperties } from "react";
import type { IconShape, IconType } from "../types";

type Pt = { x: number; y: number };

function starPts(points: number, outer: number, inner: number): Pt[] {
  const pts: Pt[] = [];
  const step = 360 / (points * 2);
  for (let i = 0; i < points * 2; i++) {
    const a = ((-90 + i * step) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    pts.push({ x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) });
  }
  return pts;
}

// Equilateral triangles (height = base * √3/2), centred in the 100×100 box.
const VERTS: Partial<Record<IconShape, Pt[]>> = {
  triangle: [
    { x: 50, y: 12 },
    { x: 94, y: 88 },
    { x: 6, y: 88 },
  ],
  invtriangle: [
    { x: 6, y: 12 },
    { x: 94, y: 12 },
    { x: 50, y: 88 },
  ],
  star4: starPts(4, 46, 18),
  star8: starPts(8, 46, 22),
};

// Per-shape corner rounding (in viewBox units).
const CORNER: Partial<Record<IconShape, number>> = {
  triangle: 12,
  invtriangle: 12,
  star4: 5,
  star8: 4,
};

// A closed path through `pts` with rounded corners (radius clamped per corner).
function roundedPath(pts: Pt[], radius: number): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const l1 = Math.hypot(v1.x, v1.y) || 1;
    const l2 = Math.hypot(v2.x, v2.y) || 1;
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a = { x: p1.x - (v1.x / l1) * r, y: p1.y - (v1.y / l1) * r };
    const b = { x: p1.x + (v2.x / l2) * r, y: p1.y + (v2.y / l2) * r };
    d += `${i === 0 ? "M" : "L"} ${a.x.toFixed(2)} ${a.y.toFixed(2)} Q ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
  }
  return d + "Z";
}

function BlockedBadge({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", right: -size * 0.28, bottom: -size * 0.28, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#d33636" stroke="#fff" strokeWidth="1.6" />
      <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// Renders one map marker (SVG so shapes are crisp, equilateral, and rounded).
export function MapIcon({
  type,
  blocked,
  inactive,
  size,
}: {
  type: IconType;
  blocked?: boolean;
  inactive?: boolean;
  size?: number;
}) {
  const s = size ?? type.size;
  const clipId = "mi" + useId().replace(/:/g, "");
  const strokeW = 7;
  const rim = "rgba(9, 15, 20, 0.65)";

  // The shape element (used for fill, and as a clip path for images).
  const verts = VERTS[type.shape];
  function shapeEl(props: Record<string, unknown>) {
    if (type.shape === "circle") return <circle cx={50} cy={50} r={46} {...props} />;
    if (type.shape === "square") return <rect x={6} y={6} width={88} height={88} rx={16} {...props} />;
    return <path d={roundedPath(verts!, CORNER[type.shape] ?? 8)} {...props} />;
  }

  const shadow = "drop-shadow(0 1px 2px rgba(0,0,0,0.55))";
  const wrapStyle: CSSProperties = {
    position: "relative",
    width: s,
    height: s,
    lineHeight: 0,
    filter: inactive ? `grayscale(1) brightness(0.7) ${shadow}` : shadow,
    opacity: inactive ? 0.6 : 1,
  };

  return (
    <div style={wrapStyle}>
      <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
        {type.image ? (
          <>
            <defs>
              <clipPath id={clipId}>{shapeEl({})}</clipPath>
            </defs>
            <image href={type.image} x={0} y={0} width={100} height={100} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
            {shapeEl({ fill: "none", stroke: rim, strokeWidth: strokeW, strokeLinejoin: "round" })}
          </>
        ) : (
          shapeEl({ fill: type.color, stroke: rim, strokeWidth: strokeW, strokeLinejoin: "round" })
        )}
      </svg>
      {blocked && <BlockedBadge size={Math.max(10, s * 0.55)} />}
    </div>
  );
}
