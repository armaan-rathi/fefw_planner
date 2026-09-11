import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useDB } from "../data/DataContext";
import { CardView } from "../components/GachaCardView";
import { activeRarities, allBanners, bannerCards, cardArt, cardClass, cardDisplay, cardName, rollPull } from "../data/gacha";
import { rarityRank } from "../types";
import type { CardDisplay, GachaCard, Rarity } from "../types";

type Pulled = { name: string; title?: string; art: string | null; rarity: Rarity; cls?: string | null };
type Phase = "idle" | "charging" | "reveal" | "summary";

// Keep track of art we've already asked the browser to fetch, so repeat pulls
// don't spin up redundant Image() loads (the files are also immutably cached).
// Four-pointed stars scattered around the centre, each with a random start
// offset/size/delay so they swirl in chaotically before converging.
function makeStars(): CSSProperties[] {
  // Staggered delays (0–2.0s) so stars keep streaming into the vortex at a
  // natural speed rather than one slow batch.
  return Array.from({ length: 60 }, () => {
    const ang = Math.random() * Math.PI * 2;
    const dist = 160 + Math.random() * 460;
    const size = 5 + Math.random() * 26;
    return {
      width: size + "px",
      height: size + "px",
      ["--sx" as any]: (Math.cos(ang) * dist).toFixed(0) + "px",
      ["--sy" as any]: (Math.sin(ang) * dist).toFixed(0) + "px",
      animationDelay: (Math.random() * 2.0).toFixed(2) + "s",
    } as CSSProperties;
  });
}

// Stars flung outward from the centre when the explosion blows (~3.05s in).
function makeBurstStars(): CSSProperties[] {
  return Array.from({ length: 30 }, () => {
    const ang = Math.random() * Math.PI * 2;
    const dist = 340 + Math.random() * 600;
    const size = 6 + Math.random() * 22;
    return {
      width: size + "px",
      height: size + "px",
      ["--bx" as any]: (Math.cos(ang) * dist).toFixed(0) + "px",
      ["--by" as any]: (Math.sin(ang) * dist).toFixed(0) + "px",
      animationDelay: (3.05 + Math.random() * 0.2).toFixed(2) + "s",
    } as CSSProperties;
  });
}

const preloaded = new Set<string>();
function preload(urls: (string | null)[]) {
  for (const u of urls) {
    if (u && !preloaded.has(u)) {
      preloaded.add(u);
      const img = new Image();
      img.src = u;
    }
  }
}

export function Gacha() {
  const { db } = useDB();
  const banners = allBanners(db);
  const [bannerId, setBannerId] = useState<string>("");
  const banner = banners.find((b) => b.id === bannerId) ?? banners[0] ?? null;
  const disp = cardDisplay(db);

  const [pull, setPull] = useState<Pulled[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [crest, setCrest] = useState<string | null>(null); // crest flashed during the charge
  const [stars, setStars] = useState<CSSProperties[]>([]);
  const [burstStars, setBurstStars] = useState<CSSProperties[]>([]);

  // Crest emblems (reuse the unit "Crest" field's uploaded images) to flash mid-summon.
  const crestImages = useMemo(() => Object.values(db.fieldDefs.find((f) => f.key === "crest")?.optionImages ?? {}), [db.fieldDefs]);

  // Warm the browser cache for this banner's art up front so reveals are smooth.
  const preview = useMemo(() => (banner ? bannerCards(db, banner) : []), [db, banner]);
  useEffect(() => { preload(preview.slice(0, 40).map((c) => cardArt(db, c))); }, [db, preview]);

  const best: Rarity = useMemo(() => {
    if (!pull) return "common";
    return pull.reduce<Rarity>((m, p) => (rarityRank(p.rarity) > rarityRank(m) ? p.rarity : m), "common");
  }, [pull]);

  // Charging → reveal after the summon animation.
  useEffect(() => {
    if (phase !== "charging") return;
    const t = setTimeout(() => setPhase("reveal"), 5400);
    return () => clearTimeout(t);
  }, [phase]);

  // Reveal auto-advances every 3s; the Next button just lets you go faster.
  useEffect(() => {
    if (phase !== "reveal" || !pull) return;
    const t = setTimeout(() => {
      if (idx < pull.length - 1) setIdx(idx + 1);
      else setPhase("summary");
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, idx, pull]);

  function summon(count: number) {
    if (!banner) return;
    const rolled = rollPull(db, banner, count);
    if (rolled.length === 0) {
      window.alert("This banner has no cards yet — add some in Dev Mode → Gacha.");
      return;
    }
    const pulled: Pulled[] = rolled.map((c: GachaCard) => ({ name: cardName(db, c), title: c.title, art: cardArt(db, c), rarity: c.rarity, cls: cardClass(db, c) }));
    preload(pulled.map((p) => p.art));
    setCrest(crestImages.length ? crestImages[Math.floor(Math.random() * crestImages.length)] : null);
    setStars(makeStars());
    setBurstStars(makeBurstStars());
    setPull(pulled);
    setIdx(0);
    setPhase("charging");
  }

  function next() {
    if (!pull) return;
    if (idx < pull.length - 1) setIdx((i) => i + 1);
    else setPhase("summary");
  }
  // Return to idle but keep the last pull so it stays shown below the banner.
  function close() { setPhase("idle"); setIdx(0); }

  if (banners.length === 0) {
    return (
      <div>
        <div className="page-head"><div><h2>Summon</h2><p>Pull for cards on limited banners.</p></div></div>
        <div className="empty-hint">No banners yet. Create one in Dev Mode → Gacha.</div>
      </div>
    );
  }

  const rates = banner?.rates;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Summon</h2>
          <p>Try your luck! Pulls are just for fun — nothing is spent or saved.</p>
        </div>
        {banners.length > 1 && (
          <label className="field" style={{ margin: 0, minWidth: 220 }}>
            <span>Banner</span>
            <select value={banner?.id} onChange={(e) => setBannerId(e.target.value)}>
              {banners.map((b) => <option key={b.id} value={b.id}>{b.name || "Untitled banner"}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Idle stage */}
      <div className="gacha-stage ornate card">
        <div className="gacha-stage-glow" />
        {banner?.image && <div className="gacha-banner-art"><img src={banner.image} alt="" /></div>}
        <div className="gacha-banner-name">{banner?.name || "Banner"}</div>
        {rates && (
          <div className="gacha-rates">
            {activeRarities(db).map((rd) => (
              <span key={rd.id} className="gacha-rate" style={{ color: rd.color }}>
                {db.gacha?.fehMode ? "★".repeat(rd.stars) : rd.label} {rates[rd.id] ?? 0}%
              </span>
            ))}
          </div>
        )}
        <div className="gacha-summon-btns">
          <button className="btn gacha-btn" onClick={() => summon(1)}>Summon ×1</button>
          <button className="btn primary gacha-btn big" onClick={() => summon(10)}>Summon ×10</button>
        </div>
      </div>

      {/* Most recent pull, shown below the banner */}
      {pull && phase === "idle" && (
        <div className="gacha-last">
          <div className="gacha-last-title">Most recent pull</div>
          <div className="gacha-summary-grid" style={{ gridTemplateColumns: `repeat(${Math.min(5, pull.length)}, 1fr)` }}>
            {pull.map((p, i) => <CardView key={i} art={p.art} name={p.name} title={p.title} rarity={p.rarity} cls={p.cls} size="sm" show={disp} />)}
          </div>
        </div>
      )}

      {/* Charging overlay */}
      {phase === "charging" && (
        <div className={"gacha-overlay charging hint-" + best}>
          <div className="gsummon-stage">
            {stars.map((st, i) => <span key={i} className="gsummon-star" style={st} />)}
            {burstStars.map((st, i) => <span key={"b" + i} className="gsummon-burststar" style={st} />)}
            <div className="gsummon-light" />
            {crest && <img className="gsummon-crest" src={crest} alt="" />}
          </div>
          <div className="gsummon-flash" />
          <div className="gacha-charging-text">Summoning…</div>
        </div>
      )}

      {/* Reveal overlay (one card at a time) */}
      {phase === "reveal" && pull && (
        <div className={"gacha-overlay reveal r-" + pull[idx].rarity}>
          <div className="gacha-reveal-burst" key={idx} />
          {pull[idx].rarity === "legendary" && <RevealStars key={"s" + idx} />}
          <RevealCard key={"c" + idx} p={pull[idx]} show={disp} />
          <div className="gacha-reveal-ctrls">
            <span className="gacha-progress">{idx + 1} / {pull.length}</span>
            {pull.length > 1 && idx < pull.length - 1 && (
              <button className="btn ghost" onClick={() => setPhase("summary")}>Skip</button>
            )}
            <button className="btn primary" onClick={next}>{idx < pull.length - 1 ? "Next" : "Done"}</button>
          </div>
        </div>
      )}

      {/* Summary overlay */}
      {phase === "summary" && pull && (
        <div className="gacha-overlay summary">
          <h3 className="gacha-summary-title">Your {pull.length === 1 ? "pull" : "pulls"}</h3>
          <div className="gacha-summary-grid" style={{ gridTemplateColumns: `repeat(${Math.min(5, pull.length)}, 1fr)` }}>
            {pull.map((p, i) => <CardView key={i} art={p.art} name={p.name} title={p.title} rarity={p.rarity} cls={p.cls} size="sm" show={disp} />)}
          </div>
          <div className="row" style={{ gap: 12, marginTop: 6 }}>
            <button className="btn" onClick={close}>Close</button>
            <button className="btn primary" onClick={() => summon(pull.length)}>Summon Again ×{pull.length}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// A gold star burst behind a 5★ reveal — stars fly out from the card and fade.
function RevealStars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 20 }, () => {
        const ang = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 260;
        const size = 8 + Math.random() * 22;
        return {
          width: size + "px",
          height: size + "px",
          ["--bx" as any]: (Math.cos(ang) * dist).toFixed(0) + "px",
          ["--by" as any]: (Math.sin(ang) * dist).toFixed(0) + "px",
          animationDelay: (Math.random() * 0.12).toFixed(2) + "s",
        } as CSSProperties;
      }),
    []
  );
  return (
    <div className="gacha-reveal-stars">
      {stars.map((st, i) => <span key={i} className="gsummon-burststar" style={st} />)}
    </div>
  );
}

// Reveal a single card: mounts face-down, then flips up (remounted per index).
function RevealCard({ p, show }: { p: Pulled; show?: CardDisplay }) {
  const [down, setDown] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setDown(false), 140);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="gacha-reveal-card">
      <CardView art={p.art} name={p.name} title={p.title} rarity={p.rarity} cls={p.cls} size="lg" faceDown={down} show={show} />
    </div>
  );
}
