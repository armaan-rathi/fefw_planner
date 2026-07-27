import React from "react";

// Map-marker icons mirroring the in-game overworld vocabulary.
const M = ({ size = 16, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<string, (s?: number) => JSX.Element> = {
  objective: (s) => (
    <M size={s}>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={12 + 4 * Math.cos(r)} y1={12 + 4 * Math.sin(r)} x2={12 + 8 * Math.cos(r)} y2={12 + 8 * Math.sin(r)} />;
      })}
    </M>
  ),
  junction: (s) => (
    <M size={s}>
      <circle cx="12" cy="12" r="7" fill="currentColor" fillOpacity="0.18" />
      <circle cx="12" cy="12" r="7" />
    </M>
  ),
  battle: (s) => (
    <M size={s}>
      <path d="M4 4l9 9M14 13l-3 3 4 4 3-3-4-4" />
      <path d="M20 4l-9 9M10 13l3 3-4 4-3-3 4-4" />
    </M>
  ),
  supply: (s) => (
    <M size={s}>
      <path d="M8 8h8l1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l1-9Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M9.5 8a2.5 2.5 0 0 1 5 0" />
    </M>
  ),
  merchant: (s) => (
    <M size={s}>
      <path d="M5 7h9l2 7H7L5 7Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M3 7h2M16 14H7" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </M>
  ),
  treasure: (s) => (
    <M size={s}>
      <path d="M12 3l8 9-8 9-8-9 8-9Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M7 12h10M12 3v18" />
    </M>
  ),
  gate: (s) => (
    <M size={s}>
      <path d="M4 20l8-15 8 15Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M9.5 20v-4a2.5 2.5 0 0 1 5 0v4" />
    </M>
  ),
  fort: (s) => (
    <M size={s}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const out = i % 2 === 0 ? 9 : 5;
        return <line key={a} x1="12" y1="12" x2={12 + out * Math.cos(r)} y2={12 + out * Math.sin(r)} />;
      })}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </M>
  ),
  blocked: (s) => (
    <M size={s}>
      <circle cx="12" cy="12" r="8" />
      <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    </M>
  ),
};

export function MapNodeIcon({ type, size = 15 }: { type: string; size?: number }) {
  const fn = ICONS[type?.toLowerCase()];
  return fn ? fn(size) : null;
}

export const hasMapIcon = (type: string) => !!ICONS[type?.toLowerCase()];
