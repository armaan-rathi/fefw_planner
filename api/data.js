// Read-only data endpoint for the deployed site.
// The editable copy lives in the repo at server/data/db.json — edit it locally
// (via the dev server's editor) and `git push`; Vercel redeploys with the new
// data baked in. Writes are not accepted here (the live site is read-only).
const fs = require("fs");
const path = require("path");

function loadDb() {
  // Primary: static require so Vercel's bundler traces & includes the JSON.
  try {
    return require("../server/data/db.json");
  } catch (_) {
    /* fall through */
  }
  // Fallbacks in case the bundle layout differs.
  for (const p of [
    path.join(process.cwd(), "server/data/db.json"),
    path.join(__dirname, "..", "server", "data", "db.json"),
  ]) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

const DB = loadDb();

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") {
    if (!DB) return res.status(500).json({ error: "Data file not found in deployment" });
    return res.json(DB);
  }
  return res.status(405).json({ error: "The live site is read-only. Edit locally and push to publish." });
};
