const { isAuthed, supa, BUCKET, cors } = require("./_lib");

// Issues a Supabase signed upload URL so the client uploads image bytes directly
// to Storage (no Vercel body-size limit, no multipart parsing here).
module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Editor sign-in required" });

  const { filename } = req.body || {};
  const ext = filename && filename.includes(".") ? filename.split(".").pop().toLowerCase() : "png";
  const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let db;
  try {
    db = supa();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(key);
  if (error) return res.status(500).json({ error: error.message });
  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(key);

  return res.json({ signedUrl: data.signedUrl, path: data.path, token: data.token, publicUrl: pub.publicUrl });
};
