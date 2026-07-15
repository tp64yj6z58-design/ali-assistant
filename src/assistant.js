const { hasAliExpressCredentials } = require("./config");
const { buildSearchAttempts, buildSearchProfile, inferPreferences, normalizeQuery } = require("./query");
const { pickTopProducts } = require("./ranking");
const { searchAliExpressProducts } = require("./providers/aliexpressProvider");
const { searchMockProducts } = require("./providers/mockProvider");
const {
  analyzeShoppingIntent,
  buildNoExactMatchResult,
  createClarificationResult,
  enrichRecommendationResult
} = require("./aiAssistantCore");

const CACHE_TTL_MS = 1000 * 60 * 20;
const cache = new Map();

const text = {
  missingQuery: "\u05e6\u05e8\u05d9\u05da \u05dc\u05db\u05ea\u05d5\u05d1 \u05d0\u05d9\u05d6\u05d4 \u05de\u05d5\u05e6\u05e8 \u05de\u05d7\u05e4\u05e9\u05d9\u05dd.",
  noProductsPrefix: "\u05dc\u05d0 \u05de\u05e6\u05d0\u05ea\u05d9 \u05db\u05e8\u05d2\u05e2 \u05de\u05d5\u05e6\u05e8\u05d9\u05dd \u05de\u05e1\u05e4\u05d9\u05e7 \u05e8\u05dc\u05d5\u05d5\u05e0\u05d8\u05d9\u05d9\u05dd \u05e2\u05d1\u05d5\u05e8",
  noProductsSuffix: "\u05db\u05d3\u05d0\u05d9 \u05dc\u05e0\u05e1\u05d5\u05ea \u05e0\u05d9\u05e1\u05d5\u05d7 \u05d9\u05d5\u05ea\u05e8 \u05e1\u05e4\u05e6\u05d9\u05e4\u05d9.",
  demoIntro: "\u05db\u05e8\u05d2\u05e2 \u05d6\u05d4 \u05e2\u05d5\u05d1\u05d3 \u05d1\u05de\u05e6\u05d1 \u05d3\u05de\u05d5 \u05e2\u05d3 \u05e9\u05e0\u05db\u05e0\u05d9\u05e1 \u05de\u05e4\u05ea\u05d7\u05d5\u05ea AliExpress \u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd.",
  found: "\u05de\u05e6\u05d0\u05ea\u05d9",
  oneOption: "\u05d0\u05e4\u05e9\u05e8\u05d5\u05ea \u05d7\u05d6\u05e7\u05d4",
  manyOptions: "\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05d7\u05d6\u05e7\u05d5\u05ea",
  byData: "\u05dc\u05e4\u05d9 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d4\u05d6\u05de\u05d9\u05e0\u05d9\u05dd \u05db\u05e8\u05d2\u05e2.",
  price: "\u05de\u05d7\u05d9\u05e8",
  unavailable: "\u05dc\u05d0 \u05d6\u05de\u05d9\u05df",
  why: "\u05dc\u05de\u05d4 \u05e0\u05d1\u05d7\u05e8",
  link: "\u05e7\u05d9\u05e9\u05d5\u05e8"
};

async function recommendProducts(userInput, options = {}) {
  const query = normalizeQuery(userInput);
  if (!query) {
    const error = new Error(text.missingQuery);
    error.statusCode = 400;
    throw error;
  }

  const intent = await analyzeShoppingIntent(query);
  const allowClarification = options.allowClarification !== false;
  if (intent.clarification && allowClarification) return createClarificationResult(query, intent);

  const profile = intent.profile || buildSearchProfile(query);
  const cacheKey = `${intent.language}:${profile.requiredTerms.join("|")}:${profile.keywords}:${query}`.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const keywords = profile.keywords;
  const attempts = intent.attempts && intent.attempts.length ? intent.attempts : buildSearchAttempts(profile);
  const preferences = intent.preferences || inferPreferences(query);
  const language = intent.language || detectLanguage(query);
  const clarification = buildClarification(query, profile, language);
  if (clarification && allowClarification) return clarification;

  const source = hasAliExpressCredentials() ? "aliexpress" : "demo";

  const rawProducts = source === "aliexpress"
    ? await searchAliExpressAttempts(attempts, language, profile)
    : searchMockProducts(keywords);

  const products = pickTopProducts(rawProducts, preferences, profile, language);
  const recommendedProducts = products.length < 3
    ? await findAlternativeProducts(intent, source, language, products)
    : products;
  const confidence = buildResultConfidence(recommendedProducts, rawProducts.length, profile);
  const refinements = intent.alternatives?.length ? intent.alternatives : buildRefinementOptions(query, profile, language);
  const lowConfidence = Boolean(profile.requiredTerms.length && confidence < 62);
  const exactMatchUnavailable = !products.length && recommendedProducts.length > 0;

  if (lowConfidence && !recommendedProducts.length) {
    const noExact = buildNoExactMatchResult(query, intent, rawProducts.length, source);
    setCached(cacheKey, noExact);
    return noExact;
  }

  const result = {
    query,
    keywords,
    attempts,
    language,
    source,
    scannedCount: rawProducts.length,
    confidence,
    lowConfidence,
    exactMatchUnavailable,
    refinementOptions: lowConfidence ? refinements : [],
    assistantSummary: buildAssistantSummary(rawProducts.length, recommendedProducts, language),
    products: recommendedProducts,
    message: buildMessage(query, recommendedProducts, source, language)
  };

  const enriched = enrichRecommendationResult(result, intent, result.products);
  setCached(cacheKey, enriched);
  return enriched;
}

async function findAlternativeProducts(intent, source, language, existingProducts = []) {
  if (existingProducts.length >= 3 || !intent.alternatives?.length) return existingProducts;
  if (source !== "aliexpress") return existingProducts;

  const seen = new Set(existingProducts.map((product) => product.id || product.title));
  const combined = [...existingProducts];

  for (const alternative of intent.alternatives.slice(0, 3)) {
    const alternativeProfile = buildSearchProfile(alternative);
    const raw = await searchAliExpressAttempts(buildSearchAttempts(alternativeProfile).slice(0, 4), language, alternativeProfile);
    const picked = pickTopProducts(raw, intent.preferences || {}, alternativeProfile, language);
    for (const product of picked) {
      const key = product.id || product.title;
      if (seen.has(key)) continue;
      product.isAlternative = true;
      combined.push(product);
      seen.add(key);
      if (combined.length >= 3) return combined;
    }
  }

  return combined;
}

function buildClarification(query, profile, language = "he") {
  const terms = profile.requiredTerms || [];
  const hasOnly = (...values) => terms.length && terms.every((term) => values.includes(term));

  if (hasOnly("charger")) {
    return createClarification(query, language, {
      he: {
        question: "איזה סוג מטען אתה מחפש?",
        options: ["מטען לרכב", "מטען קיר", "מטען אלחוטי", "כבל טעינה"]
      },
      en: {
        question: "Which charger type are you looking for?",
        options: ["car charger", "wall charger", "wireless charger", "charging cable"]
      }
    });
  }

  if (hasOnly("camera")) {
    return createClarification(query, language, {
      he: {
        question: "איזה סוג מצלמה אתה מחפש?",
        options: ["מצלמת אבטחה", "מצלמת רכב", "מצלמת רחפן", "מצלמת ילדים"]
      },
      en: {
        question: "Which camera type are you looking for?",
        options: ["security camera", "dash camera", "drone camera", "kids camera"]
      }
    });
  }

  if (hasOnly("case", "cover")) {
    return createClarification(query, language, {
      he: {
        question: "לאיזה מכשיר צריך כיסוי?",
        options: ["כיסוי לאייפון", "כיסוי לסמסונג", "כיסוי לאוזניות", "כיסוי לטאבלט"]
      },
      en: {
        question: "What device needs a case?",
        options: ["iPhone case", "Samsung case", "earbuds case", "tablet case"]
      }
    });
  }

  if (hasOnly("bag")) {
    return createClarification(query, language, {
      he: {
        question: "איזה סוג תיק אתה מחפש?",
        options: ["תיק גב", "תיק למחשב נייד", "תיק נסיעות", "תיק צד"]
      },
      en: {
        question: "Which bag type are you looking for?",
        options: ["backpack", "laptop bag", "travel bag", "shoulder bag"]
      }
    });
  }

  if (hasOnly("lamp") || hasOnly("light")) {
    return createClarification(query, language, {
      he: {
        question: "איזו תאורה אתה מחפש?",
        options: ["מנורת שולחן לד", "מנורת לילה", "פנס ראש", "תאורת לד לחדר"]
      },
      en: {
        question: "Which light type are you looking for?",
        options: ["desk lamp", "night light", "headlamp", "led room lights"]
      }
    });
  }

  if (hasOnly("watch")) {
    return createClarification(query, language, {
      he: {
        question: "אתה מחפש שעון או רצועה לשעון?",
        options: ["שעון חכם", "רצועה לשעון", "שעון ספורט", "שעון ילדים"]
      },
      en: {
        question: "Are you looking for a watch or a watch band?",
        options: ["smart watch", "watch band", "sport watch", "kids watch"]
      }
    });
  }

  if (hasOnly("holder", "stand") || hasOnly("holder")) {
    return createClarification(query, language, {
      he: {
        question: "מחזיק למה?",
        options: ["מחזיק מפתחות", "מעמד לטלפון לרכב", "מעמד למחשב נייד", "מחזיק כבלים"]
      },
      en: {
        question: "What should the holder be for?",
        options: ["keychain", "car phone holder", "laptop stand", "cable holder"]
      }
    });
  }

  return null;
}

function createClarification(query, language, copy) {
  const selected = copy[language] || copy.he;
  return {
    query,
    keywords: "",
    attempts: [],
    language,
    source: "assistant",
    scannedCount: 0,
    needsClarification: true,
    clarificationQuestion: selected.question,
    clarificationOptions: selected.options,
    assistantSummary: language === "en"
      ? "I need one detail so I can avoid unrelated products."
      : "אני צריך עוד פרט אחד כדי לא להחזיר מוצרים לא קשורים.",
    products: [],
    message: selected.question
  };
}

async function searchAliExpressAttempts(attempts, language = "he", profile = {}) {
  if (language === "he") return searchAliExpressHebrewAttempts(attempts, profile);

  const allProducts = [];
  const seen = new Set();

  const batches = await mapWithConcurrency(attempts, 3, (attempt) => searchAliExpressProducts(attempt, { targetLanguage: "EN" }));
  for (const products of batches) {
    for (const product of products) addUniqueProduct(allProducts, seen, product);
  }

  return allProducts;
}

async function searchAliExpressHebrewAttempts(attempts, profile = {}) {
  const englishProducts = [];
  const hebrewById = new Map();
  const seen = new Set();
  const englishAttempts = attempts.filter((attempt) => !/[\u0590-\u05ff]/.test(attempt));

  if (!profile.hasKnownTranslation || !englishAttempts.length) {
    return searchDirectHebrewAttempts(attempts);
  }

  const batches = await mapWithConcurrency(englishAttempts, 3, (attempt) => Promise.all([
      searchAliExpressProducts(attempt, { targetLanguage: "EN" }),
      searchAliExpressProducts(attempt, { targetLanguage: "HE" })
    ]));

  for (const batch of batches) {
    const [englishResults = [], hebrewResults = []] = Array.isArray(batch[0]) ? batch : [[], []];
    for (const product of hebrewResults) {
      const id = String(product.product_id || product.itemId || product.id || "");
      if (id) hebrewById.set(id, product);
    }

    for (const product of englishResults) {
      const id = String(product.product_id || product.itemId || product.id || "");
      const key = id || String(product.product_title || product.title || "");
      const hebrewProduct = id ? hebrewById.get(id) : null;
      addUniqueProduct(englishProducts, seen, hebrewProduct ? mergeLocalizedProduct(product, hebrewProduct) : product);
    }
  }

  return englishProducts;
}

async function searchDirectHebrewAttempts(attempts) {
  const allProducts = [];
  const seen = new Set();

  const batches = await mapWithConcurrency(attempts, 3, (attempt) => searchAliExpressProducts(attempt, { targetLanguage: "HE" }));
  for (const products of batches) {
    for (const product of products) addUniqueProduct(allProducts, seen, product);
  }

  return allProducts;
}

function addUniqueProduct(list, seen, product) {
  const key = String(product.product_id || product.itemId || product.id || product.product_title || product.title || "");
  if (key && seen.has(key)) return;
  if (key) seen.add(key);
  list.push(product);
}

async function mapWithConcurrency(values, limit, task) {
  const results = new Array(values.length);
  let index = 0;

  async function worker() {
    while (index < values.length) {
      const current = index;
      index += 1;
      try {
        results[current] = await task(values[current]);
      } catch (error) {
        console.warn("Search attempt failed", values[current], error.message);
        results[current] = [];
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function mergeLocalizedProduct(baseProduct, localizedProduct) {
  return {
    ...baseProduct,
    localized_title: localizedProduct.product_title || localizedProduct.title || "",
    localized_promotion_link: localizedProduct.promotion_link || localizedProduct.product_detail_url || "",
    localized_product_detail_url: localizedProduct.product_detail_url || ""
  };
}

function detectLanguage(input) {
  return /[\u0590-\u05ff]/.test(String(input || "")) ? "he" : "en";
}

function buildMessage(query, products, source, language = "he") {
  if (language === "en") return buildEnglishMessage(query, products, source);
  return buildHebrewMessage(query, products, source);
}

function buildAssistantSummary(scannedCount, products, language = "he") {
  if (!products.length) {
    return language === "en"
      ? `I checked the available matching products, but did not find 3 options strong enough to recommend.`
      : `בדקתי את המוצרים הזמינים שמתאימים לחיפוש, אבל לא מצאתי 3 אפשרויות מספיק חזקות להמלצה.`;
  }

  return language === "en"
    ? `I checked ${scannedCount} similar products and selected the ${products.length} strongest options by relevance, price, rating and order volume.`
    : `בדקתי ${scannedCount} מוצרים דומים ובחרתי את ${products.length} האפשרויות החזקות ביותר לפי רלוונטיות, מחיר, דירוג וכמות הזמנות.`;
}

function buildEnglishMessage(query, products, source) {
  if (!products.length) {
    return `I could not find strong enough products for "${query}". Try a more specific search.`;
  }

  const intro = source === "demo"
    ? "Demo mode is active until real AliExpress keys are connected."
    : `Found ${products.length} strong ${products.length === 1 ? "option" : "options"} based on the available data.`;

  const lines = products.map((product, index) => {
    const price = product.price ? `Price: ${product.price} ${product.currency}`.trim() : "Price: unavailable";
    return `${index + 1}. ${product.title}\n${price}\nWhy: ${product.reasons.join(", ")}\nLink: ${product.productUrl}`;
  });

  return `${intro}\n\n${lines.join("\n\n")}`;
}

function buildHebrewMessage(query, products, source) {
  if (!products.length) {
    return `${text.noProductsPrefix} "${query}". ${text.noProductsSuffix}`;
  }

  const intro = source === "demo"
    ? text.demoIntro
    : `${text.found} ${products.length} ${products.length === 1 ? text.oneOption : text.manyOptions} ${text.byData}`;

  const lines = products.map((product, index) => {
    const price = product.price ? `${text.price}: ${product.price} ${product.currency}`.trim() : `${text.price}: ${text.unavailable}`;
    return `${index + 1}. ${product.title}\n${price}\n${text.why}: ${product.reasons.join(", ")}\n${text.link}: ${product.productUrl}`;
  });

  return `${intro}\n\n${lines.join("\n\n")}`;
}

function buildResultConfidence(products, scannedCount, profile = {}) {
  if (!products.length) return scannedCount ? 35 : 0;
  const average = products.reduce((sum, product) => sum + (product.confidence || 0), 0) / products.length;
  const coverage = products.length >= 3 ? 8 : products.length * 2;
  const knownBoost = profile.requiredTerms && profile.requiredTerms.length ? 5 : 0;
  return Math.min(100, Math.round(average + coverage + knownBoost));
}

function buildRefinementOptions(query, profile = {}, language = "he") {
  const terms = profile.requiredTerms || [];
  const original = query.trim();
  if (language === "en") {
    return [
      `${original} best rated`,
      `${original} with many orders`,
      `${original} official store`
    ];
  }

  if (terms.includes("charger")) return ["מטען לרכב USB-C", "מטען קיר מהיר", "מטען נייד 20000mAh", "מטען אלחוטי"];
  if (terms.includes("camera")) return ["מצלמת אבטחה לבית", "מצלמה לרכב", "מצלמת רשת למחשב", "מצלמת ילדים"];
  if (terms.includes("case") || terms.includes("cover")) return ["כיסוי לאייפון", "כיסוי לסמסונג", "מגן מסך לאייפון", "כיסוי לטאבלט"];
  if (terms.includes("bag")) return ["תיק גב לבית ספר", "תיק למחשב נייד", "תיק נסיעות", "תיק צד"];
  if (terms.includes("lamp") || terms.includes("light")) return ["מנורת שולחן לד", "מנורת לילה", "פנס ראש", "תאורת לד לחדר"];

  return [
    `${original} עם דירוג גבוה`,
    `${original} הכי נמכר`,
    `${original} איכותי`,
    `${original} מקורי`
  ];
}

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return { ...item.value, cached: true };
}

function setCached(key, value) {
  cache.set(key, { createdAt: Date.now(), value });
  if (cache.size > 250) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

module.exports = { recommendProducts, buildAssistantSummary, buildHebrewMessage, buildEnglishMessage, detectLanguage, searchAliExpressAttempts };
