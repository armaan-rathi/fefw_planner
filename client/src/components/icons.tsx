import React from "react";

// Simple, recognizable line icons for each skill / weapon type. They use
// `currentColor` so the surrounding cell can tint them (boon = blue, bane =
// gold, proficient = bright, otherwise dimmed).

type IconProps = { size?: number; className?: string };
const S = ({ size = 22, className, children }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Icons: Record<string, (p: IconProps) => JSX.Element> = {
  sword: (p) => (
    <S {...p}>
      <path d="M12 2.5v11" />
      <path d="M10.4 4 12 2.5 13.6 4" />
      <path d="M8.5 13.5h7" />
      <path d="M12 13.5v4" />
      <path d="M10.8 17.5h2.4" />
    </S>
  ),
  lance: (p) => (
    <S {...p}>
      <path d="M4 20 12 12" />
      <path d="M12 12c1-4.5 4-7.5 8-8.5-.5 4-3.5 7.5-8 8.5Z" fill="currentColor" stroke="none" />
    </S>
  ),
  axe: (p) => (
    <S {...p}>
      <path d="M5 20 12.5 9.5" />
      <path d="M12.5 9.5 11 4c4-1 8 0 8.5 3 .5 3-3 4.5-7 2.5Z" fill="currentColor" stroke="none" />
    </S>
  ),
  bow: (p) => (
    <S {...p}>
      <path d="M9 3C15 6 15 18 9 21" />
      <path d="M9 3v18" />
      <path d="M7.5 3h3M7.5 21h3" />
    </S>
  ),
  brawl: (p) => (
    <S {...p}>
      <path d="M7 12.8v2.7A3.5 3.5 0 0 0 10.5 19h3a3.5 3.5 0 0 0 3.5-3.5V11" />
      <path d="M7 12.8v-1.3a1.15 1.15 0 0 1 2.3 0v1.3" />
      <path d="M9.3 12.3v-2a1.15 1.15 0 0 1 2.3 0v2" />
      <path d="M11.6 12.3v-2a1.15 1.15 0 0 1 2.3 0v2" />
      <path d="M13.9 12.5v-1.5a1.15 1.15 0 0 1 2.3 0V13" />
      <path d="M7 15.3 5.7 14a1.1 1.1 0 0 1 1.3-1.75L8 13" />
    </S>
  ),
  reason: (p) => (
    <S {...p}>
      <path d="M12 6C9.5 4.8 6.5 4.8 4 5.6v11.2c2.5-.8 5.5-.8 8 .6 2.5-1.4 5.5-1.4 8-.6V5.6C17.5 4.8 14.5 4.8 12 6Z" />
      <path d="M12 6v11.4" />
    </S>
  ),
  faith: (p) => (
    <S {...p}>
      <circle cx="12" cy="6" r="2.6" />
      <path d="M12 8.6V20" />
    </S>
  ),
  authority: (p) => (
    <S {...p}>
      <path d="M6.5 3v18" />
      <path d="M6.5 4h10l-2.5 3 2.5 3h-10" />
    </S>
  ),
  armor: (p) => (
    <S {...p}>
      <path d="M12 3 19 5.3v5.2c0 5-3 7.8-7 9.8-4-2-7-4.8-7-9.8V5.3Z" />
      <path d="M12 7v8M9 11h6" />
    </S>
  ),
  infantry: (p) => (
    <S {...p}>
      <path d="M9.5 4v9c0 1.3.8 2 2.5 2.3L16 16v1.5H9.5Z" />
      <path d="M9.5 6.5h2.3" />
    </S>
  ),
  riding: (p) => (
    <S {...p}>
      <path d="M8 4.5C5.8 8 5.8 14 8 18" />
      <path d="M16 4.5c2.2 3.5 2.2 9.5 0 13.5" />
      <path d="M8.8 4.3a4 2.6 0 0 1 6.4 0" />
      <circle cx="7.9" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16.1" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="13" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="13" r="0.6" fill="currentColor" stroke="none" />
    </S>
  ),
  flying: (p) => (
    <S {...p}>
      <path d="M20 5C11 4 4.5 9 3 18c3.5-4.5 7.5-5.5 11.5-4.5C11.5 10.5 13.5 7.5 20 5Z" />
      <path d="M7.5 15c2.5-1.5 5-1.5 7-1" />
    </S>
  ),
  // generic fallback
  star: (p) => (
    <S {...p}>
      <path d="M12 3.5 14.6 9l5.9.6-4.4 4 1.3 5.8L12 16.5 6.6 19.4 7.9 13.6 3.5 9.6 9.4 9 12 3.5Z" />
    </S>
  ),
};

export function SkillIcon({ icon, size, className }: { icon: string; size?: number; className?: string }) {
  const Cmp = Icons[icon] || Icons.star;
  return <Cmp size={size} className={className} />;
}

// Renders an uploaded icon image if the skill type has one, else the built-in SVG.
export function SkillMark({
  type,
  size = 22,
  className,
}: {
  type: { icon: string; iconImage?: string | null };
  size?: number;
  className?: string;
}) {
  if (type.iconImage) {
    return (
      <img
        src={type.iconImage}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ objectFit: "contain", display: "block" }}
      />
    );
  }
  return <SkillIcon icon={type.icon} size={size} className={className} />;
}
