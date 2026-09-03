// Poll vote tracking for the deployed site, backed by Vercel KV / Upstash Redis.
//
//   GET  /api/polls?ids=a,b,c   -> { results: { pollId: { counts, voters } } }
//   POST /api/polls             -> { pollId, optionIds, voterId }  (cast a vote)
//
// Vote tallies are the one piece of *runtime-writable* state in this otherwise
// read-only deployment. Poll definitions themselves live in server/data/db.json
// (edited locally, published via git) — this endpoint only reads them to
// validate incoming votes.
//
// Setup (one-time): create a KV / Upstash Redis store in the Vercel dashboard
// and link it to this project. That injects KV_REST_API_URL / KV_REST_API_TOKEN
// (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Nothing else required.
const fs = require("fs");
const path = require("path");
const { Redis } = require("@upstash/redis");

function loadDb() {
  try {
    return require("../server/data/db.json");
  } catch (_) {
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
  }
  return null;
}

const DB = loadDb();

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const key = (pollId) => `poll:${pollId}`;
const votersKey = (pollId) => `poll:${pollId}:voters`;

// A poll's actual options — custom list, or a live view of an entity list.
function resolvePollOptions(db, poll) {
  if (!poll.optionsSource) return poll.options || [];
  const out = [];
  const seen = new Set();
  const push = (list) => {
    for (const e of list || []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push({ id: e.id });
    }
  };
  const src = poll.optionsSource;
  if (src === "routes") push(db.routes);
  if (src === "units" || src === "characters") push(db.units);
  if (src === "gods" || src === "characters") push(db.gods);
  if (src === "npcs" || src === "characters") push(db.npcs);
  return out;
}

async function resultsFor(redis, poll) {
  const [raw, voters] = await Promise.all([redis.hgetall(key(poll.id)), redis.scard(votersKey(poll.id))]);
  const counts = {};
  for (const o of resolvePollOptions(DB, poll)) counts[o.id] = Number((raw && raw[o.id]) || 0);
  return { counts, voters: Number(voters || 0) };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: "Voting isn't set up yet — add a Vercel KV / Upstash store to enable polls." });
  }
  if (!DB) return res.status(500).json({ error: "Data file not found in deployment" });
  const polls = DB.polls || [];

  try {
    if (req.method === "GET") {
      const ids = String((req.query && req.query.ids) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const wanted = polls.filter((p) => ids.length === 0 || ids.includes(p.id));
      const results = {};
      await Promise.all(wanted.map(async (p) => { results[p.id] = await resultsFor(redis, p); }));
      return res.json({ results });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const { pollId, optionIds, voterId } = body;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return res.status(404).json({ error: "Poll not found" });
      if (poll.closed) return res.status(403).json({ error: "This poll is closed." });

      const valid = new Set(resolvePollOptions(DB, poll).map((o) => o.id));
      const picks = Array.isArray(optionIds) ? [...new Set(optionIds)].filter((id) => valid.has(id)) : [];
      if (picks.length === 0) return res.status(400).json({ error: "No valid options selected." });
      if (picks.length > Math.max(1, poll.maxSelections)) return res.status(400).json({ error: "Too many options selected." });

      // Soft one-vote-per-person: a random voterId (kept in the visitor's
      // localStorage) is added to a set; re-votes are ignored, not double-counted.
      let alreadyVoted = false;
      if (voterId) {
        const added = await redis.sadd(votersKey(pollId), String(voterId));
        alreadyVoted = added === 0;
      }
      if (!alreadyVoted) {
        await Promise.all(picks.map((id) => redis.hincrby(key(pollId), id, 1)));
      }
      const result = await resultsFor(redis, poll);
      return res.json({ ok: true, alreadyVoted, result });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Vote store error: " + (e && e.message ? e.message : String(e)) });
  }
};
