// Shared helpers for the Vercel serverless functions (production backend).
// Files prefixed with "_" are not routed as endpoints.
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const PROTECTED = !!ADMIN_PASSWORD;
const tokenFor = (pw) => crypto.createHash("sha256").update("fw:" + pw).digest("hex");
const VALID_TOKEN = PROTECTED ? tokenFor(ADMIN_PASSWORD) : "";

function safeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function isAuthed(req) {
  if (!PROTECTED) return true;
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  return !!t && safeEq(t, VALID_TOKEN);
}

const BUCKET = process.env.SUPABASE_BUCKET || "media";
function supa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Returned when no state row exists yet (before migration) so the app can boot.
const EMPTY_DB = {
  schemaVersion: 2,
  routes: [],
  skillTypes: [],
  fieldDefs: [],
  classes: [],
  units: [],
  map: { background: null, nodes: [], edges: [] },
  ratingParams: [],
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
}

module.exports = { PROTECTED, tokenFor, VALID_TOKEN, safeEq, isAuthed, supa, BUCKET, EMPTY_DB, cors };
