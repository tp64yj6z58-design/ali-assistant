const { recommendProducts } = require("./assistant");

const CASES = [
  { query: "מטען לרכב", must: ["car", "charger"], avoid: ["cable", "cord", "wire", "connector"] },
  { query: "מטען קיר מהיר", must: ["charger"], any: ["wall", "gan", "usb", "pd"], avoid: ["cable", "cord"] },
  { query: "אוזניות בלוטוס", must: ["bluetooth"], any: ["earbuds", "headphones", "earphone"], avoid: ["case", "cover", "tips"] },
  { query: "שעון חכם", must: ["smart", "watch"], avoid: ["band", "strap", "bracelet", "case", "cover"] },
  { query: "תיק גב", any: ["backpack", "rucksack", "school bag", "travel bag"], avoid: ["patch", "strap", "keychain", "zipper", "webbing"] },
  { query: "מצלמה לרכב", must: ["car"], any: ["camera", "dash cam", "dvr"], avoid: ["cover", "sticker", "protector", "mount"] },
  { query: "שואב אבק לרכב", must: ["car"], any: ["vacuum", "cleaner"], avoid: ["filter", "brush", "part"] },
  { query: "מעמד לטלפון לרכב", must: ["car"], any: ["phone holder", "holder", "mount"], avoid: ["sticker", "cable"] },
  { query: "רחפן עם מצלמה", any: ["drone", "quadcopter"], must: ["camera"], avoid: ["battery", "propeller", "bag"] },
  { query: "מקלדת גיימינג", must: ["keyboard"], any: ["gaming", "mechanical"], avoid: ["keycap", "switch", "cable"] },
  { query: "עכבר אלחוטי", must: ["mouse"], any: ["wireless", "bluetooth"], avoid: ["pad", "feet", "skate"] },
  { query: "מנורת לד שולחנית", must: ["lamp"], any: ["desk", "led"], avoid: ["bulb", "strip"] },
  { query: "בקבוק מים ספורט", must: ["bottle"], any: ["water", "sport"], avoid: ["sticker", "cap only"] },
  { query: "מסחטת מיצים", any: ["juicer", "juice extractor", "citrus"], avoid: ["cup", "bottle", "blade only"] },
  { query: "מכונת גילוח", any: ["shaver", "razor"], avoid: ["blade", "head replacement", "case"] },
  { query: "מברשת שיניים חשמלית", must: ["toothbrush"], any: ["electric", "sonic"], avoid: ["head", "replacement", "case"] },
  { query: "משקל מטבח", must: ["scale"], any: ["kitchen", "digital"], avoid: ["spoon", "bowl"] },
  { query: "מצלמת אבטחה", must: ["camera"], any: ["security", "wifi", "ip"], avoid: ["mount", "cable", "cover"] },
  { query: "רמקול בלוטוס", must: ["bluetooth"], any: ["speaker"], avoid: ["case", "strap", "cable"] },
  { query: "מקרן נייד", any: ["projector"], avoid: ["screen", "remote", "case", "stand"] }
];

function words(text) {
  return String(text || "").toLowerCase();
}

function hasPhrase(title, phrase) {
  const parts = String(phrase).toLowerCase().split(/\s+/).filter(Boolean);
  return parts.every((part) => new RegExp(`(^|[^a-z0-9])${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es)?([^a-z0-9]|$)`, "i").test(title));
}

function evaluateTitle(title, rule) {
  const lower = words(title);
  const missingMust = (rule.must || []).filter((term) => !hasPhrase(lower, term));
  const hasAny = !rule.any || rule.any.some((term) => hasPhrase(lower, term));
  const avoided = (rule.avoid || []).filter((term) => hasPhrase(lower, term));
  return {
    ok: missingMust.length === 0 && hasAny && avoided.length === 0,
    missingMust,
    hasAny,
    avoided
  };
}

async function runQualityCheck() {
  const rows = [];
  for (const testCase of CASES) {
    const result = await recommendProducts(testCase.query);
    const checks = result.products.map((product) => ({
      title: product.title,
      check: evaluateTitle(product.title, testCase)
    }));
    const passed = checks.filter((item) => item.check.ok).length;
    rows.push({
      query: testCase.query,
      keywords: result.keywords,
      count: result.products.length,
      passed,
      titles: checks.map((item) => ({
        ok: item.check.ok,
        title: item.title,
        missingMust: item.check.missingMust,
        avoided: item.check.avoided
      }))
    });
  }
  return rows;
}

if (require.main === module) {
  runQualityCheck()
    .then((rows) => {
      for (const row of rows) {
        console.log(`\n${row.passed}/${row.count} ${row.query} -> ${row.keywords}`);
        for (const title of row.titles) {
          console.log(`${title.ok ? "OK" : "BAD"} ${title.title}`);
          if (title.missingMust.length) console.log(`  missing: ${title.missingMust.join(", ")}`);
          if (title.avoided.length) console.log(`  avoided: ${title.avoided.join(", ")}`);
        }
      }
      const total = rows.reduce((sum, row) => sum + row.count, 0);
      const passed = rows.reduce((sum, row) => sum + row.passed, 0);
      console.log(`\nTOTAL ${passed}/${total}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { CASES, evaluateTitle, runQualityCheck };
