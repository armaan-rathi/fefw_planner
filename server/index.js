import express from "express";
import multer from "multer";
import cors from "cors";
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

const ICON_TYPES = [
  { id: "it_objective", name: "Objective", image: null, shape: "star8", size: 30, color: "#f0c850" },
  { id: "it_town", name: "Town", image: null, shape: "circle", size: 26, color: "#e8e0cc" },
  { id: "it_fort", name: "Fort", image: null, shape: "star8", size: 26, color: "#9fb8c4" },
  { id: "it_battle", name: "Battle", image: null, shape: "square", size: 24, color: "#e0784b" },
  { id: "it_gate", name: "Gate", image: null, shape: "triangle", size: 24, color: "#d8b66a" },
  { id: "it_treasure", name: "Treasure", image: null, shape: "invtriangle", size: 22, color: "#b07fd0" },
  { id: "it_shop", name: "Shop", image: null, shape: "square", size: 22, color: "#5fa8e8" },
  { id: "it_waypoint", name: "Waypoint", image: null, shape: "circle", size: 12, color: "#cbb98a" },
];

const mapNode = (id, label, iconTypeId, x, y) => ({ id, label, iconTypeId, blocked: false, inactive: false, x, y });

// A representative starter overworld graph (central hub with radiating roads).
// Edit/replace freely in Dev Mode → Map; drop the real map screenshot in as the backdrop.
const STARTER_MAP = {
  background: null,
  nodes: [
    mapNode("n_camp", "River Camp", "it_town", 50, 50),
    mapNode("n_fordn", "North Ford", "it_waypoint", 50, 27),
    mapNode("n_fords", "South Ford", "it_waypoint", 50, 73),
    mapNode("n_west", "West Crossroads", "it_waypoint", 30, 49),
    mapNode("n_east", "East Crossroads", "it_waypoint", 70, 51),
    mapNode("n_nw", "Highland Pass", "it_battle", 22, 25),
    mapNode("n_ne", "Watchtower", "it_battle", 78, 27),
    mapNode("n_sw", "Bog Trail", "it_battle", 24, 72),
    mapNode("n_se", "Ruined Fort", "it_fort", 76, 71),
    mapNode("n_market", "Wandering Market", "it_shop", 39, 63),
    mapNode("n_shrine", "Old Shrine", "it_treasure", 61, 37),
    mapNode("n_gatew", "Western Gate", "it_gate", 10, 50),
    mapNode("n_gatee", "Eastern Gate", "it_gate", 90, 47),
    mapNode("n_village", "Riverside Village", "it_town", 50, 90),
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
    iconTypes: JSON.parse(JSON.stringify(ICON_TYPES)),
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

// This is the LOCAL, editable dev server. Editing happens on your own machine;
// the deployed (Vercel) site is read-only. So no auth here — you publish by
// committing server/data/ and pushing.
app.get("/api/status", (_req, res) => res.json({ editable: true }));

app.get("/api/data", (_req, res) => {
  res.json(loadDB());
});

app.put("/api/data", (req, res) => {
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

app.post("/api/upload", upload.single("image"), (req, res) => {
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

// This is the LOCAL dev API only (production uses the /api serverless functions,
// not this server). Vite proxies /api + /images to 5174, so bind there and
// ignore any injected PORT that would collide with Vite. FW_SERVER_PORT overrides.
const PORT = process.env.FW_SERVER_PORT || 5174;
app.listen(PORT, () => {
  console.log(`Fortune Weaver dev server (editable) on http://localhost:${PORT}`);
});
