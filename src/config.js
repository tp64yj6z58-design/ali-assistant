const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const config = {
  port: Number(process.env.PORT || 3000),
  aliExpress: {
    appKey: process.env.ALIEXPRESS_APP_KEY || "",
    appSecret: process.env.ALIEXPRESS_APP_SECRET || "",
    trackingId: process.env.ALIEXPRESS_TRACKING_ID || "",
    shipTo: process.env.ALIEXPRESS_SHIP_TO || "IL",
    targetCurrency: process.env.ALIEXPRESS_TARGET_CURRENCY || "ILS",
    targetLanguage: process.env.ALIEXPRESS_TARGET_LANGUAGE || "EN",
    endpoint: process.env.ALIEXPRESS_ENDPOINT || "https://api-sg.aliexpress.com/sync"
  }
};

function hasAliExpressCredentials() {
  return Boolean(
    config.aliExpress.appKey &&
      config.aliExpress.appSecret &&
      config.aliExpress.trackingId
  );
}

module.exports = { config, hasAliExpressCredentials };
