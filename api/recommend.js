const { recommendProducts } = require("../src/assistant");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await recommendProducts(req.body?.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Unexpected error"
    });
  }
};
