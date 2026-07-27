// One-time migration: pushes your local server/data/db.json into Supabase
// (uploading referenced images to Storage and rewriting their URLs).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:supabase
// Optional: SUPABASE_BUCKET (default "media")
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "server", "data", "db.json");
const IMG_DIR = path.join(ROOT, "server", "data", "images");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET = "media" } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from Supabase → Project Settings → API).");
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error("No db.json found at", DB_PATH);
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

const CT = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const cache = new Map();

async function upload(url) {
  if (!url || typeof url !== "string" || !url.startsWith("/images/")) return url;
  if (cache.has(url)) return cache.get(url);
  const key = url.replace("/images/", "");
  const file = path.join(IMG_DIR, key);
  if (!fs.existsSync(file)) {
    console.warn("  ! missing local image, leaving URL as-is:", url);
    return url;
  }
  const ext = path.extname(file).slice(1).toLowerCase();
  const buf = fs.readFileSync(file);
  const { error } = await sb.storage.from(SUPABASE_BUCKET).upload(key, buf, {
    contentType: CT[ext] || "application/octet-stream",
    upsert: true,
  });
  if (error) {
    console.error("  ! upload failed for", key, "-", error.message);
    return url;
  }
  const { data } = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(key);
  cache.set(url, data.publicUrl);
  console.log("  ↑ uploaded", key);
  return data.publicUrl;
}

console.log("Uploading images to bucket:", SUPABASE_BUCKET);
for (const r of db.routes || []) r.portrait = await upload(r.portrait);
for (const u of db.units || []) u.portrait = await upload(u.portrait);
for (const c of db.classes || []) c.portrait = await upload(c.portrait);
if (db.map) db.map.background = await upload(db.map.background);

console.log("Writing state row…");
const { error } = await sb.from("fw_state").upsert({ id: 1, data: db, updated_at: new Date().toISOString() });
if (error) {
  console.error("State upsert failed:", error.message);
  process.exit(1);
}
console.log("✓ Migration complete. Your data is now in Supabase.");
