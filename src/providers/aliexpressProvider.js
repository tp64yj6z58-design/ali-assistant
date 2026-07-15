const crypto = require("node:crypto");
const { config } = require("../config");

const DEFAULT_TIMEOUT_MS = 8500;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

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

async function searchAliExpressProducts(keywords, options = {}) {
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
    target_language: options.targetLanguage || ali.targetLanguage,
    page_no: "1",
    page_size: "50",
    sort: "LAST_VOLUME_DESC"
  };

  params.sign = signTopRequest(params, ali.appSecret);

  const url = new URL(ali.endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const { response, bodyText } = await fetchWithRetry(url);

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!response.ok) {
    throw createProviderError(`AliExpress API failed with ${response.status}`, response.status);
  }

  if (body?.error_response) {
    const message = body.error_response.msg || body.error_response.sub_msg || "AliExpress API error";
    throw createProviderError(message, 502);
  }

  return unwrapProducts(body);
}

async function fetchWithRetry(url, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Accept": "application/json"
      }
    });
    const bodyText = await response.text();

    if (shouldRetry(response.status, bodyText) && attempt < MAX_RETRIES) {
      await wait(backoffMs(attempt));
      return fetchWithRetry(url, attempt + 1);
    }

    return { response, bodyText };
  } catch (error) {
    if (attempt < MAX_RETRIES && isRetryableFetchError(error)) {
      await wait(backoffMs(attempt));
      return fetchWithRetry(url, attempt + 1);
    }
    throw createProviderError(error.name === "AbortError" ? "AliExpress request timed out" : error.message, 504);
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetry(status, bodyText) {
  if (RETRYABLE_STATUS.has(status)) return true;
  return /frequency|timeout|temporarily|busy|rate/i.test(bodyText || "");
}

function isRetryableFetchError(error) {
  return error.name === "AbortError" || /fetch failed|network|socket|timeout/i.test(error.message || "");
}

function backoffMs(attempt) {
  return 450 * (attempt + 1) + Math.floor(Math.random() * 250);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createProviderError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.provider = "aliexpress";
  return error;
}

module.exports = { searchAliExpressProducts, signTopRequest, unwrapProducts };
