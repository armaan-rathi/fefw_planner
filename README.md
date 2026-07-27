# Fortune Weaver

A route & team planner for **Fire Emblem: Fortune's Weave**. Built to be robust and
continually updatable as pre-release info drops — add units, classes, portraits and map
nodes yourself in **Dev Mode**, and everything persists to a local file-based database.

## Features

- **Route Selection** — compare the four lords' paths and rosters. Rate units 1–10 across
  any number of custom parameters; scores tally per route to help you decide.
- **Team Planner** — pick a route (or Free Choice), drag units into your team, pick a class,
  and see the available weapon/skill types plus the unit's boons & banes.
- **Overworld Map** — drop your overworld screenshot as a backdrop, place stops and paths,
  then click stops to plot a route and get total turns + every stop along the way.
- **Dev Mode** — full CRUD for units, classes, lords, the skill/weapon types, and the custom
  fields tracked on every unit. Drag images straight in to set or replace portraits.

## Running it

Requires Node 18+ (tested on Node 22).

```bash
npm install        # installs server + client (npm workspaces)
npm run dev        # starts the API (:5174) and the web app (:5173)
```

Then open **http://localhost:5173**.

## Editing & access control

- **The deployed site is read-only for everyone.** Fans get full Route Selection, Team Planner, and Map interaction; their ratings, custom rating parameters, and saved teams live only in *their own browser* (localStorage).
- **You edit locally.** Run `npm run dev`, flip the **Editor** toggle (top-right — it only appears against the local server), and add/change units, classes, routes, fields, and images. Changes save to `server/data/db.json` and `server/data/images/`.
- **Publish by pushing.** Commit the changes and `git push`; Vercel redeploys with the new content. See *Hosting on Vercel* below.

## Hosting on Vercel (no database)

The content lives **in the repo**: `server/data/db.json` and `server/data/images/`
are committed. You edit locally and `git push`; Vercel redeploys with the new data.
The deployed site is **read-only for everyone** (the editor UI only appears against
the local dev server).

- `npm run build` runs `vite build`, then copies `server/data/images/*` into
  `client/dist/images/` so Vercel serves them at `/images/*` (matching the URLs in
  `db.json`).
- `api/data.js` serves the committed `db.json` (GET only). `api/status.js` reports
  `editable: false` so the live site hides editing.

**Vercel setup (one-time):**

1. Import the repo. **Set Root Directory to the repo root** (not `server/` — that
   folder has no build script and will fail with *"Missing script: build"*).
2. Framework Preset **Other**; leave Build/Output on defaults so `vercel.json` drives
   them (build → `client/dist`, functions in `/api`). **No environment variables needed.**
3. Deploy.

**Publishing edits:**

```bash
npm run dev            # edit via the Editor toggle (top-right); saves to db.json + images
git add -A && git commit -m "Add units" && git push   # Vercel auto-redeploys
```

> Make sure `server/data/db.json` and `server/data/images/` are actually committed —
> they used to be git-ignored. Run `git status` to confirm they're tracked.

## Where your data lives

- Game data: `server/data/db.json` (human-readable — safe to hand-edit or back up).
- Uploaded images: `server/data/images/`.

Both are git-ignored by default so your evolving data doesn't clutter source control.
Only the four lords (Cai, Dietrich, Theodora, Leda) and the standard skill types are seeded;
everything else starts blank for you to fill in.

## Project layout

```
server/   Express API — GET/PUT /api/data, POST /api/upload, serves /images
client/   Vite + React + TypeScript app
  src/pages/        RouteSelection, TeamPlanner, OverworldMap
  src/pages/dev/    Units / Classes / Lords / Fields / SkillTypes / Map editors
  src/components/   ProficiencyGrid, icons, ImageDrop, Modal, UnitPortrait
  src/data/         DataContext (autosave) + DevModeContext
```
