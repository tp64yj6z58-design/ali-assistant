const form = document.querySelector("#searchForm");
const input = document.querySelector("#query");
const results = document.querySelector("#results");
const statusEl = document.querySelector("#status");
const exampleButtons = document.querySelectorAll("[data-query]");
const navLinks = document.querySelectorAll(".navLinks a");
const toggleSections = document.querySelectorAll(".toggleSection");

let lastQuery = "";
let loadingTimer = null;
let activeSearchId = 0;
let activeSearchController = null;

const loadingSteps = {
  he: [
    "מנתח את הבקשה ומזהה איזה מוצר באמת מחפשים...",
    "סורק כמה ניסוחי חיפוש באלי אקספרס...",
    "מסנן אביזרים ומוצרים לא קשורים...",
    "מדרג לפי התאמה, מחיר, דירוג וכמות הזמנות..."
  ],
  en: [
    "Understanding the exact product intent...",
    "Scanning multiple AliExpress search angles...",
    "Filtering accessories and unrelated items...",
    "Ranking by fit, price, rating and order volume..."
  ]
};

async function loadStatus() {
  if (!statusEl) return;
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

function setActivePanel(id) {
  const normalizedId = ["how", "categories", "contact"].includes(id) ? id : "";

  toggleSections.forEach((section) => {
    const isOpen = section.id === normalizedId;
    section.hidden = !isOpen;
    section.classList.toggle("is-open", isOpen);
  });

  navLinks.forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "") || "";
    link.classList.toggle("active", target === (normalizedId || "home"));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href")?.replace("#", "") || "";
    if (["how", "categories", "contact", "home"].includes(id)) {
      event.preventDefault();
      setActivePanel(id);
      const target = id === "home" ? document.querySelector("#home") : document.querySelector(`#${id}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", id === "home" ? "#home" : `#${id}`);
    }
  });
});

function detectLanguage(value) {
  return /[\u0590-\u05ff]/.test(String(value || "")) ? "he" : "en";
}

function money(product, language) {
  if (!product.price) return language === "en" ? "Price unavailable" : "מחיר לא זמין";
  return `${product.price} ${product.currency || ""}`.trim();
}

function labels(language) {
  return language === "en"
    ? {
        score: "Score",
        fit: "Fit",
        rating: "Rating",
        orders: "orders",
        open: "Open product",
        good: "Good match",
        bad: "Not relevant",
        noResults: "I did not find products strong enough. Try a more specific search.",
        improve: "Try one of these sharper searches:"
      }
    : {
        score: "ציון",
        fit: "התאמה",
        rating: "דירוג",
        orders: "הזמנות",
        open: "פתח מוצר",
        good: "מתאים",
        bad: "לא מתאים",
        noResults: "לא מצאתי מוצרים מספיק מדויקים כדי להמליץ עליהם.",
        improve: "אפשר לדייק את החיפוש כך:"
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
    scrollToResults();
    return;
  }

  if (!data.products.length) {
    results.innerHTML = `
      <div class="empty" dir="${data.language === "en" ? "ltr" : "rtl"}">
        <strong>${escapeHtml(data.assistantSummary || ui.noResults)}</strong>
        ${renderRefinements(data.refinementOptions, ui)}
      </div>
    `;
    bindQueryButtons(results.querySelectorAll("[data-query]"));
    scrollToResults();
    return;
  }

  const summary = `
    <div class="assistantNote" dir="${data.language === "en" ? "ltr" : "rtl"}">
      <div class="assistantBadge">AI</div>
      <div>
        <p>${escapeHtml(data.assistantSummary || "")}</p>
        <div class="confidenceBar" aria-label="${ui.fit} ${data.confidence || 0}%">
          <span style="width:${Math.max(8, Math.min(100, data.confidence || 0))}%"></span>
        </div>
      </div>
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
        <span class="pill">${ui.fit} ${product.confidence || data.confidence || 0}%</span>
        <span class="pill">${ui.score} ${product.score}</span>
        ${product.rating ? `<span class="pill">${ui.rating} ${product.rating}</span>` : ""}
        ${product.orders ? `<span class="pill">${Number(product.orders).toLocaleString(data.language === "en" ? "en-US" : "he-IL")} ${ui.orders}</span>` : ""}
      </div>
      <ul class="reasons">
        ${product.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
      <div class="feedback" data-product-id="${escapeAttribute(product.id || product.title)}" data-title="${escapeAttribute(product.title)}" data-url="${escapeAttribute(product.productUrl)}">
        <button type="button" data-feedback="good">${ui.good}</button>
        <button type="button" data-feedback="bad">${ui.bad}</button>
      </div>
      <a href="${escapeAttribute(product.productUrl)}" target="_blank" rel="noreferrer">${ui.open}</a>
    </article>
  `).join("");

  bindFeedback();
  scrollToResults();
}

function renderRefinements(options = [], ui) {
  if (!options.length) return "";
  return `
    <p>${ui.improve}</p>
    <div class="clarifyOptions">
      ${options.map((option) => `<button type="button" data-query="${escapeAttribute(option)}">${escapeHtml(option)}</button>`).join("")}
    </div>
  `;
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
  const searchId = activeSearchId + 1;
  activeSearchId = searchId;
  if (activeSearchController) activeSearchController.abort();
  activeSearchController = new AbortController();
  lastQuery = query;
  input.value = query;
  const language = detectLanguage(query);
  const button = form.querySelector("button");
  button.disabled = true;
  input.setAttribute("aria-busy", "true");
  results.setAttribute("aria-busy", "true");
  showLoading(language);
  scrollToResults();

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      signal: activeSearchController.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (searchId !== activeSearchId) return;
    if (!response.ok) throw new Error(data.error || (language === "en" ? "Search failed" : "החיפוש נכשל"));
    renderProducts(data);
  } catch (error) {
    if (error.name === "AbortError" || searchId !== activeSearchId) return;
    results.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    scrollToResults();
  } finally {
    if (searchId === activeSearchId) {
      clearLoading();
      button.disabled = false;
      input.removeAttribute("aria-busy");
      results.removeAttribute("aria-busy");
    }
  }
}

function scrollToResults() {
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showLoading(language) {
  clearLoading();
  const steps = loadingSteps[language] || loadingSteps.he;
  let index = 0;
  results.innerHTML = renderLoading(steps, index);
  loadingTimer = setInterval(() => {
    index = Math.min(index + 1, steps.length - 1);
    results.innerHTML = renderLoading(steps, index);
  }, 850);
}

function renderLoading(steps, activeIndex) {
  return `
    <div class="loading">
      <div class="assistantBadge">AI</div>
      <div class="loadingSteps">
        ${steps.map((step, index) => `<span class="${index <= activeIndex ? "active" : ""}">${escapeHtml(step)}</span>`).join("")}
      </div>
    </div>
  `;
}

function clearLoading() {
  if (loadingTimer) clearInterval(loadingTimer);
  loadingTimer = null;
}

function bindQueryButtons(buttons) {
  buttons.forEach((button) => {
    button.addEventListener("click", () => search(button.dataset.query));
  });
}

function bindFeedback() {
  results.querySelectorAll("[data-feedback]").forEach((button) => {
    button.addEventListener("click", async () => {
      const box = button.closest(".feedback");
      box.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");

      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: lastQuery,
            productId: box.dataset.productId,
            title: box.dataset.title,
            url: box.dataset.url,
            feedback: button.dataset.feedback
          })
        });
      } catch {
        // Feedback is helpful, but it should never block the shopper.
      }
    });
  });
}

bindQueryButtons(exampleButtons);
setActivePanel(window.location.hash.replace("#", ""));
loadStatus();
