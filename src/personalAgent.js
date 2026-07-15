const { recommendProducts } = require("./assistant");
const {
  addSessionMessage,
  getAgentSession,
  hasShownProduct,
  rememberShownProducts
} = require("./agentSessionStore");
const { createHttpError } = require("./httpUtils");
const {
  composeAgentResponseWithGemini,
  planAgentMessageWithGemini
} = require("./providers/geminiProvider");

const LOADING_TEXT = "הסוכן מחפש עבורך...";

const QUICK_REPLIES = {
  he: [
    "תן לי עוד אפשרויות",
    "רק הכי זולים",
    "רק עם הכי הרבה ביקורות",
    "רק ממותגים",
    "עדכן תקציב"
  ],
  en: [
    "Show me more options",
    "Only the cheapest",
    "Only with many reviews",
    "Only branded",
    "Update budget"
  ]
};

async function handleAgentMessage({ sessionId, message }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw createHttpError(400, "Missing message", "צריך לכתוב הודעה לסוכן.");

  const session = getAgentSession(sessionId);
  addSessionMessage(session, "user", cleanMessage);

  const plan = await buildConversationPlan(session, cleanMessage);
  applyPlanToSession(session, plan);

  if (plan.action === "chat" || plan.action === "clarify") {
    const reply = plan.reply || buildClarificationReply(plan);
    addSessionMessage(session, "assistant", reply);
    return buildAgentResponse(session, reply, [], {
      quickReplies: plan.quickReplies,
      needsClarification: plan.action === "clarify",
      clarificationQuestion: reply,
      clarificationOptions: plan.quickReplies
    });
  }

  const searchQueries = buildSearchQueries(session, plan, cleanMessage);
  if (!searchQueries.length) {
    const reply = plan.language === "en"
      ? "Tell me what product you want and I will narrow it down like a shopping assistant."
      : "כתוב לי איזה מוצר אתה מחפש, ואני אדייק לך אותו כמו סוכן קניות.";
    addSessionMessage(session, "assistant", reply);
    return buildAgentResponse(session, reply, [], { quickReplies: defaultQuickReplies(plan.language) });
  }

  const searchResult = await searchConversationProducts(searchQueries, session, plan);
  const products = searchResult.products.slice(0, 2);
  rememberShownProducts(session, products);

  const reply = await buildNaturalReply(session, plan, products, searchResult);
  addSessionMessage(session, "assistant", reply);

  return buildAgentResponse(session, reply, products, {
    scannedCount: searchResult.scannedCount,
    quickReplies: plan.quickReplies.length ? plan.quickReplies : buildContextualQuickReplies(plan.language, products, searchResult)
  });
}

async function buildConversationPlan(session, message) {
  const language = detectLanguage(message, session);
  const fallback = buildRulePlan(session, message, language);

  const geminiPlan = await planAgentMessageWithGemini({
    message,
    session: serializeSessionForGemini(session),
    fallbackPlan: fallback,
    instruction: "Plan only the floating chat assistant behavior. Do not change the homepage search."
  });

  return normalizePlan(geminiPlan || fallback, fallback, message, language);
}

function buildRulePlan(session, message, language) {
  const text = message.toLowerCase();
  const followUp = isFollowUpOnly(message);
  const wantsMore = /more|another|show me more|give me more|עוד|תן לי עוד|אפשרויות נוספות/.test(text);
  const filters = {
    color: extractColor(text),
    brand: extractBrand(text),
    wantsCheap: /cheap|cheaper|lowest|budget|זול|זולים|יותר זול|הכי זול|משתלם/.test(text),
    wantsReviews: /reviews|orders|many reviews|ביקורות|הזמנות|הרבה ביקורות|הרבה הזמנות/.test(text),
    wantsBranded: /branded|brand|מותג|מותגים|ממותג|ממותגים/.test(text)
  };

  const budget = extractBudget(text);
  const vague = isVagueRequest(message);
  const product = followUp ? session.detectedProduct : stripShoppingWords(message);
  const searchQuery = buildFallbackSearchQuery(product || session.detectedProduct || message, { filters, budget });

  if (wantsMore) {
    return {
      action: "more",
      language,
      reply: "",
      searchQuery: session.lastSearchQuery || searchQuery,
      product: session.detectedProduct,
      category: session.category,
      budget,
      filters,
      alternatives: [],
      quickReplies: defaultQuickReplies(language),
      confidence: 70
    };
  }

  if (!session.detectedProduct && vague) {
    return {
      action: "clarify",
      language,
      reply: language === "en"
        ? "What kind of product should I focus on?"
        : "על איזה סוג מוצר להתמקד?",
      searchQuery: "",
      product: "",
      category: "",
      budget,
      filters,
      alternatives: [],
      quickReplies: language === "en"
        ? ["Phone accessories", "Car accessories", "Home gadgets", "Gift ideas"]
        : ["אביזרים לטלפון", "מוצרים לרכב", "גאדג'טים לבית", "רעיונות למתנה"],
      confidence: 45
    };
  }

  return {
    action: followUp ? "refine" : "search",
    language,
    reply: "",
    searchQuery,
    product: product || session.detectedProduct || message,
    category: "",
    budget,
    filters,
    alternatives: buildFallbackAlternatives(searchQuery),
    quickReplies: defaultQuickReplies(language),
    confidence: 62
  };
}

function normalizePlan(plan, fallback, message, language) {
  const selected = plan || fallback;
  const normalized = {
    action: ["clarify", "search", "refine", "more", "chat"].includes(selected.action) ? selected.action : fallback.action,
    language: selected.language === "en" ? "en" : language,
    reply: String(selected.reply || ""),
    searchQuery: String(selected.searchQuery || fallback.searchQuery || "").trim(),
    product: String(selected.product || fallback.product || "").trim(),
    category: String(selected.category || fallback.category || "").trim(),
    budget: Number.isFinite(Number(selected.budget)) ? Number(selected.budget) : fallback.budget,
    filters: {
      color: selected.filters?.color || fallback.filters?.color || "",
      brand: selected.filters?.brand || fallback.filters?.brand || "",
      wantsCheap: Boolean(selected.filters?.wantsCheap || fallback.filters?.wantsCheap),
      wantsReviews: Boolean(selected.filters?.wantsReviews || fallback.filters?.wantsReviews),
      wantsBranded: Boolean(selected.filters?.wantsBranded || fallback.filters?.wantsBranded)
    },
    alternatives: Array.isArray(selected.alternatives) ? selected.alternatives.filter(Boolean).slice(0, 6) : fallback.alternatives,
    quickReplies: Array.isArray(selected.quickReplies) && selected.quickReplies.length ? selected.quickReplies.slice(0, 5) : fallback.quickReplies,
    confidence: Number(selected.confidence || fallback.confidence || 0)
  };

  if (!normalized.searchQuery && normalized.action !== "clarify" && normalized.action !== "chat") {
    normalized.searchQuery = buildFallbackSearchQuery(normalized.product || message, normalized);
  }

  if (normalized.confidence < 45 && normalized.action !== "more") {
    normalized.action = "clarify";
    normalized.reply = normalized.reply || buildClarificationReply(normalized);
  }

  return normalized;
}

function applyPlanToSession(session, plan) {
  session.language = plan.language || session.language || "he";
  if (plan.product) session.detectedProduct = plan.product;
  if (plan.category) session.category = plan.category;
  if (plan.budget) session.budget = plan.budget;
  if (plan.searchQuery) session.lastSearchQuery = plan.searchQuery;
  if (plan.filters.color) session.filters.color = plan.filters.color;
  if (plan.filters.brand) session.filters.brand = plan.filters.brand;
  if (plan.filters.wantsCheap) session.filters.wantsCheap = true;
  if (plan.filters.wantsReviews) session.filters.wantsReviews = true;
  if (plan.filters.wantsBranded) session.filters.wantsBranded = true;
}

async function searchConversationProducts(searchQueries, session, plan) {
  const collected = [];
  const collectedKeys = new Set();
  let scannedCount = 0;
  let lastResult = null;
  const allQueries = unique([...searchQueries, ...(plan.alternatives || [])]).slice(0, plan.action === "more" ? 3 : 2);

  for (const query of allQueries) {
    lastResult = await recommendProducts(query, { allowClarification: false });
    scannedCount += Number(lastResult.scannedCount || 0);
    const filtered = filterConversationProducts(lastResult.products || [], session, plan);

    for (const product of filtered) {
      const key = productKey(product);
      if ((key && collectedKeys.has(key)) || hasShownProduct(session, product)) continue;
      collected.push(product);
      if (key) collectedKeys.add(key);
      if (collected.length >= 2) break;
    }

    if (collected.length >= 2) break;
  }

  return {
    products: collected,
    scannedCount,
    lastResult,
    attemptedQueries: allQueries
  };
}

function productKey(product) {
  const titleKey = productTitleFingerprint(product?.title || product?.searchTitle || "");
  if (titleKey) return `title:${titleKey}`;
  return String(product?.id || product?.productUrl || product?.promotion_link || "")
    .trim()
    .toLowerCase();
}

function productTitleFingerprint(title) {
  const stopWords = new Set(["with", "for", "and", "the", "usb", "new", "hot", "sale", "original"]);
  const words = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !/^\d+$/.test(word) && !stopWords.has(word));
  return [...new Set(words)].sort().slice(0, 14).join(" ");
}

function filterConversationProducts(products, session, plan) {
  let filtered = [...products];
  const budget = plan.budget || session.budget;

  if (budget) {
    const underBudget = filtered.filter((product) => !product.price || product.price <= budget);
    if (underBudget.length) filtered = underBudget;
  }

  if (plan.filters.wantsCheap || session.filters.wantsCheap) {
    filtered.sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
  }

  if (plan.filters.wantsReviews || session.filters.wantsReviews) {
    filtered.sort((a, b) => (b.orders || 0) - (a.orders || 0));
  }

  return filtered;
}

async function buildNaturalReply(session, plan, products, searchResult) {
  const composed = await composeAgentResponseWithGemini({
    language: plan.language,
    userIntent: {
      product: session.detectedProduct,
      category: session.category,
      budget: session.budget,
      filters: session.filters,
      action: plan.action,
      searchQuery: plan.searchQuery
    },
    scannedCount: searchResult.scannedCount,
    products: products.map((product) => ({
      title: product.title,
      price: product.price,
      currency: product.currency,
      rating: product.rating,
      orders: product.orders,
      reasons: product.reasons || []
    })),
    attemptedQueries: searchResult.attemptedQueries
  });

  if (composed?.reply) return composed.reply;
  return buildFallbackReply(plan, products, searchResult);
}

function buildFallbackReply(plan, products, searchResult) {
  if (products.length) {
    if (plan.language === "en") {
      return `I checked ${searchResult.scannedCount || "the available"} relevant options and picked ${products.length} that best match your request by relevance, price, rating and order volume.`;
    }
    const scanned = searchResult.scannedCount ? `${searchResult.scannedCount} אפשרויות רלוונטיות` : "את האפשרויות הרלוונטיות";
    return `בדקתי ${scanned} ובחרתי ${products.length} מוצרים שמתאימים הכי טוב לפי התאמה, מחיר, דירוג וכמות הזמנות.`;
  }

  if (plan.language === "en") {
    return "I did not find a strong exact match yet, so I suggest narrowing it by brand, budget, size or intended use.";
  }
  return "לא מצאתי התאמה מספיק חזקה להמלצה. כדאי לדייק לפי מותג, תקציב, גודל או שימוש כדי שאכוון למוצר הנכון.";
}

function buildAgentResponse(session, reply, products, extra = {}) {
  const language = session.language || "he";
  return {
    ok: true,
    sessionId: session.id,
    loadingText: LOADING_TEXT,
    reply,
    products: products.map(formatAgentProduct),
    quickReplies: (extra.quickReplies?.length ? extra.quickReplies : defaultQuickReplies(language)).slice(0, 5),
    memory: {
      detectedProduct: session.detectedProduct,
      category: session.category,
      budget: session.budget,
      filters: session.filters,
      shownProductsCount: session.shownProductIds.size
    },
    needsClarification: Boolean(extra.needsClarification),
    clarificationQuestion: extra.clarificationQuestion || "",
    clarificationOptions: extra.clarificationOptions || [],
    scannedCount: extra.scannedCount || 0
  };
}

function formatAgentProduct(product) {
  return {
    id: product.id || product.title,
    image: product.imageUrl || "",
    title: product.title || "",
    currentPrice: product.price || null,
    originalPrice: product.originalPrice || null,
    currency: product.currency || "",
    discount: product.discount || null,
    rating: product.rating || null,
    orders: product.orders || null,
    explanation: (product.reasons || []).slice(0, 2).join(" · ") || "נבחר לפי התאמה ונתוני מוצר זמינים.",
    promotion_link: product.productUrl || ""
  };
}

function buildSearchQueries(session, plan, message) {
  const base = plan.searchQuery || session.lastSearchQuery || session.detectedProduct || message;
  const filters = [];
  if (session.filters.color) filters.push(session.filters.color);
  if (session.filters.brand) filters.push(session.filters.brand);
  if (session.budget) filters.push(`under ${session.budget}`);
  if (session.filters.wantsCheap) filters.push("cheap");
  if (session.filters.wantsReviews) filters.push("high orders best reviews");
  if (session.filters.wantsBranded) filters.push("brand");

  const primary = [base, ...filters].filter(Boolean).join(" ");
  const variants = plan.action === "more"
    ? [`${primary} best rated`, `${primary} popular`, `${primary} high orders`, `${primary} deal`, `${primary} quality`]
    : [`${primary}`, `${primary} best rated`, `${primary} high orders`];

  return unique([primary, ...variants, ...(plan.alternatives || [])]).slice(0, 8);
}

function buildFallbackSearchQuery(product, context = {}) {
  const raw = String(product || "").trim();
  const cleaned = stripShoppingWords(raw);
  const filters = context.filters || {};
  return [
    cleaned || raw,
    filters.brand,
    filters.color,
    context.budget ? `under ${context.budget}` : ""
  ].filter(Boolean).join(" ");
}

function buildFallbackAlternatives(searchQuery) {
  const query = String(searchQuery || "").trim();
  return query ? [`${query} best rated`, `${query} high orders`, `${query} popular`] : [];
}

function buildContextualQuickReplies(language, products, searchResult) {
  if (!products.length) {
    return language === "en"
      ? ["Add a budget", "Choose a brand", "Make it more specific", "Try similar products"]
      : ["להוסיף תקציב", "לבחור מותג", "לדייק את המוצר", "נסה מוצרים דומים"];
  }
  return defaultQuickReplies(language);
}

function defaultQuickReplies(language = "he") {
  return language === "en" ? QUICK_REPLIES.en : QUICK_REPLIES.he;
}

function buildClarificationReply(plan) {
  if (plan.reply) return plan.reply;
  return plan.language === "en"
    ? "I need one more detail so I can search the right product."
    : "אני צריך עוד פרט אחד כדי לחפש את המוצר הנכון.";
}

function serializeSessionForGemini(session) {
  return {
    language: session.language || "he",
    detectedProduct: session.detectedProduct,
    category: session.category,
    budget: session.budget,
    filters: session.filters,
    lastSearchQuery: session.lastSearchQuery || "",
    productsAlreadyShown: session.shownProductIds.size,
    messages: session.messages.slice(-8).map((item) => ({
      role: item.role,
      content: item.content
    }))
  };
}

function detectLanguage(message, session) {
  const text = String(message || "");
  if (/[\u0590-\u05ff]/.test(text)) return "he";
  if (/[a-z]/i.test(text)) return "en";
  return session.language || "he";
}

function isFollowUpOnly(message) {
  const text = message.toLowerCase().trim();
  return /^(only|just|more|give me more|show me more|another|cheaper|black|white|logitech|baseus|ugreen|anker|עוד|רק|יותר זול|זול|שחור|לבן|ממותג|ממותגים|עדכן תקציב|תן לי עוד)/.test(text) ||
    /^(רק\s|only\s)/.test(text);
}

function isVagueRequest(message) {
  const text = message.toLowerCase().trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return words <= 4 && /משהו|דבר|מוצר|מתנה|גאדג'?ט|טוב|מגניב|something|thing|product|gift|gadget|cool|good/.test(text);
}

function stripShoppingWords(message) {
  return String(message || "")
    .replace(/אני מחפש|אני רוצה|צריך|תמצא לי|אפשר|מחפש|looking for|i need|i want|find me|recommend/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBudget(text) {
  const match = text.match(/(?:under|below|max|עד|מתחת ל?|פחות מ)\s*[$₪]?\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/[$₪]\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function extractColor(text) {
  if (/black|שחור|שחורים/.test(text)) return "black";
  if (/white|לבן|לבנים/.test(text)) return "white";
  if (/blue|כחול/.test(text)) return "blue";
  if (/red|אדום/.test(text)) return "red";
  if (/green|ירוק/.test(text)) return "green";
  if (/pink|ורוד/.test(text)) return "pink";
  return "";
}

function extractBrand(text) {
  const brands = ["logitech", "baseus", "ugreen", "anker", "toocki", "essager", "xiaomi", "lenovo", "samsung", "apple"];
  return brands.find((brand) => new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`, "i").test(text)) || "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

module.exports = { handleAgentMessage };
