const { config } = require("../config");

const GEMINI_TIMEOUT_MS = 7000;
const MODEL_FALLBACKS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-3.5-flash"
];

function hasGeminiCredentials() {
  return Boolean(config.gemini?.apiKey);
}

function buildGeminiUrl(modelOverride) {
  const endpoint = config.gemini.endpoint.replace(/\/$/, "");
  const modelName = String(modelOverride || config.gemini.model || "gemini-3.1-flash-lite").replace(/^models\//, "");
  const model = encodeURIComponent(modelName);
  return `${endpoint}/models/${model}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`;
}

async function analyzeIntentWithGemini(payload) {
  if (!hasGeminiCredentials()) return null;

  const models = unique([config.gemini.model, ...MODEL_FALLBACKS]);
  for (const model of models) {
    const result = await callGeminiModel(model, payload);
    if (result) return result;
  }

  return null;
}

async function callGeminiModel(model, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(buildGeminiUrl(model), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              "You are an ecommerce shopping intent parser for an AliExpress affiliate assistant.",
              "Return JSON only.",
              "Never include markdown.",
              "Schema: {\"intent\":\"string\",\"category\":\"string\",\"confidence\":0-100,\"alternatives\":[\"string\"],\"explanation\":\"string\",\"clarification\":null|{\"question\":\"string\",\"options\":[\"string\"]}}.",
              "If the user request is vague, ask one practical clarification question.",
              "If the user mixes Hebrew and English, keep the user's primary language."
            ].join(" ")
          }]
        },
        contents: [{
          role: "user",
          parts: [{ text: JSON.stringify(payload) }]
        }],
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) return null;
    const body = await response.json();
    const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    return text ? normalizeGeminiIntent(JSON.parse(text)) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyGeminiInitialization() {
  const availableModels = await listGeminiModels().catch(() => []);
  return {
    configured: hasGeminiCredentials(),
    model: config.gemini.model,
    endpoint: config.gemini.endpoint,
    urlReady: hasGeminiCredentials() && buildGeminiUrl().includes(":generateContent"),
    availableModels,
    canGenerate: availableModels.length > 0
  };
}

async function listGeminiModels() {
  if (!hasGeminiCredentials()) return [];
  const endpoint = config.gemini.endpoint.replace(/\/$/, "");
  const url = `${endpoint}/models?key=${encodeURIComponent(config.gemini.apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const body = await response.json();
  return (body.models || [])
    .filter((model) => (model.supportedGenerationMethods || []).includes("generateContent"))
    .map((model) => String(model.name || "").replace(/^models\//, ""))
    .filter(Boolean);
}

function normalizeGeminiIntent(value) {
  if (!value || typeof value !== "object") return null;
  if (!value.intent || typeof value.intent !== "string") return null;

  const clarification = value.clarification && typeof value.clarification === "object"
    ? {
        question: String(value.clarification.question || ""),
        options: Array.isArray(value.clarification.options)
          ? value.clarification.options.map(String).filter(Boolean).slice(0, 4)
          : []
      }
    : null;

  return {
    intent: value.intent,
    category: typeof value.category === "string" ? value.category : "",
    confidence: Number(value.confidence || 0),
    alternatives: Array.isArray(value.alternatives) ? value.alternatives.map(String).filter(Boolean).slice(0, 6) : [],
    explanation: typeof value.explanation === "string" ? value.explanation : "",
    clarification: clarification && clarification.question ? clarification : null
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  analyzeIntentWithGemini,
  hasGeminiCredentials,
  listGeminiModels,
  verifyGeminiInitialization
};
