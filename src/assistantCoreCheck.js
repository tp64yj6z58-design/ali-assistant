const assert = require("node:assert/strict");
const { analyzeShoppingIntent } = require("./aiAssistantCore");

async function main() {
  const vagueCar = await analyzeShoppingIntent("אני צריך משהו טוב לרכב", { skipLlm: true });
  assert.equal(Boolean(vagueCar.clarification), true);
  assert.equal(vagueCar.category, "car");
  assert.ok(vagueCar.clarification.options.includes("מטען מהיר לרכב USB-C"));

  const mixed = await analyzeShoppingIntent("מטען usb c לרכב Baseus", { skipLlm: true });
  assert.equal(mixed.language, "he");
  assert.ok(mixed.profile.requiredTerms.includes("car"));
  assert.ok(mixed.profile.requiredTerms.includes("charger"));
  assert.ok(mixed.brands.includes("baseus"));
  assert.equal(mixed.profile.requiredTerms.includes("baseus"), false);

  const gift = await analyzeShoppingIntent("מחפש מתנה מגניבה", { skipLlm: true });
  assert.equal(Boolean(gift.clarification), true);
  assert.ok(gift.clarification.options.length >= 3);

  const giftOption = await analyzeShoppingIntent("מתנה לאישה - תכשיט", { skipLlm: true });
  assert.ok(giftOption.profile.requiredTerms.includes("women"));
  assert.ok(giftOption.profile.requiredTerms.includes("jewelry"));

  const alias = await analyzeShoppingIntent("kitty plush", { skipLlm: true });
  assert.ok(alias.profile.requiredTerms.includes("cat"));
  assert.ok(alias.profile.requiredTerms.includes("plush"));
  assert.ok(alias.alternatives.some((item) => item.includes("cat")));

  const blender = await analyzeShoppingIntent("portable blender", { skipLlm: true });
  assert.ok(blender.profile.requiredTerms.includes("portable"));
  assert.ok(blender.profile.requiredTerms.includes("blender"));

  console.log("Assistant core checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
