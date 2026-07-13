const { recommendProducts } = require("./assistant");

const CASES = [
  { query: "כבל לאייפון", expectAny: ["cable", "cord", "lightning", "usb"], avoid: ["case", "cover", "protector"] },
  { query: "כבל usb c", expectAny: ["cable", "cord", "usb"], avoid: ["adapter", "hub", "organizer"] },
  { query: "רצועה לכלב", expectAny: ["leash"], must: ["dog"], avoid: ["toy", "bed", "bowl"] },
  { query: "קולר לכלב", expectAny: ["collar"], must: ["dog"], avoid: ["toy", "bed", "bowl"] },
  { query: "מיטה לכלב", expectAny: ["bed"], must: ["dog"], avoid: ["toy", "collar", "leash"] },
  { query: "קערה לכלב", expectAny: ["bowl"], must: ["dog"], avoid: ["toy", "collar", "leash"] },
  { query: "מצלמת רשת למחשב", expectAny: ["webcam", "camera"], avoid: ["privacy cover", "tripod", "stand"] },
  { query: "תיק למחשב נייד", expectAny: ["laptop bag", "computer bag", "notebook bag", "sleeve"], avoid: ["stand", "keyboard"] },
  { query: "מעמד למחשב נייד", expectAny: ["laptop stand", "notebook stand"], avoid: ["bag", "case", "sleeve"] },
  { query: "מגן מסך לסמסונג", must: ["samsung", "screen"], expectAny: ["protector", "glass"], avoid: ["iphone", "case", "cover", "charger"] },
  { query: "כיסוי לסמסונג", must: ["samsung"], expectAny: ["case", "cover"], avoid: ["screen protector", "charger", "cable", "cleaner", "earbuds", "airpods"] },
  { query: "מד לחץ דם", expectAny: ["blood pressure", "monitor"], avoid: ["watch", "strap", "case"] },
  { query: "משאבת אוויר לרכב", expectAny: ["tire inflator", "compressor"], avoid: ["water pump", "aquarium", "wedge", "airbag", "chuck", "adapter", "case", "hose", "tube", "pressure gauge", "repair tool"] },
  { query: "בלנדר נייד", expectAny: ["blender"], avoid: ["makeup", "sponge", "brush"] },
  { query: "מטחנת קפה", expectAny: ["coffee grinder"], avoid: ["brush", "capsule", "pod"] },
  { query: "מלחם חשמלי", expectAny: ["soldering iron"], avoid: ["tip", "stand", "wire"] },
  { query: "וילון אמבטיה", expectAny: ["shower curtain"], avoid: ["hook", "ring", "rod", "party", "backdrop", "foil"] },
  { query: "שטיח לסלון", expectAny: ["rug", "carpet"], avoid: ["tape", "gripper", "pad only"] },
  { query: "מדחום לתינוק", expectAny: ["thermometer"], avoid: ["toy", "sticker"] },
  { query: "משחק לתינוק", must: ["baby"], expectAny: ["toy"], avoid: ["stroller", "bottle"] },
  { query: "בובה של חתול", must: ["cat"], expectAny: ["plush", "doll", "stuffed"], avoid: ["sticker", "decal", "patch", "poster", "keychain"] },
  { query: "iphone charger cable", expectAny: ["cable", "cord", "lightning", "usb"], avoid: ["case", "cover"] },
  { query: "samsung screen protector", must: ["screen"], expectAny: ["protector", "glass"], avoid: ["case", "cover"] },
  { query: "dog collar", must: ["dog"], expectAny: ["collar"], avoid: ["toy", "bed"] },
  { query: "coffee grinder", expectAny: ["coffee grinder"], avoid: ["brush", "capsule"] }
];

function hasPhrase(title, phrase) {
  const normalized = String(title || "")
    .toLowerCase()
    .replace(/screenprotector/g, "screen protector")
    .replace(/powerbank/g, "power bank")
    .replace(/dashcam/g, "dash cam")
    .replace(/earphones?/g, "earbuds");
  return String(phrase)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(part)}(s|es)?([^a-z0-9]|$)`, "i").test(normalized));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evaluate(product, rule) {
  const title = product.searchTitle || product.title;
  const missingMust = (rule.must || []).filter((term) => !hasPhrase(title, term));
  const hasExpected = !rule.expectAny || rule.expectAny.some((term) => hasPhrase(title, term));
  const avoided = (rule.avoid || []).filter((term) => hasPhrase(title, term));
  return { ok: !missingMust.length && hasExpected && !avoided.length, missingMust, hasExpected, avoided, title };
}

async function runAdversarialProbe() {
  const rows = [];
  for (const rule of CASES) {
    const result = await recommendProducts(rule.query);
    const checks = result.products.map((product) => evaluate(product, rule));
    rows.push({
      query: rule.query,
      count: result.products.length,
      confidence: result.confidence,
      passed: checks.filter((check) => check.ok).length,
      checks
    });
  }
  return rows;
}

if (require.main === module) {
  runAdversarialProbe()
    .then((rows) => {
      let total = 0;
      let passed = 0;
      for (const row of rows) {
        total += row.count;
        passed += row.passed;
        console.log(`\n${row.passed}/${row.count} confidence=${row.confidence} ${row.query}`);
        for (const check of row.checks) {
          console.log(`${check.ok ? "OK" : "BAD"} ${check.title}`);
          if (check.missingMust.length) console.log(`  missing: ${check.missingMust.join(", ")}`);
          if (!check.hasExpected) console.log("  expected: no expected phrase");
          if (check.avoided.length) console.log(`  avoided: ${check.avoided.join(", ")}`);
        }
      }
      const ratio = total ? Math.round((passed / total) * 100) : 0;
      console.log(`\nADVERSARIAL TOTAL ${passed}/${total} ratio=${ratio}%`);
      if (ratio < 70) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { CASES, runAdversarialProbe };
