const { handleAgentMessage } = require("../../src/personalAgent");
const { applySecurityHeaders, enforceRateLimit, publicError, readJsonBody } = require("../../src/httpUtils");

module.exports = async function handler(req, res) {
  applySecurityHeaders(res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    enforceRateLimit(req, "agent-message");
    const body = await readJsonBody(req);
    const result = await handleAgentMessage({
      sessionId: body.sessionId,
      message: body.message
    });
    res.status(200).json(result);
  } catch (error) {
    const { statusCode, message } = publicError(error);
    res.status(statusCode).json({ error: message });
  }
};
