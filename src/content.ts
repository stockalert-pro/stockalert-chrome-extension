import { findTickerMentions } from "./tickers";

(() => {
if (document.documentElement.dataset.stockalertLoaded === "true") {
  return;
}
document.documentElement.dataset.stockalertLoaded = "true";

const PRODUCT_NAME = "StockAlert.pro";
const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_PAGE_TICKERS = 80;
const MAX_TICKERS_PER_TEXT_NODE = 8;
const TOOLTIP_OFFSET = 14;
const SKIP_SELECTOR = [
  "button",
  "code",
  "footer",
  "input",
  "nav",
  "noscript",
  "option",
  "pre",
  "script",
  "select",
  "style",
  "svg",
  "textarea",
  "time",
  "[contenteditable='true']",
  "[role='contentinfo']",
  "[role='navigation']",
  ".stockalert-ticker",
  ".stockalert-card",
].join(",");

let card: HTMLElement | null = null;
let activeTicker: string | null = null;
let detectedTickerCount = 0;
let scanTimer: number | null = null;

function ensureCard(): HTMLElement {
  if (card) return card;
  card = document.createElement("div");
  card.className = "stockalert-card";
  document.documentElement.append(card);
  return card;
}

function moveCard(pointerX: number, pointerY: number): void {
  const node = ensureCard();
  node.classList.add("visible");
  const width = node.offsetWidth || 320;
  const height = node.offsetHeight || 220;
  const left = Math.min(window.scrollX + pointerX + TOOLTIP_OFFSET, window.scrollX + window.innerWidth - width - 12);
  const top = Math.min(window.scrollY + pointerY + TOOLTIP_OFFSET, window.scrollY + window.innerHeight - height - 12);
  node.style.left = `${Math.max(window.scrollX + 12, left)}px`;
  node.style.top = `${Math.max(window.scrollY + 12, top)}px`;
}

function setCardStatus(message: string, tone: "muted" | "success" | "error" = "muted"): void {
  const node = ensureCard().querySelector(".stockalert-status");
  if (!(node instanceof HTMLElement)) return;
  node.className = `stockalert-status ${tone}`;
  node.textContent = message;
}

function createAppIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "stockalert-mark");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("width", "28");
  svg.setAttribute("height", "28");
  svg.setAttribute("aria-hidden", "true");

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "64");
  background.setAttribute("height", "64");
  background.setAttribute("fill", "#000000");

  const bell = document.createElementNS(SVG_NS, "path");
  bell.setAttribute("d", "M28 17c-8.6 0-13.4 6.3-13.4 14.5v8L9.5 47h37l-5.1-7.5v-8C41.4 23.3 36.6 17 28 17z");
  bell.setAttribute("fill", "none");
  bell.setAttribute("stroke", "#FFFFFF");
  bell.setAttribute("stroke-width", "5.5");
  bell.setAttribute("stroke-linejoin", "round");

  const clapper = document.createElementNS(SVG_NS, "path");
  clapper.setAttribute("d", "M22.9 52.8a5.1 5.1 0 0 0 10.2 0");
  clapper.setAttribute("fill", "none");
  clapper.setAttribute("stroke", "#FFFFFF");
  clapper.setAttribute("stroke-width", "5.5");
  clapper.setAttribute("stroke-linecap", "round");

  const spark = document.createElementNS(SVG_NS, "path");
  spark.setAttribute("d", "M50 3l3 8 8 3-8 3-3 8-3-8-8-3 8-3z");
  spark.setAttribute("fill", "#2563EB");

  svg.append(background, bell, clapper, spark);
  return svg;
}

function renderCard(ticker: string, pointerX: number, pointerY: number): void {
  activeTicker = ticker;
  const node = ensureCard();
  node.replaceChildren();

  const header = document.createElement("header");
  header.className = "stockalert-card-head";
  const titleWrap = document.createElement("div");
  titleWrap.className = "stockalert-title-wrap";
  const mark = createAppIcon();
  const copy = document.createElement("div");
  copy.className = "stockalert-title";
  const strong = document.createElement("strong");
  strong.textContent = ticker;
  const span = document.createElement("span");
  span.textContent = PRODUCT_NAME;
  copy.append(strong, span);
  titleWrap.append(mark, copy);
  header.append(titleWrap);

  const actions = document.createElement("div");
  actions.className = "stockalert-actions";

  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "stockalert-btn primary";
  createBtn.textContent = "Create Alert";
  createBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: "OPEN_ALERT_MODAL", payload: { symbol: ticker } }, (response) => {
      if (response?.success) {
        setCardStatus("Alert form opened in StockAlert.pro.", "success");
        return;
      }
      setCardStatus(response?.error || "Could not open the alert form.", "error");
    });
  });

  const watchlistBtn = document.createElement("button");
  watchlistBtn.type = "button";
  watchlistBtn.className = "stockalert-btn";
  watchlistBtn.textContent = "Add to Watchlist";
  watchlistBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: "ADD_TO_WATCHLIST", payload: { symbol: ticker } }, (response) => {
      if (response?.success) {
        setCardStatus(`${ticker} added to your watchlist.`, "success");
        return;
      }
      setCardStatus(response?.error || "Could not update watchlist.", "error");
    });
  });

  actions.append(createBtn, watchlistBtn);

  const status = document.createElement("p");
  status.className = "stockalert-status muted";
  status.textContent = "Create a price alert or save this ticker. Page text stays in your browser.";

  node.append(header, actions, status);
  moveCard(pointerX, pointerY);
}

function hideCard(): void {
  activeTicker = null;
  card?.classList.remove("visible");
}

function hideCardOnOutsideClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (card?.contains(target)) return;
  if ((target as Element).closest?.(".stockalert-ticker")) return;
  hideCard();
}

function wrapTextNode(textNode: Text, remaining: { count: number }): void {
  const text = textNode.nodeValue ?? "";
  const mentions = findTickerMentions(text, MAX_TICKERS_PER_TEXT_NODE);
  if (!mentions.length) return;

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const mention of mentions) {
    if (remaining.count <= 0) break;
    fragment.append(text.slice(cursor, mention.start));

    const tickerNode = document.createElement("span");
    tickerNode.className = "stockalert-ticker";
    tickerNode.dataset.ticker = mention.ticker;
    tickerNode.tabIndex = 0;
    tickerNode.title = `Click to create a StockAlert.pro alert for ${mention.ticker}`;
    tickerNode.textContent = text.slice(mention.start, mention.end);
    tickerNode.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      renderCard(mention.ticker, event.clientX, event.clientY);
    });
    tickerNode.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const rect = tickerNode.getBoundingClientRect();
      renderCard(mention.ticker, rect.left, rect.bottom);
    });
    fragment.append(tickerNode);

    cursor = mention.end;
    remaining.count -= 1;
    detectedTickerCount += 1;
  }

  fragment.append(text.slice(cursor));
  textNode.replaceWith(fragment);
}

function isUppercaseUiNoise(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) return false;
  let uppercase = 0;
  for (const character of letters) {
    if (character >= "A" && character <= "Z") uppercase += 1;
  }
  return uppercase / letters.length >= 0.85;
}

function shouldSkipTextNode(textNode: Text): boolean {
  const parent = textNode.parentElement;
  if (!parent || parent.closest(SKIP_SELECTOR)) return true;
  const text = textNode.nodeValue ?? "";
  if (text.trim().length < 2) return true;
  return isUppercaseUiNoise(text);
}

function scanPage(): void {
  if (!document.body || detectedTickerCount >= MAX_PAGE_TICKERS) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (shouldSkipTextNode(node as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  const remaining = { count: MAX_PAGE_TICKERS - detectedTickerCount };
  for (const textNode of textNodes) {
    if (remaining.count <= 0) break;
    wrapTextNode(textNode, remaining);
  }
}

function scheduleScan(): void {
  if (scanTimer !== null) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scanPage();
  }, 500);
}

scanPage();

if (document.body) {
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length > 0)) scheduleScan();
  }).observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("click", hideCardOnOutsideClick, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeTicker) hideCard();
});
})();
