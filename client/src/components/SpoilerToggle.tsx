export function SpoilerToggle({ allow, onChange }: { allow: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="spoiler-toggle" title="Master & Divine tier classes are late-game (Part 3).">
      <input type="checkbox" checked={allow} onChange={(e) => onChange(e.target.checked)} />
      <span>Allow Part 3 Spoilers</span>
    </label>
  );
}
