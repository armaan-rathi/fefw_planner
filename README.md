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

- **Reads are public** — fans get full Route Selection, Team Planner, and Map interaction. Their ratings, custom rating parameters, and saved teams live only in *their own browser* (localStorage), so they never touch your data.
- **Writes are gated** — adding/editing units, classes, routes, fields, and image uploads require signing in. Set `ADMIN_PASSWORD` (see `server/.env.example`); the server then rejects any write without a valid token. Click **Editor sign-in** (top-right) and enter the password to edit.
- With **no** `ADMIN_PASSWORD` set, the server runs "open" — convenient for local dev, but do not host it publicly that way.

## Hosting: Vercel + Supabase

Production uses Vercel (static client + serverless API in `/api`) with Supabase for
data (a single JSONB row) and images (Storage). The local Express/file server is
untouched and still runs offline for development.

**One-time setup:**

1. **Supabase project** → SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql)
   (creates the `fw_state` table). Then Storage → New bucket → name **`media`**, **Public** on.
2. Grab from Supabase → Project Settings → API: the **Project URL** and the
   **service_role** key (secret — server-side only).
3. **Migrate your current data** (uploads images + writes the row):
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:supabase
   ```
4. **Vercel** → import the repo. It auto-detects `vercel.json` (build → `client/dist`,
   functions in `/api`). Set Environment Variables:
   - `ADMIN_PASSWORD` — your editor password
   - `SUPABASE_URL` — project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key
   - `SUPABASE_BUCKET` — `media` (optional; this is the default)
5. Deploy. Fans browse read-only; you click **Editor sign-in** and edit live.

**How it maps:** reads → `GET /api/data` (public). Edits → `PUT /api/data` (token-gated).
Image uploads → `POST /api/upload-url` issues a Supabase signed URL and the browser
uploads bytes straight to Storage (no Vercel size limit). No persistent disk needed —
Supabase holds everything.

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
