const crypto = require("node:crypto");

const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_MESSAGES = 20;
const sessions = new Map();

function createEmptySession(id = crypto.randomUUID()) {
  const now = Date.now();
  return {
    id,
    createdAt: now,
    lastActiveAt: now,
    messages: [],
    detectedProduct: "",
    category: "",
    budget: null,
    filters: {
      color: "",
      brand: "",
      wantsCheap: false,
      wantsReviews: false,
      wantsBranded: false
    },
    shownProductIds: new Set()
  };
}

function getAgentSession(sessionId) {
  cleanupExpiredSessions();
  const safeId = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "";
  const existing = safeId ? sessions.get(safeId) : null;
  if (existing) {
    existing.lastActiveAt = Date.now();
    return existing;
  }

  const session = createEmptySession(safeId || undefined);
  sessions.set(session.id, session);
  return session;
}

function addSessionMessage(session, role, content) {
  session.messages.push({
    role,
    content: String(content || "").trim(),
    createdAt: Date.now()
  });

  if (session.messages.length > MAX_MESSAGES) {
    session.messages.splice(0, session.messages.length - MAX_MESSAGES);
  }

  session.lastActiveAt = Date.now();
}

function rememberShownProducts(session, products) {
  for (const product of products || []) {
    const key = productKey(product);
    if (key) session.shownProductIds.add(key);
  }
}

function hasShownProduct(session, product) {
  const key = productKey(product);
  return Boolean(key && session.shownProductIds.has(key));
}

function productKey(product) {
  return String(product?.id || product?.promotion_link || product?.productUrl || product?.title || "").trim().toLowerCase();
}

function cleanupExpiredSessions(now = Date.now()) {
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActiveAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

module.exports = {
  addSessionMessage,
  getAgentSession,
  hasShownProduct,
  rememberShownProducts
};
