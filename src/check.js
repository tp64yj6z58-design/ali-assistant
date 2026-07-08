const assert = require("node:assert/strict");
const { buildSearchKeywords } = require("./query");
const { pickTopProducts } = require("./ranking");
const { signTopRequest } = require("./providers/aliexpressProvider");

const keywords = buildSearchKeywords("אני מחפש מטען מהיר לרכב");
assert.match(keywords, /charger/);
assert.match(keywords, /car/);

const ranked = pickTopProducts([
  { product_title: "Weak", promotion_link: "https://example.com/1", target_sale_price: "10", evaluate_rate: "3.8", lastest_volume: "5" },
  { product_title: "Strong", promotion_link: "https://example.com/2", target_sale_price: "12", evaluate_rate: "4.9", lastest_volume: "2000", discount: "30" },
  { product_title: "Ok", promotion_link: "https://example.com/3", target_sale_price: "8", evaluate_rate: "4.4", lastest_volume: "600" }
], { wantsQuality: true });

assert.equal(ranked.length, 3);
assert.equal(ranked[0].title, "Strong");

const signature = signTopRequest({
  app_key: "123",
  method: "example.method",
  timestamp: "2026-01-01 00:00:00"
}, "secret");
assert.equal(signature.length, 32);

console.log("All checks passed.");
