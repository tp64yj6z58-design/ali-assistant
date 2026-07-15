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

async function planAgentMessageWithGemini(payload) {
  if (!hasGeminiCredentials()) return null;

  const models = unique([config.gemini.model, ...MODEL_FALLBACKS]);
  for (const model of models) {
    const result = await callGeminiModel(model, payload, [
      "You are the brain of a floating conversational AliExpress shopping assistant.",
      "You do not search products directly. You decide what the existing search engine should search.",
      "Return JSON only. Never include markdown.",
      "Schema: {\"action\":\"clarify|search|refine|more|chat\",\"language\":\"he|en\",\"reply\":\"string\",\"searchQuery\":\"string\",\"product\":\"string\",\"category\":\"string\",\"budget\":number|null,\"filters\":{\"color\":\"string\",\"brand\":\"string\",\"wantsCheap\":boolean,\"wantsReviews\":boolean,\"wantsBranded\":boolean},\"alternatives\":[\"string\"],\"quickReplies\":[\"string\"],\"confidence\":0-100}.",
      "Ask one short clarification question if the product is vague, incomplete, or could mean several product types.",
      "For follow-up messages, update the previous conversation context instead of starting over.",
      "If the user asks for more options, action must be more.",
      "If enough detail exists, action must be search or refine and searchQuery must be a concise AliExpress query in English unless the user specifically needs Hebrew output.",
      "Keep reply natural and practical, in the user's primary language."
    ].join(" "));
    if (result) return normalizeAgentPlan(result);
  }

  return null;
}

async function composeAgentResponseWithGemini(payload) {
  if (!hasGeminiCredentials()) return null;

  const models = unique([config.gemini.model, ...MODEL_FALLBACKS]);
  for (const model of models) {
    const result = await callGeminiModel(model, payload, [
      "You are a helpful shopping expert inside a floating AliExpress assistant.",
      "Return JSON only. Never include markdown.",
      "Schema: {\"reply\":\"string\",\"quickReplies\":[\"string\"]}.",
      "Explain why the products fit the user's request. Be concise, natural and trustworthy.",
      "Do not claim you searched an exact number unless a scannedCount value is provided.",
      "Never say no products found. If products are weak or alternatives, explain the closest useful direction.",
      "Keep the response in the user's primary language."
    ].join(" "));
    if (result && typeof result.reply === "string") {
      return {
        reply: result.reply,
        quickReplies: Array.isArray(result.quickReplies) ? result.quickReplies.map(String).filter(Boolean).slice(0, 5) : []
      };
    }
  }

  return null;
}

async function callGeminiModel(model, payload, systemText) {
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
            text: systemText || [
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

function normalizeAgentPlan(value) {
  if (!value || typeof value !== "object") return null;
  const action = ["clarify", "search", "refine", "more", "chat"].includes(value.action) ? value.action : "search";
  const filters = value.filters && typeof value.filters === "object" ? value.filters : {};

  return {
    action,
    language: value.language === "en" ? "en" : "he",
    reply: typeof value.reply === "string" ? value.reply : "",
    searchQuery: typeof value.searchQuery === "string" ? value.searchQuery.trim() : "",
    product: typeof value.product === "string" ? value.product.trim() : "",
    category: typeof value.category === "string" ? value.category.trim() : "",
    budget: value.budget === null || value.budget === undefined || value.budget === "" ? null : Number(value.budget),
    filters: {
      color: typeof filters.color === "string" ? filters.color.trim() : "",
      brand: typeof filters.brand === "string" ? filters.brand.trim() : "",
      wantsCheap: Boolean(filters.wantsCheap),
      wantsReviews: Boolean(filters.wantsReviews),
      wantsBranded: Boolean(filters.wantsBranded)
    },
    alternatives: Array.isArray(value.alternatives) ? value.alternatives.map(String).filter(Boolean).slice(0, 6) : [],
    quickReplies: Array.isArray(value.quickReplies) ? value.quickReplies.map(String).filter(Boolean).slice(0, 5) : [],
    confidence: Number(value.confidence || 0)
  };
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
  planAgentMessageWithGemini,
  composeAgentResponseWithGemini,
  verifyGeminiInitialization
};
