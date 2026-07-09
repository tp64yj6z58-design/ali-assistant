const { hasAliExpressCredentials } = require("./config");
const { buildSearchAttempts, buildSearchProfile, inferPreferences, normalizeQuery } = require("./query");
const { pickTopProducts } = require("./ranking");
const { searchAliExpressProducts } = require("./providers/aliexpressProvider");
const { searchMockProducts } = require("./providers/mockProvider");

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

async function recommendProducts(userInput) {
  const query = normalizeQuery(userInput);
  if (!query) {
    const error = new Error(text.missingQuery);
    error.statusCode = 400;
    throw error;
  }

  const profile = buildSearchProfile(query);
  const keywords = profile.keywords;
  const attempts = buildSearchAttempts(profile);
  const preferences = inferPreferences(query);
  const language = detectLanguage(query);
  const source = hasAliExpressCredentials() ? "aliexpress" : "demo";

  const rawProducts = source === "aliexpress"
    ? await searchAliExpressAttempts(attempts, language)
    : searchMockProducts(keywords);

  const products = pickTopProducts(rawProducts, preferences, profile, language);

  return {
    query,
    keywords,
    attempts,
    language,
    source,
    scannedCount: rawProducts.length,
    assistantSummary: buildAssistantSummary(rawProducts.length, products, language),
    products,
    message: buildMessage(query, products, source, language)
  };
}

async function searchAliExpressAttempts(attempts, language = "he") {
  if (language === "he") return searchAliExpressHebrewAttempts(attempts);

  const allProducts = [];
  const seen = new Set();

  for (const attempt of attempts) {
    const products = await searchAliExpressProducts(attempt, { targetLanguage: "EN" });
    for (const product of products) {
      const key = String(product.product_id || product.itemId || product.id || product.product_title || product.title || "");
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      allProducts.push(product);
    }
  }

  return allProducts;
}

async function searchAliExpressHebrewAttempts(attempts) {
  const englishProducts = [];
  const hebrewById = new Map();
  const seen = new Set();
  const englishAttempts = attempts.filter((attempt) => !/[\u0590-\u05ff]/.test(attempt));

  for (const attempt of englishAttempts) {
    const [englishResults, hebrewResults] = await Promise.all([
      searchAliExpressProducts(attempt, { targetLanguage: "EN" }),
      searchAliExpressProducts(attempt, { targetLanguage: "HE" })
    ]);

    for (const product of hebrewResults) {
      const id = String(product.product_id || product.itemId || product.id || "");
      if (id) hebrewById.set(id, product);
    }

    for (const product of englishResults) {
      const id = String(product.product_id || product.itemId || product.id || "");
      const key = id || String(product.product_title || product.title || "");
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);

      const hebrewProduct = id ? hebrewById.get(id) : null;
      englishProducts.push(hebrewProduct ? mergeLocalizedProduct(product, hebrewProduct) : product);
    }
  }

  return englishProducts;
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

module.exports = { recommendProducts, buildAssistantSummary, buildHebrewMessage, buildEnglishMessage, detectLanguage, searchAliExpressAttempts };
