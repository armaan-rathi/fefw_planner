import type { IconShape, MapNode } from "../types";

function starPolygon(points: number, innerR: number): string {
  const pts: string[] = [];
  const step = 360 / (points * 2);
  for (let i = 0; i < points * 2; i++) {
    const a = ((-90 + i * step) * Math.PI) / 180;
    const r = i % 2 === 0 ? 50 : innerR;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`);
  }
  return `polygon(${pts.join(",")})`;
}

const STAR4 = starPolygon(4, 16);
const STAR8 = starPolygon(8, 21);

export function shapeClip(shape: IconShape): string | undefined {
  switch (shape) {
    case "circle":
      return "circle(50%)";
    case "triangle":
      return "polygon(50% 3%, 97% 97%, 3% 97%)";
    case "invtriangle":
      return "polygon(3% 3%, 97% 3%, 50% 97%)";
    case "star4":
      return STAR4;
    case "star8":
      return STAR8;
    case "square":
    default:
      return undefined; // plain box
  }
}

export const SHAPE_OPTIONS: { value: IconShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
  { value: "invtriangle", label: "Inverted Triangle" },
  { value: "star4", label: "4-Point Star" },
  { value: "star8", label: "8-Point Star" },
];

// Small connector dots along an edge (in % coords), excluding the endpoints.
export function edgeDots(a: MapNode, b: MapNode, spacing = 2.6): { x: number; y: number }[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const n = Math.max(0, Math.round(dist / spacing) - 1);
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    out.push({ x: a.x + dx * t, y: a.y + dy * t });
  }
  return out;
}
