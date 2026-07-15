const { buildSearchAttempts, buildSearchProfile, inferPreferences, normalizeQuery } = require("./query");
const { analyzeIntentWithGemini, hasGeminiCredentials } = require("./providers/geminiProvider");

const CATEGORY_CLARIFICATIONS = [
  {
    id: "car",
    patterns: [/\bcar\b/i, /\u05dc?\u05e8\u05db\u05d1|\u05d0\u05d5\u05d8\u05d5/],
    blockingTerms: ["charger", "camera", "vacuum", "holder", "inflator", "light"],
    he: {
      question: "מה אתה מחפש לרכב?",
      options: ["מטען מהיר לרכב USB-C", "מצלמת דרך לרכב", "שואב אבק לרכב", "מעמד לטלפון לרכב"]
    },
    en: {
      question: "What do you need for the car?",
      options: ["USB-C car charger", "dash camera", "car vacuum cleaner", "car phone holder"]
    }
  },
  {
    id: "kitchen",
    patterns: [/\bkitchen\b/i, /\u05de\u05d8\u05d1\u05d7/],
    blockingTerms: ["blender", "scale", "juicer", "fryer", "grinder"],
    he: {
      question: "איזה מוצר למטבח אתה מחפש?",
      options: ["בלנדר נייד", "משקל מטבח דיגיטלי", "מסחטת מיצים", "אייר פרייר"]
    },
    en: {
      question: "Which kitchen product are you looking for?",
      options: ["portable blender", "digital kitchen scale", "juice squeezer", "air fryer"]
    }
  },
  {
    id: "pet",
    patterns: [/\bpet\b|\bdog\b|\bcat\b/i, /\u05dc?\u05db\u05dc\u05d1|\u05dc?\u05d7\u05ea\u05d5\u05dc|\u05d7\u05d9\u05d9\u05ea\s*\u05de\u05d7\u05de\u05d3/],
    blockingTerms: ["bed", "toy", "collar", "leash", "bowl", "fountain", "plush"],
    he: {
      question: "לאיזה מוצר לחיית מחמד לכוון?",
      options: ["מיטה לכלב", "צעצוע לכלב", "קולר לכלב", "מזרקת מים לחתול"]
    },
    en: {
      question: "Which pet product should I focus on?",
      options: ["dog bed", "dog toy", "dog collar", "cat water fountain"]
    }
  },
  {
    id: "baby",
    patterns: [/\bbaby\b|\binfant\b/i, /\u05ea\u05d9\u05e0\u05d5\u05e7|\u05dc\u05ea\u05d9\u05e0\u05d5\u05e7/],
    blockingTerms: ["stroller", "toy", "thermometer", "bottle"],
    he: {
      question: "איזה מוצר לתינוק אתה צריך?",
      options: ["עגלה לתינוק", "צעצוע לתינוק", "מדחום לתינוק", "בקבוק לתינוק"]
    },
    en: {
      question: "Which baby product do you need?",
      options: ["baby stroller", "baby toy", "baby thermometer", "baby bottle"]
    }
  },
  {
    id: "computer",
    patterns: [/\bcomputer\b|\blaptop\b|\bpc\b/i, /\u05de\u05d7\u05e9\u05d1|\u05dc\u05e4\u05d8\u05d5\u05e4/],
    blockingTerms: ["stand", "keyboard", "mouse", "webcam", "bag", "hub"],
    he: {
      question: "איזה מוצר למחשב אתה מחפש?",
      options: ["מעמד למחשב נייד", "מקלדת גיימינג", "עכבר אלחוטי", "מפצל USB-C"]
    },
    en: {
      question: "Which computer product are you looking for?",
      options: ["laptop stand", "gaming keyboard", "wireless mouse", "USB-C hub"]
    }
  }
];

const INTENT_ALIASES = [
  {
    id: "gift",
    patterns: [/\bgift\b|\bpresent\b/i, /\u05de\u05ea\u05e0\u05d4|\u05de\u05ea\u05e0\u05d5\u05ea/],
    he: {
      question: "למי המתנה מיועדת?",
      options: ["מתנה לגבר - ארנק איכותי", "מתנה לאישה - תכשיט", "מתנה לילד - צעצוע", "מתנה לרכב - מטען מהיר"]
    },
    en: {
      question: "Who is the gift for?",
      options: ["gift for men wallet", "gift for women jewelry", "gift for kids toy", "car gift fast charger"]
    }
  },
  {
    id: "cheap",
    patterns: [/\bcheap\b|\bbudget\b|\bdeal\b/i, /\u05d6\u05d5\u05dc|\u05de\u05e9\u05ea\u05dc\u05dd|\u05d3\u05d9\u05dc/],
    preference: "budget"
  },
  {
    id: "premium",
    patterns: [/\bbest\b|\bpremium\b|\bquality\b/i, /\u05d4\u05db\u05d9\s*\u05d8\u05d5\u05d1|\u05d0\u05d9\u05db\u05d5\u05ea\u05d9|\u05e4\u05e8\u05d9\u05de\u05d9\u05d5\u05dd/],
    preference: "quality"
  }
];

const PRODUCT_ALIASES = [
  { terms: ["car", "charger"], aliases: ["מטען לרכב", "car charger", "vehicle charger", "מצת לרכב"] },
  { terms: ["wall", "charger"], aliases: ["מטען קיר", "wall charger", "home charger"] },
  { terms: ["power", "bank"], aliases: ["מטען נייד", "סוללה ניידת", "power bank", "portable charger"] },
  { terms: ["cat", "plush"], aliases: ["בובה של חתול", "cat plush", "cat doll", "kitty plush", "חתול פרווה"] },
  { terms: ["keychain"], aliases: ["מחזיק מפתחות", "צרור מפתחות", "keychain", "key ring"] },
  { terms: ["laptop", "stand"], aliases: ["מעמד למחשב נייד", "laptop stand", "notebook stand"] },
  { terms: ["portable", "blender"], aliases: ["בלנדר נייד", "portable blender", "personal blender"] },
  { terms: ["dog", "bed"], aliases: ["מיטה לכלב", "dog bed", "pet dog bed"] },
  { terms: ["air", "fryer"], aliases: ["אייר פרייר", "air fryer", "oil free fryer"] },
  { terms: ["men", "wallet"], aliases: ["ארנק לגבר", "מתנה לגבר ארנק", "men wallet", "gift for men wallet"] },
  { terms: ["women", "jewelry"], aliases: ["תכשיט לאישה", "תכשיטים לאישה", "מתנה לאישה תכשיט", "women jewelry", "gift for women jewelry"] }
];

const KNOWN_BRANDS = [
  "baseus",
  "ugreen",
  "anker",
  "essager",
  "toocki"
];

async function analyzeShoppingIntent(query, options = {}) {
  const normalized = normalizeQuery(query);
  const language = detectLanguageMode(normalized);
  const fallback = analyzeWithRules(normalized, language);

  if (!options.skipLlm && hasGeminiCredentials()) {
    const llm = await analyzeWithGemini(normalized, language, fallback);
    if (llm && llm.intent) return mergeIntent(fallback, llm);
  }

  return fallback;
}

function analyzeWithRules(query, language) {
  const baseProfile = buildSearchProfile(query);
  const matchedAlias = PRODUCT_ALIASES.find((item) => item.aliases.some((alias) => containsPhrase(query, alias)));
  const brands = detectBrands(query);
  const requiredTerms = matchedAlias
    ? unique([...(baseProfile.requiredTerms || []), ...matchedAlias.terms])
    : baseProfile.requiredTerms;

  const productTerms = requiredTerms.filter((term) => !brands.includes(term));
  const profile = productTerms.join("|") === (baseProfile.requiredTerms || []).filter((term) => !brands.includes(term)).join("|")
    ? stripBrandRequirements(baseProfile, brands)
    : buildProfileFromTerms(query, productTerms, baseProfile);

  const category = CATEGORY_CLARIFICATIONS.find((item) => item.patterns.some((pattern) => pattern.test(query)));
  const broadCategoryOnly = category && !category.blockingTerms.some((term) => profile.requiredTerms.includes(term));
  const giftIntent = INTENT_ALIASES.find((item) => item.id === "gift" && item.patterns.some((pattern) => pattern.test(query)));
  const tooVague = isVague(query, profile);
  const clarification = giftIntent || (broadCategoryOnly ? category : null) || (tooVague ? buildGenericClarification(language) : null);

  const preferences = inferPreferences(query);
  for (const alias of INTENT_ALIASES) {
    if (alias.preference && alias.patterns.some((pattern) => pattern.test(query))) {
      if (alias.preference === "budget") preferences.wantsCheap = true;
      if (alias.preference === "quality") preferences.wantsQuality = true;
    }
  }

  return {
    engine: "rules",
    language,
    intent: profile.keywords,
    category: category?.id || inferCategory(profile.requiredTerms),
    brands,
    confidence: profile.requiredTerms.length ? 74 : 38,
    profile,
    preferences,
    attempts: buildAssistantAttempts(profile, query),
    clarification: clarification ? normalizeClarification(clarification, language) : null,
    alternatives: buildAlternativeQueries(query, profile, language),
    explanation: buildIntentExplanation(query, profile, language)
  };
}

function buildProfileFromTerms(query, requiredTerms, baseProfile) {
  const keywords = unique([...requiredTerms, ...(baseProfile.keywords || "").split(/\s+/)]).join(" ");
  const profile = buildSearchProfile(keywords);
  return {
    ...profile,
    original: query,
    keywords,
    requiredTerms: unique([...requiredTerms, ...profile.requiredTerms]).map((term) => term.toLowerCase()),
    excludedTerms: unique([...(baseProfile.excludedTerms || []), ...(profile.excludedTerms || [])]).map((term) => term.toLowerCase()),
    hasKnownTranslation: true
  };
}

function buildAssistantAttempts(profile, query) {
  const brands = detectBrands(query);
  const brandedAttempts = brands.length
    ? buildSearchAttempts(profile).map((attempt) => `${brands[0]} ${attempt}`)
    : [];

  return unique([
    ...brandedAttempts,
    ...buildSearchAttempts(profile),
    ...buildAlternativeQueries(query, profile, "en").slice(0, 4)
  ]).slice(0, 14);
}

function buildAlternativeQueries(query, profile, language = "he") {
  const terms = profile.requiredTerms || [];
  const original = normalizeQuery(query);
  const has = (...values) => values.every((term) => terms.includes(term));

  if (has("cat", "plush")) return ["cat plush toy", "cat stuffed animal", "kitty plush doll", "cute cat doll"];
  if (has("car", "charger")) return ["usb c car charger", "fast car charger", "pd car charger", "multi port car charger"];
  if (has("power", "bank")) return ["10000mah power bank", "20000mah power bank", "fast charging power bank", "portable charger"];
  if (has("portable", "blender")) return ["portable blender", "personal blender", "usb juicer cup", "smoothie blender"];
  if (has("dog", "bed")) return ["dog bed", "pet bed", "washable dog bed", "soft dog bed"];
  if (has("laptop", "stand")) return ["laptop stand", "adjustable laptop stand", "foldable laptop stand", "notebook stand"];
  if (has("air", "fryer")) return ["electric air fryer", "air fryer oven", "oil free fryer", "hot air fryer"];
  if (has("men", "wallet")) return ["men wallet", "slim men wallet", "leather men wallet", "card holder men wallet"];
  if (has("women", "jewelry")) return ["women jewelry", "women necklace", "women bracelet", "fashion jewelry women"];

  return language === "en"
    ? [`${original} best rated`, `${original} high orders`, `${original} quality`, `${original} deal`]
    : [`${original} איכותי`, `${original} הכי נמכר`, `${original} עם דירוג גבוה`, `${original} משתלם`];
}

function createClarificationResult(query, intent) {
  const selected = intent.clarification;
  return {
    query,
    keywords: intent.profile?.keywords || "",
    attempts: [],
    language: intent.language,
    source: "assistant",
    scannedCount: 0,
    needsClarification: true,
    clarificationQuestion: selected.question,
    clarificationOptions: selected.options,
    assistantSummary: intent.language === "en"
      ? "I need one detail so I can search like a shopping assistant, not guess randomly."
      : "אני צריך עוד פרט אחד כדי לכוון למוצר הנכון ולא לנחש.",
    products: [],
    message: selected.question,
    assistantIntent: summarizeIntent(intent)
  };
}

function buildNoExactMatchResult(query, intent, scannedCount, source) {
  const language = intent.language;
  const options = intent.alternatives || buildAlternativeQueries(query, intent.profile, language);
  return {
    query,
    keywords: intent.profile.keywords,
    attempts: intent.attempts,
    language,
    source,
    scannedCount,
    confidence: 0,
    lowConfidence: true,
    exactMatchUnavailable: true,
    refinementOptions: options,
    assistantSummary: language === "en"
      ? "I did not find an exact match strong enough, so I prepared the closest searches that should get better products."
      : "לא מצאתי התאמה מדויקת מספיק, אז הכנתי כיווני חיפוש קרובים שיכולים להביא מוצרים טובים יותר.",
    products: [],
    message: language === "en"
      ? `I could not recommend an exact product for "${query}" yet. Try one of the focused alternatives.`
      : `לא מצאתי כרגע מוצר מדויק מספיק עבור "${query}". כדאי לנסות אחת מהחלופות הממוקדות.`,
    assistantIntent: summarizeIntent(intent)
  };
}

function enrichRecommendationResult(result, intent, visibleProducts) {
  const products = visibleProducts || result.products || [];
  return {
    ...result,
    assistantIntent: summarizeIntent(intent),
    assistantSummary: buildNaturalSummary(result.scannedCount, products, intent, result.language, result.lowConfidence),
    recommendationStrategy: buildRecommendationStrategy(products, intent, result.language),
    refinementOptions: result.lowConfidence ? unique([...(result.refinementOptions || []), ...(intent.alternatives || [])]).slice(0, 4) : result.refinementOptions
  };
}

function buildNaturalSummary(scannedCount, products, intent, language, lowConfidence = false) {
  if (!products.length || lowConfidence) {
    return language === "en"
      ? "I checked the available options, but I only recommend products when the match is strong enough."
      : "בדקתי את האפשרויות הזמינות, אבל אני ממליץ רק כשיש התאמה מספיק חזקה.";
  }

  const category = intent.category ? `${intent.category}` : "product";
  return language === "en"
    ? `I analyzed ${scannedCount} ${category} options and chose ${products.length} that best match the request, price, rating and order volume.`
    : `ניתחתי ${scannedCount} אפשרויות בתחום ${category} ובחרתי ${products.length} שהכי מתאימות לבקשה, למחיר, לדירוג ולכמות ההזמנות.`;
}

function buildRecommendationStrategy(products, intent, language) {
  if (!products.length) {
    return language === "en"
      ? "No exact recommendation was shown because the assistant did not find a strong enough product match."
      : "לא הוצגה המלצה מדויקת כי לא נמצאה התאמת מוצר מספיק חזקה.";
  }

  return language === "en"
    ? "Filtered unrelated accessories first, then ranked remaining products by relevance, trust signals and value."
    : "סיננתי קודם אביזרים ומוצרים לא קשורים, ואז דירגתי לפי התאמה, אמינות ותמורה למחיר.";
}

function normalizeClarification(item, language) {
  const copy = item[language] || item.he || item.en || item;
  return {
    question: copy.question,
    options: copy.options || []
  };
}

function buildGenericClarification(language) {
  return language === "en"
    ? {
        en: {
          question: "What kind of product should I focus on?",
          options: ["phone accessories", "car accessories", "home gadgets", "gift ideas"]
        }
      }
    : {
        he: {
          question: "איזה סוג מוצר לחפש?",
          options: ["אביזרים לטלפון", "מוצרים לרכב", "גאדג'טים לבית", "רעיונות למתנה"]
        }
      };
}

function isVague(query, profile) {
  const text = query.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasShoppingVerb = /תמליץ|מחפש|רוצה|צריך|find|looking|recommend|need/.test(text);
  const vagueWords = /משהו|דבר|מוצר|גאדג'?ט|טוב|מגניב|זול|מתנה|something|thing|product|gadget|cool|good/.test(text);
  return !profile.requiredTerms.length && (words <= 4 || (hasShoppingVerb && vagueWords));
}

function inferCategory(requiredTerms = []) {
  const terms = new Set(requiredTerms);
  if (terms.has("car")) return "car";
  if (terms.has("cat") || terms.has("dog")) return "pet";
  if (terms.has("baby")) return "baby";
  if (terms.has("laptop") || terms.has("keyboard") || terms.has("mouse") || terms.has("usb")) return "computer";
  if (terms.has("kitchen") || terms.has("blender") || terms.has("fryer") || terms.has("scale")) return "kitchen";
  if (terms.has("iphone") || terms.has("samsung") || terms.has("phone")) return "phone";
  return "general";
}

function buildIntentExplanation(query, profile, language) {
  const terms = profile.requiredTerms || [];
  if (language === "en") {
    return terms.length
      ? `I understood the request as: ${terms.join(" + ")}.`
      : "I need a more specific product direction before searching.";
  }

  return terms.length
    ? `הבנתי את הבקשה כ: ${terms.join(" + ")}.`
    : "אני צריך כיוון מוצר יותר ברור לפני החיפוש.";
}

function summarizeIntent(intent) {
  return {
    engine: intent.engine,
    language: intent.language,
    intent: intent.intent,
    category: intent.category,
    brands: intent.brands || [],
    confidence: intent.confidence,
    requiredTerms: intent.profile?.requiredTerms || [],
    explanation: intent.explanation
  };
}

function stripBrandRequirements(profile, brands) {
  if (!brands.length) return profile;
  return {
    ...profile,
    requiredTerms: (profile.requiredTerms || []).filter((term) => !brands.includes(term)),
    keywords: unique([...(profile.keywords || "").split(/\s+/), ...brands]).join(" "),
    hasKnownTranslation: (profile.requiredTerms || []).some((term) => !brands.includes(term))
  };
}

function detectBrands(query) {
  const lower = normalizeQuery(query).toLowerCase();
  return unique(KNOWN_BRANDS.filter((brand) => new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`, "i").test(lower)));
}

function mergeIntent(fallback, llm) {
  const shouldUseLlmClarification = Boolean(fallback.clarification || fallback.confidence < 45);
  return {
    ...fallback,
    engine: "gemini",
    confidence: Math.max(fallback.confidence, Number(llm.confidence || 0)),
    intent: llm.intent || fallback.intent,
    category: llm.category || fallback.category,
    alternatives: unique([...(llm.alternatives || []), ...(fallback.alternatives || [])]).slice(0, 6),
    clarification: shouldUseLlmClarification ? (llm.clarification || fallback.clarification) : fallback.clarification,
    explanation: llm.explanation || fallback.explanation
  };
}

async function analyzeWithGemini(query, language, fallback) {
  return analyzeIntentWithGemini({
    query,
    language,
    fallbackIntent: fallback.intent,
    fallbackCategory: fallback.category,
    fallbackTerms: fallback.profile.requiredTerms,
    fallbackAlternatives: fallback.alternatives
  });
}

function detectLanguageMode(input) {
  const text = String(input || "");
  const hasHebrew = /[\u0590-\u05ff]/.test(text);
  const hasEnglish = /[a-z]/i.test(text);
  if (hasHebrew && hasEnglish) return "he";
  return hasHebrew ? "he" : "en";
}

function containsPhrase(query, phrase) {
  return simplifyPhrase(query).includes(simplifyPhrase(phrase));
}

function simplifyPhrase(value) {
  return normalizeQuery(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  analyzeShoppingIntent,
  buildNoExactMatchResult,
  createClarificationResult,
  enrichRecommendationResult
};
