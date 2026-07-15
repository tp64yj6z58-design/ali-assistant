const AI_AGENT_COPY = {
  title: "הסוכן האישי שלי",
  status: "מחובר וזמין",
  inputLabel: "כתוב הודעה לסוכן האישי",
  placeholder: "כתוב מה אתה מחפש...",
  send: "שלח",
  loading: "הסוכן מחפש עבורך...",
  intro: "היי, אני הסוכן האישי שלך לקניות באלי אקספרס. כתוב לי מה אתה מחפש, ואם חסר פרט אשאל אותך לפני שאחפש."
};

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
}

function createStatusDot() {
  return createElement("span", {
    className: "ai-agent-status-dot",
    attributes: { "aria-hidden": "true" }
  });
}

function createMessage(role, text, extraClass = "") {
  return createElement("div", {
    className: `ai-agent-message ${role}${extraClass ? ` ${extraClass}` : ""}`,
    text,
    attributes: { role: "listitem", dir: "auto" }
  });
}

function getFocusableElements(container) {
  return [...container.querySelectorAll([
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])"
  ].join(","))].filter((element) => element.offsetParent !== null);
}

function formatPrice(product) {
  if (!product.currentPrice) return "מחיר לא זמין";
  return `${product.currentPrice} ${product.currency || ""}`.trim();
}

function createProductCard(product) {
  const card = createElement("article", { className: "ai-agent-product-card", attributes: { dir: "auto" } });
  const image = createElement("img", {
    attributes: {
      src: product.image || "",
      alt: product.title || "AliExpress product",
      loading: "lazy"
    }
  });

  const content = createElement("div");
  content.appendChild(createElement("h3", { text: product.title || "AliExpress product" }));

  const price = createElement("div", { className: "ai-agent-product-price" });
  price.appendChild(createElement("span", { text: formatPrice(product) }));
  if (product.originalPrice) {
    price.appendChild(createElement("del", { text: `${product.originalPrice} ${product.currency || ""}`.trim() }));
  }
  if (product.discount) {
    price.appendChild(createElement("span", { text: `${product.discount}% הנחה` }));
  }
  content.appendChild(price);

  const meta = [];
  if (product.rating) meta.push(`דירוג ${product.rating}`);
  if (product.orders) meta.push(`${Number(product.orders).toLocaleString("he-IL")} הזמנות`);
  if (meta.length) content.appendChild(createElement("div", { className: "ai-agent-product-meta", text: meta.join(" · ") }));
  if (product.explanation) content.appendChild(createElement("p", { text: product.explanation }));

  if (product.promotion_link) {
    content.appendChild(createElement("a", {
      className: "ai-agent-product-link",
      text: "פתח מוצר",
      attributes: {
        href: product.promotion_link,
        target: "_blank",
        rel: "noreferrer"
      }
    }));
  }

  card.append(image, content);
  return card;
}

function initPersonalAgentUi() {
  let lastFocusedElement = null;
  let sessionId = localStorage.getItem("aliAgentSessionId") || "";

  const launcher = createElement("button", {
    className: "ai-agent-launcher",
    text: "AI",
    attributes: {
      type: "button",
      "aria-label": "פתח את הסוכן האישי",
      "aria-haspopup": "dialog",
      "aria-expanded": "false"
    }
  });
  launcher.appendChild(createStatusDot());

  const overlay = createElement("div", {
    className: "ai-agent-overlay",
    attributes: { "aria-hidden": "true" }
  });
  const backdrop = createElement("div", { className: "ai-agent-backdrop" });
  const drawer = createElement("aside", {
    className: "ai-agent-drawer",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "ai-agent-title",
      tabindex: "-1"
    }
  });

  const header = createElement("header", { className: "ai-agent-header" });
  const avatar = createElement("div", {
    className: "ai-agent-avatar",
    text: "AI",
    attributes: { "aria-hidden": "true" }
  });
  avatar.appendChild(createStatusDot());

  const titleWrap = createElement("div", { className: "ai-agent-title" });
  titleWrap.appendChild(createElement("strong", {
    text: AI_AGENT_COPY.title,
    attributes: { id: "ai-agent-title" }
  }));
  titleWrap.appendChild(createElement("span", { text: AI_AGENT_COPY.status }));

  const closeButton = createElement("button", {
    className: "ai-agent-close",
    text: "×",
    attributes: {
      type: "button",
      "aria-label": "סגור את הסוכן האישי"
    }
  });

  header.append(avatar, titleWrap, closeButton);

  const messages = createElement("div", {
    className: "ai-agent-messages",
    attributes: {
      role: "list",
      "aria-live": "polite"
    }
  });
  messages.appendChild(createMessage("assistant", AI_AGENT_COPY.intro));

  const quickReplies = createElement("div", { className: "ai-agent-quick-replies" });
  const footer = createElement("footer", { className: "ai-agent-footer" });
  const form = createElement("form", { className: "ai-agent-form" });
  const input = createElement("textarea", {
    className: "ai-agent-input",
    attributes: {
      rows: "1",
      "aria-label": AI_AGENT_COPY.inputLabel,
      placeholder: AI_AGENT_COPY.placeholder
    }
  });
  const sendButton = createElement("button", {
    className: "ai-agent-send",
    text: AI_AGENT_COPY.send,
    attributes: { type: "submit" }
  });
  form.append(input, sendButton);
  footer.append(quickReplies, form);

  drawer.append(header, messages, footer);
  overlay.append(backdrop, drawer);
  document.body.append(launcher, overlay);

  function openDrawer() {
    lastFocusedElement = document.activeElement;
    overlay.classList.add("is-open");
    overlay.removeAttribute("aria-hidden");
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => input.focus(), 30);
  }

  function closeDrawer() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function keepFocusInside(event) {
    if (!overlay.classList.contains("is-open") || event.key !== "Tab") return;
    const focusable = getFocusableElements(drawer);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function scrollMessages() {
    messages.scrollTop = messages.scrollHeight;
  }

  function setBusy(isBusy) {
    input.disabled = isBusy;
    sendButton.disabled = isBusy;
    input.setAttribute("aria-busy", String(isBusy));
  }

  function renderQuickReplies(items = []) {
    quickReplies.innerHTML = "";
    items.slice(0, 5).forEach((item) => {
      const button = createElement("button", {
        text: item,
        attributes: { type: "button" }
      });
      button.addEventListener("click", () => sendAgentMessage(item));
      quickReplies.appendChild(button);
    });
  }

  function appendProducts(products = []) {
    if (!products.length) return;
    const list = createElement("div", {
      className: "ai-agent-products",
      attributes: { role: "listitem" }
    });
    products.forEach((product) => list.appendChild(createProductCard(product)));
    messages.appendChild(list);
  }

  async function sendAgentMessage(value) {
    const text = value.trim();
    if (!text || input.disabled) return;

    messages.appendChild(createMessage("user", text));
    input.value = "";
    renderQuickReplies([]);
    const loading = createMessage("assistant", AI_AGENT_COPY.loading, "agent-loading");
    messages.appendChild(loading);
    scrollMessages();
    setBusy(true);

    try {
      const response = await fetch("/api/agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "הסוכן לא הצליח להשלים את הבקשה.");

      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem("aliAgentSessionId", sessionId);
      }

      loading.remove();
      messages.appendChild(createMessage("assistant", data.reply || ""));
      appendProducts(data.products || []);
      renderQuickReplies(data.quickReplies || []);
    } catch (error) {
      loading.remove();
      messages.appendChild(createMessage("assistant", error.message || "משהו השתבש. נסה שוב עוד רגע."));
    } finally {
      setBusy(false);
      input.focus();
      scrollMessages();
    }
  }

  launcher.addEventListener("click", openDrawer);
  closeButton.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeDrawer();
    keepFocusInside(event);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAgentMessage(input.value);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendAgentMessage(input.value);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPersonalAgentUi);
} else {
  initPersonalAgentUi();
}
