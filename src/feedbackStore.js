const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const feedbackFile = path.join(os.tmpdir(), "ali-assistant-feedback.jsonl");

function saveFeedback(payload = {}) {
  const row = {
    createdAt: new Date().toISOString(),
    query: String(payload.query || "").slice(0, 220),
    productId: String(payload.productId || "").slice(0, 180),
    feedback: payload.feedback === "good" ? "good" : "bad",
    title: String(payload.title || "").slice(0, 500),
    url: String(payload.url || "").slice(0, 900)
  };

  const line = `${JSON.stringify(row)}\n`;
  try {
    fs.appendFileSync(feedbackFile, line, "utf8");
  } catch (error) {
    console.warn("Could not persist feedback", error.message);
  }

  console.log("ALI_ASSISTANT_FEEDBACK", JSON.stringify(row));
  return row;
}

module.exports = { saveFeedback };
