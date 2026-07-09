const HEBREW_TERMS = new Map([
  ["\u05de\u05d8\u05e2\u05df", ["charger"]],
  ["\u05e8\u05db\u05d1", ["car"]],
  ["\u05d0\u05d5\u05d8\u05d5", ["car"]],
  ["\u05de\u05d4\u05d9\u05e8", ["fast"]],
  ["\u05e7\u05d9\u05e8", ["wall"]],
  ["\u05db\u05d1\u05dc", ["cable"]],
  ["\u05d8\u05e2\u05d9\u05e0\u05d4", ["charging"]],
  ["\u05d0\u05d9\u05d9\u05e4\u05d5\u05df", ["iphone"]],
  ["\u05d2\u05dc\u05e7\u05e1\u05d9", ["samsung"]],
  ["\u05de\u05d2\u05df", ["case"]],
  ["\u05db\u05d9\u05e1\u05d5\u05d9", ["cover", "case"]],
  ["\u05d0\u05d5\u05d6\u05e0\u05d9\u05d5\u05ea", ["earbuds", "headphones"]],
  ["\u05d1\u05dc\u05d5\u05d8\u05d5\u05e1", ["bluetooth"]],
  ["\u05e9\u05e2\u05d5\u05df", ["watch"]],
  ["\u05d7\u05db\u05dd", ["smart"]],
  ["\u05de\u05e6\u05dc\u05de\u05d4", ["camera"]],
  ["\u05de\u05e6\u05dc\u05de\u05ea", ["camera"]],
  ["\u05de\u05e2\u05de\u05d3", ["holder", "stand"]],
  ["\u05de\u05d8\u05d1\u05d7", ["kitchen"]],
  ["\u05d9\u05dc\u05d3\u05d9\u05dd", ["kids"]],
  ["\u05ea\u05d9\u05e7", ["bag"]],
  ["\u05d2\u05d1", ["backpack"]],
  ["\u05e0\u05e2\u05dc\u05d9\u05d9\u05dd", ["shoes"]],
  ["\u05d7\u05d5\u05dc\u05e6\u05d4", ["shirt"]],
  ["\u05e9\u05de\u05dc\u05d4", ["dress"]],
  ["\u05de\u05d7\u05e9\u05d1", ["laptop", "computer"]],
  ["\u05e2\u05db\u05d1\u05e8", ["mouse"]],
  ["\u05de\u05e7\u05dc\u05d3\u05ea", ["keyboard"]],
  ["\u05de\u05e0\u05d5\u05e8\u05d4", ["lamp"]],
  ["\u05de\u05e0\u05d5\u05e8\u05ea", ["lamp"]],
  ["\u05dc\u05d3", ["led"]],
  ["\u05dc\u05d3\u05d9\u05dd", ["led lights"]],
  ["\u05e8\u05d7\u05e4\u05df", ["drone"]],
  ["\u05d8\u05dc\u05e4\u05d5\u05df", ["phone"]],
  ["\u05d8\u05dc\u05e4\u05d5\u05e0\u05d9\u05dd", ["phone"]],
  ["\u05e9\u05d5\u05d0\u05d1", ["vacuum"]],
  ["\u05d0\u05d1\u05e7", ["cleaner"]],
  ["\u05d2\u05d9\u05d9\u05de\u05d9\u05e0\u05d2", ["gaming"]],
  ["\u05d0\u05dc\u05d7\u05d5\u05d8\u05d9", ["wireless"]],
  ["\u05d0\u05dc\u05d7\u05d5\u05d8\u05d9\u05ea", ["wireless"]],
  ["\u05d1\u05e7\u05d1\u05d5\u05e7", ["bottle"]],
  ["\u05de\u05d9\u05dd", ["water"]],
  ["\u05e1\u05e4\u05d5\u05e8\u05d8", ["sport"]],
  ["\u05de\u05e1\u05d7\u05d8\u05ea", ["juicer"]],
  ["\u05de\u05d9\u05e6\u05d9\u05dd", ["juice"]],
  ["\u05d2\u05d9\u05dc\u05d5\u05d7", ["shaver"]],
  ["\u05e9\u05d9\u05e0\u05d9\u05d9\u05dd", ["toothbrush"]],
  ["\u05de\u05d1\u05e8\u05e9\u05ea", ["brush"]],
  ["\u05d7\u05e9\u05de\u05dc\u05d9\u05ea", ["electric"]],
  ["\u05de\u05e9\u05e7\u05dc", ["scale"]],
  ["\u05d0\u05d1\u05d8\u05d7\u05d4", ["security"]],
  ["\u05e8\u05de\u05e7\u05d5\u05dc", ["speaker"]],
  ["\u05de\u05e7\u05e8\u05df", ["projector"]],
  ["\u05e0\u05d9\u05d9\u05d3", ["portable"]],
  ["\u05e0\u05d9\u05d9\u05d3\u05ea", ["portable"]],
  ["\u05e9\u05d5\u05dc\u05d7\u05e0\u05d9\u05ea", ["desk"]],
  ["\u05d0\u05d9\u05d9\u05e8", ["air"]],
  ["\u05e4\u05e8\u05d9\u05d9\u05e8", ["fryer"]],
  ["\u05de\u05d6\u05e8\u05df", ["mat"]],
  ["\u05d9\u05d5\u05d2\u05d4", ["yoga"]],
  ["\u05d0\u05d5\u05d4\u05dc", ["tent"]],
  ["\u05e7\u05de\u05e4\u05d9\u05e0\u05d2", ["camping"]],
  ["\u05e8\u05e6\u05d5\u05e2\u05d4", ["leash"]],
  ["\u05db\u05dc\u05d1", ["dog"]],
  ["\u05de\u05d6\u05e8\u05e7\u05ea", ["fountain"]],
  ["\u05d7\u05ea\u05d5\u05dc", ["cat"]],
  ["\u05e2\u05d2\u05dc\u05d4", ["stroller"]],
  ["\u05ea\u05d9\u05e0\u05d5\u05e7", ["baby"]],
  ["\u05e4\u05e0\u05e1", ["light"]],
  ["\u05d0\u05d5\u05e4\u05e0\u05d9\u05d9\u05dd", ["bicycle"]],
  ["\u05db\u05e4\u05e4\u05d5\u05ea", ["gloves"]],
  ["\u05d0\u05d5\u05e4\u05e0\u05d5\u05e2", ["motorcycle"]],
  ["\u05de\u05e9\u05e7\u05e4\u05d9", ["sunglasses"]],
  ["\u05de\u05e9\u05e7\u05e4\u05d9\u05d9\u05dd", ["sunglasses"]],
  ["\u05e9\u05de\u05e9", ["sun"]],
  ["usb", ["usb"]],
  ["\u05de\u05e4\u05e6\u05dc", ["hub", "splitter"]],
  ["\u05d0\u05d3\u05d9\u05dd", ["humidifier"]],
  ["\u05e8\u05d5\u05d1\u05d5\u05d8\u05d9", ["robot"]],
  ["\u05de\u05d9\u05d9\u05d1\u05e9", ["dryer"]],
  ["\u05e9\u05d9\u05e2\u05e8", ["hair"]],
  ["\u05d1\u05dc\u05e0\u05d3\u05e8", ["blender"]],
  ["\u05de\u05d8\u05d7\u05e0\u05ea", ["grinder"]],
  ["\u05e7\u05e4\u05d4", ["coffee"]],
  ["\u05de\u05dc\u05d7\u05dd", ["soldering", "iron"]]
]);

const PHRASE_TERMS = [
  {
    pattern: /\u05de\u05d8\u05e2\u05df.*\u05e8\u05db\u05d1|\u05de\u05d8\u05e2\u05df.*\u05d0\u05d5\u05d8\u05d5/,
    terms: ["car", "charger"]
  },
  {
    pattern: /\u05de\u05d8\u05e2\u05df.*\u05e7\u05d9\u05e8/,
    terms: ["wall", "charger"],
    exclude: ["car", "cable", "cord", "wire"]
  },
  {
    pattern: /\u05e9\u05e2\u05d5\u05df.*\u05d7\u05db\u05dd/,
    terms: ["smart", "watch"],
    exclude: ["band", "strap", "bracelet", "case", "cover", "protector"]
  },
  {
    pattern: /\u05ea\u05d9\u05e7.*\u05d2\u05d1/,
    terms: ["backpack"],
    exclude: ["patch", "badge", "sticker"]
  },
  {
    pattern: /\u05d0\u05d5\u05d6\u05e0\u05d9\u05d5\u05ea.*\u05d1\u05dc\u05d5\u05d8\u05d5\u05e1/,
    terms: ["bluetooth", "earbuds"],
    exclude: ["case", "cover", "strap"]
  },
  {
    pattern: /\u05e9\u05d5\u05d0\u05d1.*\u05d0\u05d1\u05e7.*\u05e8\u05db\u05d1|\u05e9\u05d5\u05d0\u05d1.*\u05d0\u05d1\u05e7.*\u05d0\u05d5\u05d8\u05d5/,
    terms: ["car", "vacuum", "cleaner"],
    exclude: ["filter", "brush", "towel", "cloth", "pad"]
  },
  {
    pattern: /\u05de\u05e2\u05de\u05d3.*\u05d8\u05dc\u05e4\u05d5\u05df.*\u05e8\u05db\u05d1|\u05de\u05e2\u05de\u05d3.*\u05d8\u05dc\u05e4\u05d5\u05df.*\u05d0\u05d5\u05d8\u05d5/,
    terms: ["car", "phone", "holder"],
    exclude: ["sticker", "plate", "metal plate"]
  },
  {
    pattern: /\u05e8\u05d7\u05e4\u05df.*\u05de\u05e6\u05dc\u05de\u05d4/,
    terms: ["camera", "drone"],
    exclude: ["protector", "cover", "lens cap", "battery", "propeller", "case", "bag", "holder"]
  },
  {
    pattern: /\u05de\u05e7\u05dc\u05d3\u05ea.*\u05d2\u05d9\u05d9\u05de\u05d9\u05e0\u05d2/,
    terms: ["gaming", "keyboard"],
    exclude: ["switch", "keycap", "cover", "cloth", "cleaner"]
  },
  {
    pattern: /\u05e2\u05db\u05d1\u05e8.*\u05d0\u05dc\u05d7\u05d5\u05d8/,
    terms: ["wireless", "mouse"],
    exclude: ["pad", "feet", "skate", "cable", "organizer"]
  },
  {
    pattern: /\u05d1\u05e7\u05d1\u05d5\u05e7.*\u05de\u05d9\u05dd/,
    terms: ["water", "bottle"],
    exclude: ["sticker", "cap", "holder", "cover"]
  },
  {
    pattern: /\u05de\u05e1\u05d7\u05d8\u05ea.*\u05de\u05d9\u05e6\u05d9\u05dd/,
    terms: ["juicer"],
    exclude: ["cup", "bottle", "blade", "part"]
  },
  {
    pattern: /\u05de\u05db\u05d5\u05e0\u05ea.*\u05d2\u05d9\u05dc\u05d5\u05d7/,
    terms: ["electric", "shaver"],
    exclude: ["blade", "head", "replacement", "case"]
  },
  {
    pattern: /\u05de\u05d1\u05e8\u05e9\u05ea.*\u05e9\u05d9\u05e0\u05d9\u05d9\u05dd/,
    terms: ["electric", "toothbrush"],
    exclude: ["head", "replacement", "case", "holder"]
  },
  {
    pattern: /\u05de\u05e9\u05e7\u05dc.*\u05de\u05d8\u05d1\u05d7/,
    terms: ["digital", "kitchen", "scale"],
    exclude: ["spoon", "bowl", "handle", "sticker"]
  },
  {
    pattern: /\u05de\u05e6\u05dc\u05de\u05ea.*\u05d0\u05d1\u05d8\u05d7\u05d4|\u05de\u05e6\u05dc\u05de\u05d4.*\u05d0\u05d1\u05d8\u05d7\u05d4/,
    terms: ["security", "camera"],
    exclude: ["mount", "cable", "cover", "bracket", "sticker"]
  },
  {
    pattern: /\u05e8\u05de\u05e7\u05d5\u05dc.*\u05d1\u05dc\u05d5\u05d8\u05d5\u05e1/,
    terms: ["bluetooth", "speaker"],
    exclude: ["case", "strap", "cable", "adapter", "receiver", "transmitter", "cleaner"]
  },
  {
    pattern: /\u05de\u05e7\u05e8\u05df.*\u05e0\u05d9\u05d9\u05d3/,
    terms: ["portable", "projector"],
    exclude: ["screen", "remote", "case", "stand", "holder"]
  },
  {
    pattern: /\u05d0\u05d9\u05d9\u05e8.*\u05e4\u05e8\u05d9\u05d9\u05e8/,
    terms: ["air", "fryer"],
    exclude: ["paper", "liner", "baking", "tray", "cable", "organizer", "clip", "accessories"]
  },
  {
    pattern: /\u05de\u05d6\u05e8\u05df.*\u05d9\u05d5\u05d2\u05d4/,
    terms: ["yoga", "mat"],
    exclude: ["bag", "strap", "storage", "lid", "holder"]
  },
  {
    pattern: /\u05d0\u05d5\u05d4\u05dc.*\u05e7\u05de\u05e4\u05d9\u05e0\u05d2/,
    terms: ["camping", "tent"],
    exclude: ["cord", "rope", "clip", "buckle", "accessories", "tensioner", "hook"]
  },
  {
    pattern: /\u05e8\u05e6\u05d5\u05e2\u05d4.*\u05db\u05dc\u05d1/,
    terms: ["dog", "leash"],
    exclude: ["toy", "tag", "collar only"]
  },
  {
    pattern: /\u05de\u05d6\u05e8\u05e7\u05ea.*\u05de\u05d9\u05dd.*\u05d7\u05ea\u05d5\u05dc/,
    terms: ["cat", "water", "fountain"],
    exclude: ["filter", "replacement", "sponge", "foam"]
  },
  {
    pattern: /\u05e2\u05d2\u05dc\u05d4.*\u05ea\u05d9\u05e0\u05d5\u05e7/,
    terms: ["baby", "stroller"],
    exclude: ["hook", "clip", "belt", "pillow", "teether", "pacifier", "chain", "organizer"]
  },
  {
    pattern: /\u05e4\u05e0\u05e1.*\u05d0\u05d5\u05e4\u05e0\u05d9\u05d9\u05dd/,
    terms: ["bicycle", "light"],
    exclude: ["reflector", "strip", "clip", "sticker"]
  },
  {
    pattern: /\u05db\u05e4\u05e4\u05d5\u05ea.*\u05d0\u05d5\u05e4\u05e0\u05d5\u05e2/,
    terms: ["motorcycle", "gloves"],
    exclude: ["car wash", "washing", "cleaning"]
  },
  {
    pattern: /\u05de\u05e9\u05e7\u05e4.*\u05e9\u05de\u05e9/,
    terms: ["sunglasses"],
    exclude: ["rope", "cord", "clip", "holder", "case"]
  },
  {
    pattern: /\u05de\u05e2\u05de\u05d3.*\u05de\u05d7\u05e9\u05d1.*\u05e0\u05d9\u05d9\u05d3/,
    terms: ["laptop", "stand"],
    exclude: ["keyboard", "holder only"]
  },
  {
    pattern: /\u05de\u05e4\u05e6\u05dc.*usb/,
    terms: ["usb", "hub"],
    exclude: ["card reader", "cable", "organizer"]
  },
  {
    pattern: /\u05de\u05db\u05e9\u05d9\u05e8.*\u05d0\u05d3\u05d9\u05dd/,
    terms: ["humidifier"],
    exclude: ["stick", "sticks", "filter", "wick", "nebulizer", "inhaler"]
  },
  {
    pattern: /\u05e9\u05d5\u05d0\u05d1.*\u05e8\u05d5\u05d1\u05d5\u05d8\u05d9/,
    terms: ["robot", "vacuum"],
    exclude: ["filter", "parts", "accessories", "mop", "dust bag", "brush", "replacement"]
  },
  {
    pattern: /\u05de\u05d9\u05d9\u05d1\u05e9.*\u05e9\u05d9\u05e2\u05e8/,
    terms: ["hair", "dryer"],
    exclude: ["stand", "holder", "pet", "washing machine", "sponge"]
  },
  {
    pattern: /\u05d1\u05dc\u05e0\u05d3\u05e8/,
    terms: ["kitchen", "blender"],
    exclude: ["makeup", "sponge", "brush", "puff", "cosmetic"]
  },
  {
    pattern: /\u05de\u05d8\u05d7\u05e0\u05ea.*\u05e7\u05e4\u05d4/,
    terms: ["coffee", "grinder"],
    exclude: ["brush", "ring", "catcher", "dosing", "cloth"]
  },
  {
    pattern: /\u05de\u05dc\u05d7\u05dd/,
    terms: ["electric", "soldering", "iron"],
    exclude: ["tip", "tips", "cleaner", "paste", "refresher", "ball", "mesh"]
  }
];

const HEBREW_STOP_WORDS = new Set([
  "\u05d0\u05e0\u05d9",
  "\u05de\u05d7\u05e4\u05e9",
  "\u05de\u05d7\u05e4\u05e9\u05ea",
  "\u05e8\u05d5\u05e6\u05d4",
  "\u05e6\u05e8\u05d9\u05da",
  "\u05e6\u05e8\u05d9\u05db\u05d4",
  "\u05de\u05db\u05e9\u05d9\u05e8",
  "\u05dc\u05d9",
  "\u05e2\u05dd",
  "\u05e9\u05dc",
  "\u05d5\u05e2\u05dd",
  "\u05d4\u05db\u05d9",
  "\u05d8\u05d5\u05d1",
  "\u05d8\u05d5\u05d1\u05d4",
  "\u05d8\u05d5\u05d1\u05d9\u05dd",
  "\u05de\u05d5\u05de\u05dc\u05e5",
  "\u05de\u05d5\u05de\u05dc\u05e6\u05d9\u05dd"
]);

const ENGLISH_STOP_WORDS = new Set([
  "i",
  "need",
  "want",
  "looking",
  "for",
  "with",
  "best",
  "good",
  "cheap",
  "please",
  "the",
  "a",
  "an"
]);

const ENGLISH_TERMS = new Map([
  ["backpack", ["backpack", "bag"]],
  ["earbuds", ["earbuds", "headphones"]],
  ["headphones", ["headphones", "earbuds"]],
  ["watch", ["watch"]],
  ["charger", ["charger"]],
  ["camera", ["camera"]],
  ["bottle", ["bottle"]],
  ["speaker", ["speaker"]],
  ["projector", ["projector"]],
  ["shaver", ["shaver"]],
  ["toothbrush", ["toothbrush"]],
  ["scale", ["scale"]],
  ["drone", ["drone"]],
  ["air", ["air"]],
  ["fryer", ["fryer"]],
  ["tent", ["tent"]],
  ["leash", ["leash"]],
  ["stroller", ["stroller"]],
  ["sunglasses", ["sunglasses"]],
  ["humidifier", ["humidifier"]],
  ["blender", ["blender"]],
  ["hub", ["hub"]],
  ["soldering", ["soldering"]],
  ["iron", ["iron"]]
]);

function normalizeQuery(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(input) {
  return normalizeQuery(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function lookupHebrewTerm(token) {
  if (HEBREW_TERMS.has(token)) return HEBREW_TERMS.get(token);

  for (const prefix of ["\u05dc", "\u05d5", "\u05d4", "\u05d1", "\u05de"]) {
    if (token.startsWith(prefix) && token.length > 2) {
      const withoutPrefix = token.slice(1);
      if (HEBREW_TERMS.has(withoutPrefix)) return HEBREW_TERMS.get(withoutPrefix);
    }
  }

  return null;
}

function buildSearchProfile(input) {
  const normalized = normalizeQuery(input);
  const lower = normalized.toLowerCase();
  const tokens = tokenize(lower);
  const translated = [];
  const required = [];
  const excluded = [];

  for (const phrase of PHRASE_TERMS) {
    if (phrase.pattern.test(lower)) {
      translated.push(...phrase.terms);
      required.push(...phrase.terms);
      if (phrase.exclude) excluded.push(...phrase.exclude);
    }
  }

  for (const token of tokens) {
    const mapped = lookupHebrewTerm(token);
    if (mapped) {
      translated.push(...mapped);
      required.push(...mapped);
      continue;
    }

    if (/^[a-z0-9-]+$/i.test(token) && !ENGLISH_STOP_WORDS.has(token)) {
      const expanded = ENGLISH_TERMS.get(token) || [token];
      translated.push(...expanded);
      required.push(...expanded);
    }
  }

  const cleanedHebrewTokens = tokens.filter((token) => {
    if (HEBREW_STOP_WORDS.has(token)) return false;
    if (lookupHebrewTerm(token)) return false;
    return !/^[a-z0-9-]+$/i.test(token);
  });

  const requiredTerms = unique(required).map((term) => term.toLowerCase());
  if (!requiredTerms.length && /[\u0590-\u05ff]/.test(normalized)) {
    requiredTerms.push("__no_known_translation__");
  }
  addCategoryExclusions(requiredTerms, excluded);
  const keywords = unique([...translated, ...cleanedHebrewTokens]).join(" ");
  const excludedTerms = unique(excluded).map((term) => term.toLowerCase());

  return {
    original: normalized,
    keywords: keywords || normalized,
    requiredTerms,
    excludedTerms
  };
}

function addCategoryExclusions(requiredTerms, excluded) {
  const has = (term) => requiredTerms.includes(term);

  if (has("backpack") || has("bag")) {
    excluded.push("patch", "badge", "sticker", "strap", "harness", "buckle", "clip", "zipper", "pull", "extender", "replacement", "luggage", "purse", "handbag", "jacket", "keychain", "keychains", "webbing", "reflective tag", "rain cover", "dust cover");
  }

  if (has("watch") && has("smart")) {
    excluded.push("band", "strap", "bracelet", "case", "cover", "protector", "screen protector", "charger", "charging", "cable", "accessories", "replacement");
  }

  if (has("camera") && has("car")) {
    excluded.push("cover", "blocker", "sticker", "protector", "protection", "accessory", "accessories", "lens cap", "mount", "brush", "keyboard", "laptop", "coffee grinder", "cable");
  }

  if (has("charger") && !has("cable")) {
    excluded.push("cable", "cord", "wire", "connector", "connectors", "data transfer", "plate", "sticker", "holder");
  }

  if (has("earbuds") || has("headphones")) {
    excluded.push("case", "cover", "strap", "ear pads", "tips", "cleaner", "cleaning pen");
  }

  if (has("drone")) {
    excluded.push("protector", "protection", "cover", "lens cap", "lens", "filter", "uv", "nd8", "battery", "propeller", "case", "bag", "holder", "sticker", "accessory", "accessories", "guard", "gimbal", "memory card", "sd card", "class 10", "smartphone", "tablet", "part", "diy", "fpv camera");
  }

  if (has("keyboard")) {
    excluded.push("switch", "keycap", "cover", "cloth", "cleaner", "adapter", "dongle", "mat", "pad", "stand", "organizer", "pegboard", "desk protector", "cable", "wire");
  }

  if (has("mouse") && has("wireless")) {
    excluded.push("pad", "feet", "skate", "cable", "organizer", "ties", "wire", "adapter", "dongle", "receiver", "transmitter", "keyboard");
  }

  if (has("lamp")) {
    excluded.push("cable", "cord", "bulb", "strip", "keychain", "toy");
    if (has("desk")) {
      excluded.push("nail", "manicure", "dryer", "gel polish", "uv nail");
    }
  }

  if (has("bottle")) {
    excluded.push("sticker", "cap", "holder", "cover", "atomizer", "perfume", "container", "funnel", "medicine", "keychain");
  }

  if (has("speaker")) {
    excluded.push("adapter", "receiver", "transmitter", "cleaner", "case", "cable", "earphone", "earphones", "earbuds", "headphones", "earpods");
  }

  if (has("projector")) {
    excluded.push("screen", "remote", "case", "stand", "holder", "party light", "disco", "laser", "stroboscopic", "light show");
  }

  if (has("vacuum") && has("car")) {
    excluded.push("storage bag", "organizer", "toolkit", "towel", "cloth", "pad", "filter", "brush", "sticker");
  }

  if (has("scale") && has("kitchen")) {
    excluded.push("measuring cup", "cup", "beaker", "scraper", "fish", "handle", "spoon", "bowl", "luggage", "suitcase", "hanging", "travel bag", "jewelry", "diamond", "pocket scale");
  }

  if (has("security") && has("camera")) {
    excluded.push("connector", "adapter", "socket", "plug", "cable", "bracket", "mount", "power connector", "jack");
  }

  if (has("air") && has("fryer")) {
    excluded.push("paper", "liner", "baking", "tray", "cable", "organizer", "clip", "accessories", "oil", "dispenser", "sprayer", "spray", "brush", "salad", "grilling", "timer", "control", "switch", "button", "replacement", "dollhouse", "miniature", "model", "ornament", "ornaments", "cookware", "cover", "protector", "protective", "bumper", "parts", "wheels", "slider", "pulley", "dust cover", "steamer board", "motor", "fan", "valve", "dishwasher", "ice maker", "fork", "component", "oven", "roasting", "skewer", "skewers", "rubber feet", "feet", "corner guard", "heating element", "heating plate", "spiral");
  }

  if (has("yoga") && has("mat")) {
    excluded.push("bag", "strap", "storage", "lid", "holder", "brick", "block");
  }

  if (has("camping") && has("tent")) {
    excluded.push("cord", "rope", "clip", "buckle", "accessories", "tensioner", "hook", "paracord", "mat", "pad", "bulb", "lamp", "lantern", "light", "poncho", "raincoat", "nail bag", "pegs bag", "tarp", "shade sail", "awning", "canopy");
  }

  if (has("cat") && has("water") && has("fountain")) {
    excluded.push("filter", "replacement", "sponge", "foam");
  }

  if (has("baby") && has("stroller")) {
    excluded.push("hook", "clip", "belt", "pillow", "teether", "pacifier", "chain", "organizer", "mosquito net", "net", "toy", "book", "rattle", "mobile", "accessories", "fan", "cushion", "seat", "inner tube", "tube", "scooter", "cover", "blanket", "swaddle", "mat", "apron", "diaper bag", "wetbag", "umbrella", "parasol", "sunshade", "canopy cover", "milk bottle", "bottle", "insulation bag", "coupler", "attachment", "hitch", "linker", "connector", "parts", "footrest", "extender", "sling", "carrier", "wrap");
  }

  if (has("bicycle") && has("light")) {
    excluded.push("reflector", "strip", "clip", "sticker");
  }

  if (has("motorcycle") && has("gloves")) {
    excluded.push("car wash", "washing", "cleaning");
  }

  if (has("sunglasses")) {
    excluded.push("rope", "cord", "clip", "holder", "case", "strap");
  }

  if (has("usb") && has("hub")) {
    excluded.push("card reader", "cable", "organizer");
  }

  if (has("humidifier")) {
    excluded.push("stick", "sticks", "filter", "wick", "nebulizer", "inhaler", "oil", "essential oil", "candle", "soap", "battery", "gps", "mp3", "mp4");
  }

  if (has("robot") && has("vacuum")) {
    excluded.push("filter", "parts", "accessories", "mop", "dust bag", "brush", "replacement", "hepa", "window", "glass", "concentrate", "solution", "scrubber", "ramp", "threshold", "fluid", "spare part", "spare parts");
  }

  if (has("hair") && has("dryer")) {
    excluded.push("stand", "holder", "pet", "washing machine", "sponge", "lint", "storage", "rack", "cap", "hood", "bonnet", "diffuser", "accessory", "accessories", "barbecue", "nozzle", "attachment", "concentrator");
  }

  if (has("blender")) {
    excluded.push("makeup", "sponge", "brush", "puff", "cosmetic", "milk frother", "frother", "whisk", "egg beater", "cord wrapper", "cable holder", "dollhouse", "miniature", "art blender", "tortillions", "hair fiber", "hair fibers");
  }

  if (has("coffee") && has("grinder")) {
    excluded.push("brush", "ring", "catcher", "dosing", "cloth", "spray", "anti fly powder", "accessories", "adapter", "capsule", "pod");
  }

  if (has("soldering") && has("iron")) {
    excluded.push("tip", "tips", "cleaner", "paste", "refresher", "ball", "mesh", "stand", "holder", "mat", "wire", "solder wire", "flux", "fluid", "head", "heads", "pump", "sucker", "desoldering");
  }
}

function buildSearchKeywords(input) {
  return buildSearchProfile(input).keywords;
}

const SEARCH_VARIANTS = [
  { terms: ["air", "fryer"], queries: ["air fryer", "electric air fryer", "air fryer machine", "oil free fryer"] },
  { terms: ["camping", "tent"], queries: ["camping tent", "outdoor camping tent", "2 person tent", "waterproof camping tent"] },
  { terms: ["baby", "stroller"], queries: ["baby stroller", "baby pram stroller", "folding baby stroller", "portable baby stroller"] },
  { terms: ["robot", "vacuum"], queries: ["robot vacuum cleaner", "robotic vacuum cleaner", "smart robot vacuum", "floor robot vacuum"] },
  { terms: ["hair", "dryer"], queries: ["hair dryer", "professional hair dryer", "ionic hair dryer", "electric hair dryer"] },
  { terms: ["blender"], queries: ["kitchen blender", "electric blender", "portable blender", "food blender"] },
  { terms: ["coffee", "grinder"], queries: ["coffee grinder", "electric coffee grinder", "coffee bean grinder", "manual coffee grinder"] },
  { terms: ["soldering", "iron"], queries: ["soldering iron", "electric soldering iron", "temperature soldering iron", "usb soldering iron"] },
  { terms: ["humidifier"], queries: ["humidifier", "air humidifier", "portable humidifier", "ultrasonic humidifier"] },
  { terms: ["cat", "water", "fountain"], queries: ["cat water fountain", "pet water fountain", "cat drinking fountain"] },
  { terms: ["bicycle", "light"], queries: ["bicycle light", "bike front light", "rechargeable bike light"] },
  { terms: ["motorcycle", "gloves"], queries: ["motorcycle gloves", "riding gloves", "motorbike gloves"] },
  { terms: ["usb", "hub"], queries: ["usb hub", "usb c hub", "usb splitter hub", "multi port usb hub"] }
];

function buildSearchAttempts(profile) {
  const attempts = [profile.keywords, profile.original];
  const requiredTerms = profile.requiredTerms || [];

  for (const variant of SEARCH_VARIANTS) {
    if (variant.terms.every((term) => requiredTerms.includes(term))) {
      attempts.push(...variant.queries);
    }
  }

  return unique(attempts)
    .filter((query) => query && !query.includes("__no_known_translation__"))
    .slice(0, 6);
}

function inferPreferences(input) {
  const text = normalizeQuery(input).toLowerCase();
  return {
    wantsFastShipping: /\u05de\u05d4\u05d9\u05e8|\u05d3\u05d7\u05d5\u05e3|fast|quick/.test(text),
    wantsCheap: /\u05d6\u05d5\u05dc|\u05de\u05e9\u05ea\u05dc\u05dd|\u05de\u05d7\u05d9\u05e8|cheap|budget/.test(text),
    wantsQuality: /\u05d0\u05d9\u05db\u05d5\u05ea|\u05d8\u05d5\u05d1|\u05de\u05d5\u05de\u05dc\u05e5|\u05d1\u05d9\u05e7\u05d5\u05e8\u05d5\u05ea|quality|best|review/.test(text)
  };
}

module.exports = { buildSearchAttempts, buildSearchKeywords, buildSearchProfile, inferPreferences, normalizeQuery };
