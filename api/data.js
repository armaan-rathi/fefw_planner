const { isAuthed, supa, EMPTY_DB, cors } = require("./_lib");

const ROW_ID = 1;

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  let db;
  try {
    db = supa();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  if (req.method === "GET") {
    const { data, error } = await db.from("fw_state").select("data").eq("id", ROW_ID).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ? data.data : EMPTY_DB);
  }

  if (req.method === "PUT") {
    if (!isAuthed(req)) return res.status(401).json({ error: "Editor sign-in required" });
    const body = req.body;
    if (!body || typeof body !== "object" || !Array.isArray(body.routes)) {
      return res.status(400).json({ error: "Invalid data payload" });
    }
    const { error } = await db
      .from("fw_state")
      .upsert({ id: ROW_ID, data: body, updated_at: new Date().toISOString() });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
