export function SubLordsToggle({ show, onChange }: { show: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="spoiler-toggle" title="Show the four sub-lord DLC routes (Fiery Mane, Tale of the Moon, Linaria Dewdrops, Bridal Party of the Pale Raven).">
      <input type="checkbox" checked={show} onChange={(e) => onChange(e.target.checked)} />
      <span>Show Sub-lord Routes</span>
    </label>
  );
}
