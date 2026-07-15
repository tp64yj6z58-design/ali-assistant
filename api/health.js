const { hasAliExpressCredentials } = require("../src/config");
const { applySecurityHeaders } = require("../src/httpUtils");
const { hasGeminiCredentials } = require("../src/providers/geminiProvider");

module.exports = function handler(req, res) {
  applySecurityHeaders(res);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    aliExpressConnected: hasAliExpressCredentials(),
    aiProvider: "gemini",
    aiConnected: hasGeminiCredentials()
  });
};
