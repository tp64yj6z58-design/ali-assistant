const crypto = require("node:crypto");
const { config } = require("../config");

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function signTopRequest(params, secret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");

  return crypto
    .createHash("md5")
    .update(`${secret}${sorted}${secret}`, "utf8")
    .digest("hex")
    .toUpperCase();
}

function unwrapProducts(payload) {
  const result =
    payload?.aliexpress_affiliate_product_query_response?.resp_result?.result ||
    payload?.resp_result?.result ||
    payload?.result ||
    payload;

  const products =
    result?.products?.product ||
    result?.products ||
    result?.product ||
    result?.items ||
    [];

  return Array.isArray(products) ? products : [products].filter(Boolean);
}

async function searchAliExpressProducts(keywords) {
  const ali = config.aliExpress;
  const params = {
    app_key: ali.appKey,
    method: "aliexpress.affiliate.product.query",
    sign_method: "md5",
    timestamp: formatTimestamp(),
    format: "json",
    v: "2.0",
    keywords,
    tracking_id: ali.trackingId,
    ship_to_country: ali.shipTo,
    target_currency: ali.targetCurrency,
    target_language: ali.targetLanguage,
    page_no: "1",
    page_size: "50",
    sort: "LAST_VOLUME_DESC"
  };

  params.sign = signTopRequest(params, ali.appSecret);

  const url = new URL(ali.endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw new Error(`AliExpress API failed with ${response.status}: ${bodyText.slice(0, 500)}`);
  }

  if (body?.error_response) {
    throw new Error(body.error_response.msg || JSON.stringify(body.error_response));
  }

  return unwrapProducts(body);
}

module.exports = { searchAliExpressProducts, signTopRequest, unwrapProducts };
