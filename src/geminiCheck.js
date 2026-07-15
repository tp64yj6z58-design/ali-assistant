const assert = require("node:assert/strict");
const { config } = require("./config");
const { analyzeIntentWithGemini, verifyGeminiInitialization } = require("./providers/geminiProvider");

async function main() {
  const init = await verifyGeminiInitialization();
  assert.equal(Boolean(config.gemini.apiKey), true, "GEMINI_API_KEY is not loaded");
  assert.equal(init.configured, true, "Gemini is not configured");
  assert.equal(init.urlReady, true, "Gemini generateContent URL is not ready");
  assert.equal(init.canGenerate, true, "No Gemini generateContent models are available for this key");

  const result = await analyzeIntentWithGemini({
    query: "מטען מהיר לרכב usb c",
    language: "he",
    fallbackIntent: "car charger usb c",
    fallbackCategory: "car",
    fallbackTerms: ["car", "charger"],
    fallbackAlternatives: ["usb c car charger", "fast car charger"]
  });

  if (result) {
    assert.equal(typeof result.intent, "string", "Gemini response is missing intent");
    assert.equal(Array.isArray(result.alternatives), true, "Gemini response is missing alternatives");
  }

  console.log(result ? "Gemini checks passed." : "Gemini initialized; live generation is temporarily unavailable.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
