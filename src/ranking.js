function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const match = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRating(value) {
  const rating = toNumber(value);
  if (!rating) return 0;
  return rating > 5 ? Math.round((rating / 20) * 10) / 10 : rating;
}

function normalizeProducts(rawProducts) {
  return rawProducts.map((product) => ({
    id: String(product.product_id || product.itemId || product.id || ""),
    title: product.localized_title || product.product_title || product.title || product.name || "AliExpress product",
    searchTitle: product.product_title || product.title || product.name || product.localized_title || "AliExpress product",
    imageUrl: product.product_main_image_url || product.imageUrl || product.image || "",
    productUrl: product.localized_promotion_link || product.promotion_link || product.product_detail_url || product.url || "",
    price: toNumber(product.target_sale_price || product.sale_price || product.price),
    originalPrice: toNumber(product.target_original_price || product.original_price),
    currency: product.target_sale_price_currency || product.currency || "",
    rating: normalizeRating(product.evaluate_rate || product.rating),
    orders: toNumber(product.lastest_volume || product.orders || product.sales),
    discount: toNumber(product.discount || product.discount_rate),
    shipping: product.ship_to_days || product.shipping || "",
    raw: product
  }));
}

function termAppears(title, term) {
  const normalizedTitle = String(title)
    .toLowerCase()
    .replace(/powerbank/g, "power bank")
    .replace(/screenprotector/g, "screen protector")
    .replace(/watchband/g, "watch band");
  const words = String(term).toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?([^a-z0-9]|$)`, "i");
    return pattern.test(normalizedTitle);
  });
}

function relevanceScore(product, profile = {}) {
  const title = (product.searchTitle || product.title).toLowerCase();
  const requiredTerms = profile.requiredTerms || [];
  const excludedTerms = profile.excludedTerms || [];

  if (excludedTerms.some((term) => termAppears(title, term))) return -25;
  if (!requiredTerms.length) return 0;

  const matched = requiredTerms.filter((term) => termAppears(title, term)).length;
  const ratio = matched / requiredTerms.length;
  if (ratio === 0) return -18;
  if (ratio < 0.5) return -8;
  return Math.round(ratio * 28);
}

function scoreProduct(product, preferences = {}) {
  const ratingScore = clamp(product.rating / 5, 0, 1) * 34;
  const ordersScore = clamp(Math.log10(product.orders + 1) / 4, 0, 1) * 22;
  const discountScore = clamp(product.discount / 70, 0, 1) * 10;
  const priceScore = product.price > 0 ? clamp(1 - Math.log10(product.price + 1) / 3, 0, 1) * 18 : 6;
  const dataScore = [product.title, product.imageUrl, product.productUrl, product.price, product.rating]
    .filter(Boolean).length * 2;

  let preferenceBoost = 0;
  if (preferences.wantsCheap) preferenceBoost += priceScore * 0.2;
  if (preferences.wantsQuality) preferenceBoost += ratingScore * 0.15;
  if (preferences.wantsFastShipping && product.shipping) preferenceBoost += 4;

  return Math.round(ratingScore + ordersScore + discountScore + priceScore + dataScore + preferenceBoost);
}

function explainChoice(product, language = "he") {
  if (language === "en") {
    const reasons = [];
    if (product.rating) reasons.push(`Rating ${product.rating}/5`);
    if (product.orders) reasons.push(`${product.orders.toLocaleString("en-US")} orders`);
    if (product.discount) reasons.push(`${product.discount}% discount`);
    if (product.price) reasons.push(`Price ${product.price} ${product.currency}`.trim());
    if (!reasons.length) reasons.push("Product data available for a first comparison");
    return reasons.slice(0, 4);
  }

  const reasons = [];
  if (product.rating) reasons.push(`דירוג ${product.rating}/5`);
  if (product.orders) reasons.push(`${product.orders.toLocaleString("he-IL")} הזמנות`);
  if (product.discount) reasons.push(`${product.discount}% הנחה`);
  if (product.price) reasons.push(`מחיר ${product.price} ${product.currency}`.trim());
  if (!reasons.length) reasons.push("נתוני מוצר זמינים להשוואה ראשונית");
  return reasons.slice(0, 4);
}

function uniqueRankedProducts(products) {
  const seen = new Set();
  const unique = [];

  for (const product of products) {
    const titleKey = product.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
    const idKey = product.id ? `id:${product.id}` : "";
    if ((idKey && seen.has(idKey)) || seen.has(`title:${titleKey}`)) continue;
    if (idKey) seen.add(idKey);
    seen.add(`title:${titleKey}`);
    unique.push(product);
  }

  return unique;
}

function pickTopProducts(rawProducts, preferences, profile = {}, language = "he") {
  const requiresRelevantMatch = Boolean(profile.requiredTerms && profile.requiredTerms.length);

  const ranked = normalizeProducts(rawProducts)
    .filter((product) => product.title && product.productUrl && product.imageUrl)
    .map((product) => ({
      ...product,
      relevance: relevanceScore(product, profile),
      score: scoreProduct(product, preferences) + relevanceScore(product, profile),
      reasons: explainChoice(product, language)
    }))
    .filter((product) => requiresRelevantMatch ? product.relevance > 0 : product.relevance > -18)
    .sort((a, b) => b.score - a.score);

  return uniqueRankedProducts(ranked).slice(0, 3);
}

module.exports = { normalizeProducts, pickTopProducts, scoreProduct };
