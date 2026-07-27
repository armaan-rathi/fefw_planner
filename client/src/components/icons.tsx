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
      <path d="M14.5 3.5 20 3l-.5 5.5L8 20l-3-3L14.5 3.5Z" />
      <path d="m5 17-2 2 3 3 2-2" />
      <path d="m13.5 9.5 1 1" />
    </S>
  ),
  lance: (p) => (
    <S {...p}>
      <path d="M5 19 19 5" />
      <path d="M19 5l-4 .4L18.6 9 19 5Z" />
      <path d="m6 14 4 4" />
    </S>
  ),
  axe: (p) => (
    <S {...p}>
      <path d="M12 4c4 0 7 2.5 7 5.5 0 1.5-1 2.5-3 2.5-1.2 0-2-.5-3-1.5" />
      <path d="M12 4c-1.5 0-3 .8-3.5 2" />
      <path d="M10.5 11 6 20" />
      <path d="m9 11 2 1" />
    </S>
  ),
  bow: (p) => (
    <S {...p}>
      <path d="M6 3c6 2.5 9 8 9 18" />
      <path d="M6 3 18 21" />
      <path d="M6 3v3.5L9.5 5" />
    </S>
  ),
  brawl: (p) => (
    <S {...p}>
      <path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M10 10.5V6a1.5 1.5 0 0 1 3 0v4.5" />
      <path d="M13 7.5a1.5 1.5 0 0 1 3 0V13c0 3.5-2 6-5 6s-5-2-5-5v-2l-1.5-1a1.2 1.2 0 0 1 1.5-1.8L8 10" />
    </S>
  ),
  reason: (p) => (
    <S {...p}>
      <path d="M12 5a6 6 0 1 0 0 12" />
      <path d="M12 5a6 6 0 1 1 0 12" />
      <path d="M12 8.5v5M9.5 11h5" />
    </S>
  ),
  faith: (p) => (
    <S {...p}>
      <path d="M12 3v8M8.5 6.5h7" />
      <path d="M7 11c0 4 2.5 7 5 10 2.5-3 5-6 5-10" />
    </S>
  ),
  authority: (p) => (
    <S {...p}>
      <path d="M6 3v18" />
      <path d="M6 4h11l-2.5 3L17 10H6" />
    </S>
  ),
  armor: (p) => (
    <S {...p}>
      <path d="M12 3 5 5.5V11c0 5 3 8 7 10 4-2 7-5 7-10V5.5L12 3Z" />
      <path d="M12 7v8M9 11h6" />
    </S>
  ),
  infantry: (p) => (
    <S {...p}>
      <path d="M9 3h3v9l5 2.5V18H9z" />
      <path d="M9 18h8.5" />
      <path d="M12 7h-3" />
    </S>
  ),
  riding: (p) => (
    <S {...p}>
      <path d="M9.5 4.2a5 3 0 0 1 5 0" />
      <path d="M7.6 6c-1.6 3.2-1.6 8.4.5 12.6" />
      <path d="M16.4 6c1.6 3.2 1.6 8.4-.5 12.6" />
      <circle cx="9" cy="9" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="0.7" fill="currentColor" stroke="none" />
    </S>
  ),
  flying: (p) => (
    <S {...p}>
      <path d="M3 8c5-1 9 1 11 5" />
      <path d="M21 8c-5-1-9 1-11 5" />
      <path d="M12 6v3" />
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
