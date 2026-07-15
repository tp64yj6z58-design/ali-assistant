const MAX_JSON_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 45;
const rateBuckets = new Map();

function createHttpError(statusCode, message, publicMessage = message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function applySecurityHeaders(res) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "img-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  };

  for (const [key, value] of Object.entries(headers)) {
    if (typeof res.setHeader === "function") res.setHeader(key, value);
  }
}

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function enforceRateLimit(req, scope = "global") {
  const now = Date.now();
  const key = `${scope}:${clientKey(req)}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    cleanupRateBuckets(now);
    return;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    throw createHttpError(429, "Too many requests", "Too many searches right now. Please try again in a minute.");
  }
}

function cleanupRateBuckets(now) {
  if (rateBuckets.size < 1000) return;
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}

async function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return parseJsonBody(req.body, maxBytes);

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw createHttpError(413, "Request body too large", "The request is too large.");
    }
    chunks.push(chunk);
  }

  return parseJsonBody(Buffer.concat(chunks).toString("utf8"), maxBytes);
}

function parseJsonBody(raw, maxBytes = MAX_JSON_BODY_BYTES) {
  if (Buffer.byteLength(raw || "", "utf8") > maxBytes) {
    throw createHttpError(413, "Request body too large", "The request is too large.");
  }

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw createHttpError(400, "Invalid JSON", "Invalid request format.");
  }
}

function publicError(error) {
  return {
    statusCode: error.statusCode || 500,
    message: error.publicMessage || (error.statusCode ? error.message : "Something went wrong. Please try again.")
  };
}

module.exports = {
  applySecurityHeaders,
  createHttpError,
  enforceRateLimit,
  publicError,
  readJsonBody
};
