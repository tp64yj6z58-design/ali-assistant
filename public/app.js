const form = document.querySelector("#searchForm");
const input = document.querySelector("#query");
const results = document.querySelector("#results");
const statusEl = document.querySelector("#status");

async function loadStatus() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    statusEl.textContent = health.aliExpressConnected
      ? "מחובר ל-AliExpress Affiliate"
      : "מצב דמו: מחכה למפתחות AliExpress";
    statusEl.classList.toggle("live", health.aliExpressConnected);
  } catch {
    statusEl.textContent = "לא ניתן לבדוק חיבור כרגע";
  }
}

function money(product) {
  if (!product.price) return "מחיר לא זמין";
  return `${product.price} ${product.currency || ""}`.trim();
}

function renderProducts(data) {
  if (!data.products.length) {
    results.innerHTML = `<div class="empty">לא נמצאו מוצרים מספיק טובים. נסה ניסוח אחר.</div>`;
    return;
  }

  results.innerHTML = data.products.map((product, index) => `
    <article class="product">
      <div class="rank">${index + 1}</div>
      <h2>${escapeHtml(product.title)}</h2>
      <div class="meta">
        <span class="pill">${escapeHtml(money(product))}</span>
        <span class="pill">ציון ${product.score}</span>
        ${product.rating ? `<span class="pill">דירוג ${product.rating}</span>` : ""}
        ${product.orders ? `<span class="pill">${Number(product.orders).toLocaleString("he-IL")} הזמנות</span>` : ""}
      </div>
      <ul class="reasons">
        ${product.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <a href="${escapeAttribute(product.productUrl)}" target="_blank" rel="noreferrer">פתח מוצר</a>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  const button = form.querySelector("button");
  button.disabled = true;
  results.innerHTML = `<div class="loading">סורק מוצרים ומדרג אפשרויות...</div>`;

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || "החיפוש נכשל");
    renderProducts(data);
  } catch (error) {
    results.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
  }
});

loadStatus();
