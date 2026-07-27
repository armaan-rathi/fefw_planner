const { PROTECTED, tokenFor, VALID_TOKEN, safeEq, cors } = require("./_lib");

module.exports = (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const pw = (req.body && req.body.password) || "";
  if (!PROTECTED) return res.json({ token: "open", protected: false });
  if (safeEq(tokenFor(pw), VALID_TOKEN)) return res.json({ token: VALID_TOKEN, protected: true });
  return res.status(401).json({ error: "Incorrect password" });
};
