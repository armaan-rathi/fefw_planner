// The deployed site is read-only (editing happens locally + push). Telling the
// client `editable: false` hides the editor UI for everyone on the live site.
module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.json({ editable: false });
};
