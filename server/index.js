import express from "express";
import multer from "multer";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DB_PATH = path.join(DATA_DIR, "db.json");

fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ---- Default seed data ------------------------------------------------------
// Only the four lords are seeded; everything else is left blank for the user to
// fill in via Dev Mode as new game info is released.
const STANDARD_SKILLS = [
  { id: "sword", label: "Sword", icon: "sword" },
  { id: "lance", label: "Lance", icon: "lance" },
  { id: "axe", label: "Axe", icon: "axe" },
  { id: "bow", label: "Bow", icon: "bow" },
  { id: "brawl", label: "Brawl", icon: "brawl" },
  { id: "reason", label: "Reason", icon: "reason" },
  { id: "faith", label: "Faith", icon: "faith" },
  { id: "authority", label: "Authority", icon: "authority" },
  { id: "infantry", label: "Infantry", icon: "infantry" },
  { id: "armor", label: "Heavy Armor", icon: "armor" },
  { id: "riding", label: "Riding", icon: "riding" },
  { id: "flying", label: "Flying", icon: "flying" },
];

// A representative starter overworld graph (central river hub with radiating
// roads), loosely mirroring the in-game map layout. Edit/replace freely in
// Dev Mode → Map; drop the real map screenshot in as the backdrop.
const STARTER_MAP = {
  background: null,
  nodes: [
    { id: "n_camp", label: "River Camp", type: "rest", x: 50, y: 50 },
    { id: "n_fordn", label: "North Ford", type: "path", x: 50, y: 27 },
    { id: "n_fords", label: "South Ford", type: "path", x: 50, y: 73 },
    { id: "n_west", label: "West Crossroads", type: "crossroad", x: 30, y: 49 },
    { id: "n_east", label: "East Crossroads", type: "crossroad", x: 70, y: 51 },
    { id: "n_nw", label: "Highland Pass", type: "battle", x: 22, y: 25 },
    { id: "n_ne", label: "Watchtower", type: "battle", x: 78, y: 27 },
    { id: "n_sw", label: "Bog Trail", type: "battle", x: 24, y: 72 },
    { id: "n_se", label: "Ruined Fort", type: "boss", x: 76, y: 71 },
    { id: "n_market", label: "Wandering Market", type: "shop", x: 39, y: 63 },
    { id: "n_shrine", label: "Old Shrine", type: "event", x: 61, y: 37 },
    { id: "n_gatew", label: "Western Gate", type: "gate", x: 10, y: 50 },
    { id: "n_gatee", label: "Eastern Gate", type: "gate", x: 90, y: 47 },
    { id: "n_village", label: "Riverside Village", type: "rest", x: 50, y: 90 },
  ],
  edges: [
    { id: "e1", from: "n_camp", to: "n_fordn", turns: 1 },
    { id: "e2", from: "n_camp", to: "n_fords", turns: 1 },
    { id: "e3", from: "n_camp", to: "n_west", turns: 1 },
    { id: "e4", from: "n_camp", to: "n_east", turns: 1 },
    { id: "e5", from: "n_camp", to: "n_market", turns: 1 },
    { id: "e6", from: "n_camp", to: "n_shrine", turns: 1 },
    { id: "e7", from: "n_fordn", to: "n_nw", turns: 1 },
    { id: "e8", from: "n_fordn", to: "n_ne", turns: 1 },
    { id: "e9", from: "n_fords", to: "n_sw", turns: 1 },
    { id: "e10", from: "n_fords", to: "n_se", turns: 1 },
    { id: "e11", from: "n_fords", to: "n_village", turns: 1 },
    { id: "e12", from: "n_west", to: "n_gatew", turns: 2 },
    { id: "e13", from: "n_west", to: "n_nw", turns: 1 },
    { id: "e14", from: "n_west", to: "n_sw", turns: 1 },
    { id: "e15", from: "n_east", to: "n_gatee", turns: 2 },
    { id: "e16", from: "n_east", to: "n_ne", turns: 1 },
    { id: "e17", from: "n_east", to: "n_se", turns: 1 },
    { id: "e18", from: "n_shrine", to: "n_ne", turns: 1 },
    { id: "e19", from: "n_market", to: "n_sw", turns: 1 },
  ],
};

const ROUTES = [
  { id: "cai", name: "Cai", title: "Ribeira Winds", description: "", color: "#3f72c7", portrait: null },
  { id: "dietrich", name: "Dietrich", title: "House Lamine", description: "", color: "#7d5fb0", portrait: null },
  { id: "theodora", name: "Theodora", title: "Megaera's Torch", description: "", color: "#b8932f", portrait: null },
  { id: "leda", name: "Leda", title: "Rose Tempest", description: "", color: "#c13a6a", portrait: null },
];

// A blank unit with all structural fields present.
function newUnit(id, name, extra = {}) {
  return {
    id,
    name,
    portrait: null,
    isLord: false,
    routeIds: [],
    starterFor: [],
    classId: null,
    boons: [],
    banes: [],
    skillLevels: {},
    personalSkill: { name: "", description: "" },
    fields: {},
    ...extra,
  };
}

function defaultDB() {
  // The four lords are real units (isLord), locked to and starting on their route.
  const lordUnits = ROUTES.map((r) =>
    newUnit("unit_" + r.id, r.name, {
      isLord: true,
      routeIds: [r.id],
      starterFor: [r.id],
      fields: { faction: r.title },
    })
  );
  return {
    schemaVersion: 2,
    routes: ROUTES.map((r) => ({ ...r })),
    skillTypes: STANDARD_SKILLS,
    fieldDefs: [
      { id: "faction", key: "faction", label: "Faction", type: "dropdown", options: ROUTES.map((r) => r.title) },
      { id: "backstory", key: "backstory", label: "Backstory", type: "longtext" },
    ],
    classes: [],
    units: lordUnits,
    map: JSON.parse(JSON.stringify(STARTER_MAP)),
    ratingParams: [{ id: "overall", label: "Overall Appeal" }],
  };
}

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB(), null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (e) {
    console.error("db.json is corrupt, backing up and reseeding:", e.message);
    fs.copyFileSync(DB_PATH, DB_PATH + ".bak-" + Date.now());
    const fresh = defaultDB();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

// Ensure the file exists on boot.
loadDB();

// ---- App --------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/images", express.static(IMAGES_DIR));

// ---- Auth -------------------------------------------------------------------
// Reads are always public. Writes (PUT /api/data, POST /api/upload) require a
// bearer token when ADMIN_PASSWORD is set. With no password configured the
// server runs "open" (local development), so `npm run dev` needs no setup.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const PROTECTED = !!ADMIN_PASSWORD;
const tokenFor = (pw) => crypto.createHash("sha256").update("fw:" + pw).digest("hex");
const VALID_TOKEN = PROTECTED ? tokenFor(ADMIN_PASSWORD) : "";
function safeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function requireAuth(req, res, next) {
  if (!PROTECTED) return next();
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (tok && safeEq(tok, VALID_TOKEN)) return next();
  return res.status(401).json({ error: "Editor sign-in required" });
}

// Lets the client know whether a password is required and (via login) mints a token.
app.get("/api/status", (_req, res) => res.json({ protected: PROTECTED }));
app.post("/api/login", (req, res) => {
  const pw = (req.body && req.body.password) || "";
  if (!PROTECTED) return res.json({ token: "open", protected: false });
  if (safeEq(tokenFor(pw), VALID_TOKEN)) return res.json({ token: VALID_TOKEN, protected: true });
  return res.status(401).json({ error: "Incorrect password" });
});

app.get("/api/data", (_req, res) => {
  res.json(loadDB());
});

app.put("/api/data", requireAuth, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || !Array.isArray(body.routes)) {
    return res.status(400).json({ error: "Invalid data payload" });
  }
  // Write atomically so a crash mid-write can't corrupt the DB.
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(body, null, 2));
  fs.renameSync(tmp, DB_PATH);
  res.json({ ok: true });
});

const storage = multer.diskStorage({
  destination: IMAGES_DIR,
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    cb(null, id + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  res.json({ url: "/images/" + req.file.filename });
});

// ---- Serve the built client (single-service production deploy) --------------
// In dev, Vite serves the client and proxies /api + /images here. In production
// run `npm run build` and this serves the SPA on the same origin as the API.
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback for any non-API, non-image route.
  app.get(/^\/(?!api\/|images\/).*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
}

// Port: hosts inject PORT (single-service prod). Locally, Vite is on 5173 and
// this API defaults to 5174 (its proxy target). FW_SERVER_PORT overrides.
const PORT = process.env.FW_SERVER_PORT || process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(
    `Fortune Weaver server on http://localhost:${PORT}` +
      (PROTECTED ? " — editing password-protected" : " — editing OPEN (no ADMIN_PASSWORD set)")
  );
});
