const form = document.querySelector("#searchForm");
const input = document.querySelector("#query");
const results = document.querySelector("#results");
const statusEl = document.querySelector("#status");
const exampleButtons = document.querySelectorAll("[data-query]");

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

function money(product, language) {
  if (!product.price) return language === "en" ? "Price unavailable" : "מחיר לא זמין";
  return `${product.price} ${product.currency || ""}`.trim();
}

function labels(language) {
  return language === "en"
    ? {
        score: "Score",
        rating: "Rating",
        orders: "orders",
        open: "Open product",
        good: "Good match",
        bad: "Not relevant",
        noResults: "I did not find products strong enough. Try a more specific search."
      }
    : {
        score: "ציון",
        rating: "דירוג",
        orders: "הזמנות",
        open: "פתח מוצר",
        good: "מתאים",
        bad: "לא מתאים",
        noResults: "לא נמצאו מוצרים מספיק טובים. נסה ניסוח אחר."
      };
}

function renderProducts(data) {
  const ui = labels(data.language);

  if (data.needsClarification) {
    results.innerHTML = `
      <div class="assistantNote clarification" dir="${data.language === "en" ? "ltr" : "rtl"}">
        <div class="assistantBadge">AI</div>
        <div>
          <p>${escapeHtml(data.clarificationQuestion || data.assistantSummary)}</p>
          <div class="clarifyOptions">
            ${(data.clarificationOptions || []).map((option) => `<button type="button" data-query="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}
          </div>
        </div>
      </div>
    `;
    bindQueryButtons(results.querySelectorAll("[data-query]"));
    return;
  }

  if (!data.products.length) {
    results.innerHTML = `<div class="empty">${escapeHtml(data.assistantSummary || ui.noResults)}</div>`;
    return;
  }

  const summary = `
    <div class="assistantNote" dir="${data.language === "en" ? "ltr" : "rtl"}">
      <div class="assistantBadge">AI</div>
      <p>${escapeHtml(data.assistantSummary || "")}</p>
    </div>
  `;

  results.innerHTML = summary + data.products.map((product, index) => `
    <article class="product" dir="${data.language === "en" ? "ltr" : "rtl"}">
      <div class="productImageWrap">
        <img class="productImage" src="${escapeAttribute(product.imageUrl)}" alt="${escapeAttribute(product.title)}" loading="lazy">
        <div class="rank">${index + 1}</div>
      </div>
      <h2 dir="auto">${escapeHtml(product.title)}</h2>
      <div class="meta">
        <span class="pill">${escapeHtml(money(product, data.language))}</span>
        <span class="pill">${ui.score} ${product.score}</span>
        ${product.rating ? `<span class="pill">${ui.rating} ${product.rating}</span>` : ""}
        ${product.orders ? `<span class="pill">${Number(product.orders).toLocaleString(data.language === "en" ? "en-US" : "he-IL")} ${ui.orders}</span>` : ""}
      </div>
      <ul class="reasons">
        ${product.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <div class="feedback" data-product-id="${escapeAttribute(product.id || product.title)}">
        <button type="button" data-feedback="good">${ui.good}</button>
        <button type="button" data-feedback="bad">${ui.bad}</button>
      </div>
      <a href="${escapeAttribute(product.productUrl)}" target="_blank" rel="noreferrer">${ui.open}</a>
    </article>
  `).join("");

  bindFeedback();
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
  search(input.value.trim());
});

async function search(query) {
  if (!query) return;
  input.value = query;
  const button = form.querySelector("button");
  button.disabled = true;
  results.innerHTML = `<div class="loading">סורק מוצרים, משווה נתונים ובוחר את האפשרויות הכי חזקות...</div>`;

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
}

function bindQueryButtons(buttons) {
  buttons.forEach((button) => {
    button.addEventListener("click", () => search(button.dataset.query));
  });
}

function bindFeedback() {
  results.querySelectorAll("[data-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = button.closest(".feedback");
      box.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });
}

bindQueryButtons(exampleButtons);
loadStatus();
