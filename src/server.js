const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { config, hasAliExpressCredentials } = require("./config");
const { recommendProducts } = require("./assistant");
const { handleAgentMessage } = require("./personalAgent");
const { saveFeedback } = require("./feedbackStore");
const { applySecurityHeaders, enforceRateLimit, publicError, readJsonBody } = require("./httpUtils");
const { hasGeminiCredentials } = require("./providers/geminiProvider");

const publicDir = path.join(__dirname, "..", "public");

function sendJson(res, statusCode, payload) {
  applySecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=86400"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        aliExpressConnected: hasAliExpressCredentials(),
        aiProvider: "gemini",
        aiConnected: hasGeminiCredentials()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommend") {
      enforceRateLimit(req, "recommend");
      const body = await readJsonBody(req);
      const result = await recommendProducts(body.query);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/agent/message") {
      enforceRateLimit(req, "agent-message");
      const body = await readJsonBody(req);
      const result = await handleAgentMessage({
        sessionId: body.sessionId,
        message: body.message
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/feedback") {
      enforceRateLimit(req, "feedback");
      const body = await readJsonBody(req);
      const feedback = saveFeedback(body);
      sendJson(res, 200, { ok: true, feedback });
      return;
    }

    if (req.method === "GET") {
      const safePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.normalize(path.join(publicDir, safePath));
      if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${path.sep}`)) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      sendFile(res, filePath);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const { statusCode, message } = publicError(error);
    sendJson(res, statusCode, { error: message });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Ali Assistant is running on http://${config.host}:${config.port}`);
  console.log(hasAliExpressCredentials() ? "AliExpress credentials found." : "Running in demo mode. Add .env credentials for live results.");
});
