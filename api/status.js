const { PROTECTED, cors } = require("./_lib");

module.exports = (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  res.json({ protected: PROTECTED });
};
