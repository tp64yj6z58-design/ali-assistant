const { recommendProducts } = require("./assistant");
const {
  addSessionMessage,
  getAgentSession,
  hasShownProduct,
  rememberShownProducts
} = require("./agentSessionStore");
const { createHttpError } = require("./httpUtils");

const QUICK_REPLIES = [
  "תן לי עוד אפשרויות",
  "רק הכי זולים",
  "רק עם הכי הרבה ביקורות",
  "רק ממותגים",
  "עדכן תקציב"
];

async function handleAgentMessage({ sessionId, message }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw createHttpError(400, "Missing message", "צריך לכתוב הודעה לסוכן.");

  const session = getAgentSession(sessionId);
  addSessionMessage(session, "user", cleanMessage);

  const update = parseConversationUpdate(cleanMessage, session);
  applyConversationUpdate(session, update);

  if (!session.detectedProduct && update.intent !== "new-search") {
    const reply = "בשמחה. רק כתוב לי קודם איזה מוצר לחפש, ואז אוכל לדייק לפי מחיר, מותג, צבע וביקורות.";
    addSessionMessage(session, "assistant", reply);
    return buildAgentResponse(session, reply, [], { loadingText: "הסוכן מחפש עבורך..." });
  }

  const searchQueries = buildSearchQueries(session, update);
  const collected = [];
  let lastResult = null;

  for (const query of searchQueries) {
    lastResult = await recommendProducts(query, { allowClarification: shouldAllowClarification(session, update) });
    if (lastResult.needsClarification) break;

    const candidates = filterProductsForConversation(lastResult.products || [], session, update);
    for (const product of candidates) {
      if (hasShownProduct(session, product)) continue;
      collected.push(product);
      if (collected.length >= 2) break;
    }
    if (collected.length >= 2) break;
  }

  if (lastResult?.assistantIntent) {
    session.category = lastResult.assistantIntent.category || session.category;
    const terms = lastResult.assistantIntent.requiredTerms || [];
    if (terms.length && !isFollowUpOnly(cleanMessage)) session.detectedProduct = terms.join(" ");
  }

  if (lastResult?.needsClarification) {
    const reply = lastResult.clarificationQuestion || "כדי לדייק, אני צריך עוד פרט אחד.";
    addSessionMessage(session, "assistant", reply);
    return {
      ...buildAgentResponse(session, reply, [], {
        needsClarification: true,
        clarificationQuestion: lastResult.clarificationQuestion,
        clarificationOptions: lastResult.clarificationOptions || [],
        loadingText: "הסוכן מחפש עבורך..."
      }),
      quickReplies: [...(lastResult.clarificationOptions || []), ...QUICK_REPLIES].slice(0, 6)
    };
  }

  const products = collected.slice(0, update.intent === "more" ? 2 : 2);
  rememberShownProducts(session, products);

  const reply = buildAssistantReply(session, products, update, lastResult);
  addSessionMessage(session, "assistant", reply);

  return buildAgentResponse(session, reply, products, {
    scannedCount: lastResult?.scannedCount || 0,
    loadingText: "הסוכן מחפש עבורך..."
  });
}

function parseConversationUpdate(message, session) {
  const text = message.toLowerCase();
  const update = {
    intent: isFollowUpOnly(message) ? "refine" : "new-search",
    raw: message,
    budget: extractBudget(text),
    color: extractColor(text),
    brand: extractBrand(text),
    wantsCheap: /cheaper|cheap|lowest|זול|זולים|יותר זול|הכי זול|משתלם/.test(text),
    wantsReviews: /reviews|orders|ביקורות|הזמנות|הרבה ביקורות|הרבה הזמנות/.test(text),
    wantsBranded: /branded|brand|מותג|מותגים|ממותגים/.test(text),
    wantsMore: /more options|more|another|עוד|אפשרויות נוספות|תן לי עוד/.test(text)
  };

  if (update.wantsMore) update.intent = "more";
  if (!isFollowUpOnly(message)) update.product = message;
  if (!update.product && !session.detectedProduct && !update.wantsMore) update.product = message;
  return update;
}

function applyConversationUpdate(session, update) {
  if (update.product) session.detectedProduct = update.product;
  if (update.budget) session.budget = update.budget;
  if (update.color) session.filters.color = update.color;
  if (update.brand) session.filters.brand = update.brand;
  if (update.wantsCheap) session.filters.wantsCheap = true;
  if (update.wantsReviews) session.filters.wantsReviews = true;
  if (update.wantsBranded) session.filters.wantsBranded = true;
}

function buildSearchQueries(session, update) {
  const base = session.detectedProduct || update.raw;
  const filters = [];
  if (session.filters.color) filters.push(session.filters.color);
  if (session.filters.brand) filters.push(session.filters.brand);
  if (session.budget) filters.push(`under ${session.budget}`);
  if (session.filters.wantsCheap) filters.push("cheap");
  if (session.filters.wantsReviews) filters.push("best reviews high orders");
  if (session.filters.wantsBranded) filters.push("brand");

  const primary = [base, ...filters].filter(Boolean).join(" ");
  const moreVariants = [
    `${primary} best rated`,
    `${primary} high orders`,
    `${primary} deal`,
    `${primary} quality`,
    `${primary} popular`
  ];

  return update.intent === "more"
    ? unique([moreVariants[0], moreVariants[1], moreVariants[2], primary, ...moreVariants])
    : unique([primary, ...moreVariants.slice(0, 2)]);
}

function shouldAllowClarification(session, update) {
  if (update.intent !== "new-search") return false;
  const text = String(update.raw || "").trim().toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const vague = /משהו|דבר|מוצר|מתנה|something|thing|product|gift/.test(text);
  return !session.detectedProduct || (words <= 3 && vague);
}

function filterProductsForConversation(products, session, update) {
  let filtered = [...products];

  if (session.budget) {
    const underBudget = filtered.filter((product) => !product.price || product.price <= session.budget);
    if (underBudget.length) filtered = underBudget;
  }

  if (update.wantsCheap || session.filters.wantsCheap) {
    filtered.sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
  }

  if (update.wantsReviews || session.filters.wantsReviews) {
    filtered.sort((a, b) => (b.orders || 0) - (a.orders || 0));
  }

  return filtered;
}

function buildAssistantReply(session, products, update, result) {
  if (!products.length) {
    if (update.intent === "more") {
      return "בדקתי עוד אפשרויות, אבל לא מצאתי כרגע מוצר נוסף שלא כבר הצגתי ושמספיק חזק להמלצה.";
    }
    return result?.assistantSummary || "בדקתי את האפשרויות, אבל לא מצאתי כרגע מוצר מספיק מדויק להמלצה.";
  }

  const productText = products.length === 1 ? "אפשרות אחת חזקה" : `${products.length} אפשרויות חזקות`;
  const context = session.filters.brand || session.filters.color || session.budget || session.filters.wantsCheap || session.filters.wantsReviews
    ? " לפי הסינון שביקשת"
    : "";
  return `מצאתי ${productText}${context}. בחרתי אותן לפי התאמה לבקשה, מחיר, דירוג וכמות הזמנות.`;
}

function buildAgentResponse(session, reply, products, extra = {}) {
  return {
    ok: true,
    sessionId: session.id,
    loadingText: extra.loadingText || "הסוכן מחפש עבורך...",
    reply,
    products: products.map(formatAgentProduct),
    quickReplies: QUICK_REPLIES,
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

function isFollowUpOnly(message) {
  const text = message.toLowerCase().trim();
  return /^(only|just|more|give me more|show me more|another|cheaper|black|white|logitech|baseus|ugreen|anker|עוד|רק|יותר זול|זול|שחור|לבן|ממותג|ממותגים|עדכן תקציב|תן לי עוד)/.test(text) ||
    /^(רק\s|only\s)/.test(text);
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
  return "";
}

function extractBrand(text) {
  const brands = ["logitech", "baseus", "ugreen", "anker", "toocki", "essager"];
  return brands.find((brand) => new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`, "i").test(text)) || "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = { handleAgentMessage };
