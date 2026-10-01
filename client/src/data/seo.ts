import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const SITE_URL = "https://fefw-planner.vercel.app";
export const SITE_NAME = "Fortune Weaver";
export const OG_IMAGE = `${SITE_URL}/og-image.svg`;

export const DEFAULT_TITLE = "Fortune Weaver — Fire Emblem: Fortune's Weave Planner";
export const DEFAULT_DESCRIPTION =
  "A route and team planner for Fire Emblem: Fortune's Weave. Compare the four lords' paths, plan teams, and browse units, classes, growth rates, recruitment, supports and more.";

interface PageSeo {
  title: string;
  description: string;
}

// Per-route title + description. Titles get " — Fortune Weaver" appended automatically.
const PAGE_META: Record<string, PageSeo> = {
  "/routes": {
    title: "Route Selection",
    description:
      "Compare the four lords' paths in Fire Emblem: Fortune's Weave and rate units across your own parameters to decide your route.",
  },
  "/characters": {
    title: "Character Database",
    description:
      "Browse every playable character in Fire Emblem: Fortune's Weave — stats, boons, banes, personal skills and proficiencies.",
  },
  "/classes": {
    title: "Class List",
    description:
      "All classes in Fire Emblem: Fortune's Weave with abilities, growth modifiers, proficiencies and certification requirements.",
  },
  "/tiers": {
    title: "Tier List",
    description: "Build and compare tier lists for Fire Emblem: Fortune's Weave units.",
  },
  "/split": {
    title: "Team Planner",
    description:
      "Plan your team for each route in Fire Emblem: Fortune's Weave — assign classes and mounts and see available proficiencies.",
  },
  "/map": {
    title: "Overworld Map",
    description: "Interactive overworld map and route planner for Fire Emblem: Fortune's Weave.",
  },
  "/recruitment": {
    title: "Recruitment",
    description:
      "How and when to recruit every unit in Fire Emblem: Fortune's Weave — conditions, support and renown requirements, and paralogues.",
  },
  "/growths": {
    title: "Growth Rates",
    description:
      "Growth-rate tables plus a consolidated unit + class + mount growth calculator for Fire Emblem: Fortune's Weave.",
  },
  "/proficiencies": {
    title: "Proficiencies",
    description:
      "Weapon and skill proficiencies for every unit in Fire Emblem: Fortune's Weave, with boon and bane filters.",
  },
  "/mounts": {
    title: "Mounts",
    description:
      "Every mount in Fire Emblem: Fortune's Weave — stat and growth bonuses, abilities, and where to find each one.",
  },
  "/paralogues": {
    title: "Paralogues",
    description: "Paralogue calendar and availability windows for Fire Emblem: Fortune's Weave, by route.",
  },
  "/supports": {
    title: "Supports",
    description: "Support relationship chart for Fire Emblem: Fortune's Weave characters.",
  },
  "/gods": {
    title: "Gods",
    description: "Deities you can worship at temples in Fire Emblem: Fortune's Weave.",
  },
  "/npcs": {
    title: "Important NPCs",
    description: "Key non-playable characters in the story of Fire Emblem: Fortune's Weave.",
  },
};

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Keeps document title, meta description, canonical, and Open Graph/Twitter tags
// in sync with the current route. Call once inside the Router.
export function usePageSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PAGE_META[pathname];
    const title = page ? `${page.title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const description = page?.description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${pathname === "/" ? "/routes" : pathname}`;

    document.title = title;
    setMeta("name", "description", description);
    setLink("canonical", url);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);

    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [pathname]);
}
