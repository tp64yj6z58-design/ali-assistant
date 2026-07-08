const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { config, hasAliExpressCredentials } = require("./config");
const { recommendProducts } = require("./assistant");

const publicDir = path.join(__dirname, "..", "public");

function sendJson(res, statusCode, payload) {
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
    ".js": "application/javascript; charset=utf-8"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        aliExpressConnected: hasAliExpressCredentials()
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommend") {
      const body = await readJsonBody(req);
      const result = await recommendProducts(body.query);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET") {
      const safePath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.normalize(path.join(publicDir, safePath));
      if (!filePath.startsWith(publicDir)) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      sendFile(res, filePath);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: error.message || "Unexpected error"
    });
  }
});

server.listen(config.port, () => {
  console.log(`Ali Assistant is running on http://localhost:${config.port}`);
  console.log(hasAliExpressCredentials() ? "AliExpress credentials found." : "Running in demo mode. Add .env credentials for live results.");
});
