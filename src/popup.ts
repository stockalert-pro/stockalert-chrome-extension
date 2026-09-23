import "./styles.css";

import {
  buildCreateAlertRequest,
  coerceParameterValue,
  getMissingRequiredParameters,
  isAlertFormValid,
  renderParameterField,
} from "./alert-form";
import {
  API_DOCS_URL,
  BRAND_LOGO_DARK,
  DASHBOARD_API_KEYS_URL,
  DASHBOARD_UPGRADE_URL,
  PRIVACY_URL,
  PRODUCT_NAME,
  SITE_URL,
} from "./branding";
import { el } from "./dom";
import { isStockAlertPage, pageDetectionHostLabel, pageDetectionOriginPattern } from "./page-detection";
import {
  addEnabledDetectionOrigin,
  clearPendingTicker,
  loadEnabledDetectionOrigins,
  loadPendingTicker,
  loadSettings,
  removeEnabledDetectionOrigin,
  saveSettings,
} from "./storage";
import {
  ALERT_CATEGORIES,
  ALERT_TYPES,
  AlertCondition,
  BASIC_ALERT_CATEGORY_IDS,
  BASIC_ALERT_UPGRADE_MESSAGE,
  isBasicAlertCondition,
  Subscription,
  WatchlistItem,
} from "./types";

type State = {
  apiKey: string;
  condition: AlertCondition | "";
  error: string | null;
  isPremium: boolean | null;
  notice: string | null;
  pageDetectionEnabled: boolean;
  pageDetectionHost: string | null;
  pageScanMessage: string | null;
  parameters: Record<string, unknown>;
  saving: boolean;
  status: string | null;
  symbol: string;
  threshold: string;
  watchlist: WatchlistItem[];
};

const app = document.querySelector<HTMLElement>("#app");

function sendMessage<T>(type: string, payload?: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  return chrome.runtime.sendMessage({ type, payload });
}

async function loadAccount(): Promise<{ error: string | null; isPremium: boolean | null; watchlist: WatchlistItem[] }> {
  const [watchlistResponse, subscriptionResponse] = await Promise.all([
    sendMessage<WatchlistItem[]>("GET_WATCHLIST"),
    sendMessage<Subscription | null>("GET_SUBSCRIPTION"),
  ]);
  return {
    error: watchlistResponse.success ? null : watchlistResponse.error || "Could not load watchlist.",
    isPremium: subscriptionResponse.data?.is_premium ?? null,
    watchlist: watchlistResponse.success ? (watchlistResponse.data ?? []) : [],
  };
}

async function readPageDetectionState(): Promise<{
  blockedMessage: string | null;
  enabled: boolean;
  host: string | null;
  origin: string | null;
  tabId: number | null;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return {
      blockedMessage: "Open a webpage tab before enabling ticker detection.",
      enabled: false,
      host: null,
      origin: null,
      tabId: null,
    };
  }
  if (!tab.url || !/^https?:\/\//.test(tab.url)) {
    return {
      blockedMessage: "Ticker detection can only be enabled on regular web pages.",
      enabled: false,
      host: null,
      origin: null,
      tabId: tab.id,
    };
  }
  if (isStockAlertPage(tab.url)) {
    return {
      blockedMessage: "Ticker detection is disabled on StockAlert.pro pages.",
      enabled: false,
      host: null,
      origin: null,
      tabId: tab.id,
    };
  }
  const origin = pageDetectionOriginPattern(tab.url);
  if (!origin) {
    return {
      blockedMessage: "Ticker detection can only be enabled on regular web pages.",
      enabled: false,
      host: null,
      origin: null,
      tabId: tab.id,
    };
  }
  const stored = await loadEnabledDetectionOrigins();
  const permitted = await chrome.permissions.contains({ origins: [origin] });
  return {
    blockedMessage: null,
    enabled: stored.includes(origin) && permitted,
    host: pageDetectionHostLabel(origin),
    origin,
    tabId: tab.id,
  };
}

async function enableSiteDetection(): Promise<State["pageScanMessage"]> {
  const current = await readPageDetectionState();
  if (current.blockedMessage || !current.origin || !current.tabId) {
    return current.blockedMessage || "Ticker detection can only be enabled on regular web pages.";
  }
  const granted = await chrome.permissions.request({ origins: [current.origin] });
  if (!granted) {
    return "Chrome needs site access so ticker detection can stay on after reload.";
  }
  await addEnabledDetectionOrigin(current.origin);
  const synced = await sendMessage("SYNC_PAGE_DETECTION", { tabId: current.tabId });
  if (!synced.success) return synced.error || "Ticker detection was allowed, but Chrome could not start it on this tab.";
  return `Ticker detection stays on for ${current.host} after reloads.`;
}

async function disableSiteDetection(): Promise<string> {
  const current = await readPageDetectionState();
  if (!current.origin) return "Ticker detection is not on for this site.";
  await chrome.permissions.remove({ origins: [current.origin] });
  await removeEnabledDetectionOrigin(current.origin);
  await sendMessage("SYNC_PAGE_DETECTION");
  return `Ticker detection turned off for ${current.host}. Reload the page to remove highlights.`;
}

function conditionSelect(state: State, render: (next: State) => void): HTMLSelectElement {
  const select = el("select", { class: "select", id: "alert-condition" }) as HTMLSelectElement;
  select.append(el("option", { value: "" }, ["Select alert type..."]));
  for (const category of ALERT_CATEGORIES) {
    const locked = state.isPremium === false && !BASIC_ALERT_CATEGORY_IDS.has(category.id);
    const group = document.createElement("optgroup");
    group.label = locked ? `${category.label} (Premium)` : category.label;
    for (const condition of category.conditions) {
      const option = el("option", { value: condition }, [ALERT_TYPES[condition].label]) as HTMLOptionElement;
      if (locked) option.disabled = true;
      if (state.condition === condition) option.setAttribute("selected", "selected");
      group.append(option);
    }
    select.append(group);
  }
  select.addEventListener("change", () => {
    render({ ...state, condition: select.value as AlertCondition | "", parameters: {}, threshold: "" });
  });
  return select;
}

function collectParameters(root: HTMLElement, condition: AlertCondition | ""): Record<string, unknown> {
  if (!condition) return {};
  const definitions = new Map((ALERT_TYPES[condition].parameters ?? []).map((param) => [param.name, param]));
  const parameters: Record<string, unknown> = {};
  root.querySelectorAll("[data-param]").forEach((input) => {
    const element = input as HTMLInputElement | HTMLSelectElement;
    const paramName = (input as HTMLElement).dataset.param;
    if (!paramName) return;
    const definition = definitions.get(paramName);
    if (!definition) return;
    const rawValue =
      element instanceof HTMLInputElement && element.type === "checkbox" ? element.checked : element.value;
    const coercedValue = coerceParameterValue(definition, rawValue);
    if (coercedValue !== undefined) parameters[paramName] = coercedValue;
  });
  return parameters;
}

function footer(): HTMLElement {
  return el("footer", { class: "footer" }, [
    el("a", { href: SITE_URL, target: "_blank", rel: "noreferrer" }, ["StockAlert.pro"]),
    el("a", { href: API_DOCS_URL, target: "_blank", rel: "noreferrer" }, ["API docs"]),
    el("a", { href: "options.html", target: "_blank" }, ["Settings"]),
    el("a", { href: PRIVACY_URL, target: "_blank", rel: "noreferrer" }, ["Privacy"]),
  ]);
}

function apiKeyForm(state: State, render: (next: State) => void): HTMLElement {
  const input = el("input", {
    autocomplete: "off",
    class: "input",
    placeholder: "sk_...",
    type: "password",
    value: state.apiKey,
  }) as HTMLInputElement;
  const button = el("button", { class: "button", type: "button" }, ["Save"]);
  button.addEventListener("click", async () => {
    const apiKey = input.value.trim();
    if (!apiKey.startsWith("sk_")) {
      render({ ...state, error: "API keys start with sk_." });
      return;
    }
    await saveSettings({ apiKey });
    const account = await loadAccount();
    render({
      ...state,
      apiKey,
      error: account.error,
      isPremium: account.isPremium,
      notice: "API key saved locally in Chrome.",
      watchlist: account.watchlist,
    });
  });
  return el("div", { class: "form-row" }, [input, button]);
}

function pageDetectionCard(state: State, render: (next: State) => void): HTMLElement {
  const canToggle = Boolean(state.pageDetectionHost);
  const button = el("button", { class: "button secondary full-width", type: "button" }, [
    state.pageDetectionEnabled ? "Turn off for this site" : "Enable ticker detection on this site",
  ]);
  button.addEventListener("click", async () => {
    try {
      const pageScanMessage = state.pageDetectionEnabled
        ? await disableSiteDetection()
        : await enableSiteDetection();
      const next = await readPageDetectionState();
      render({
        ...state,
        pageDetectionEnabled: next.enabled,
        pageDetectionHost: next.host,
        pageScanMessage,
      });
    } catch {
      render({
        ...state,
        pageScanMessage: "Chrome could not update ticker detection for this site.",
      });
    }
  });

  const copy = !canToggle && state.pageScanMessage
    ? state.pageScanMessage
    : state.pageDetectionEnabled
      ? `On for ${state.pageDetectionHost}. Chrome keeps it after reload and scans this site locally.`
      : "Enable once per site. Chrome remembers it across reloads. The page is scanned locally for likely stock tickers.";

  return el("section", { class: "card stack" }, [
    el("p", { class: "eyebrow" }, ["Page ticker detection"]),
    el("p", { class: "muted" }, [copy]),
    canToggle ? button : el("div", { class: "hidden" }),
    canToggle && state.pageScanMessage
      ? el("div", { class: "notice" }, [state.pageScanMessage])
      : el("div", { class: "hidden" }),
  ]);
}

function alertForm(state: State, render: (next: State) => void): HTMLElement {
  const symbol = el("input", {
    class: "input",
    placeholder: "AAPL",
    type: "text",
    value: state.symbol,
  }) as HTMLInputElement;
  symbol.style.textTransform = "uppercase";

  const threshold = el("input", {
    class: "input",
    id: "alert-threshold",
    step: "any",
    type: "number",
    value: state.threshold,
  }) as HTMLInputElement;

  const parameters = el("div", { class: "stack", id: "parameters-group" });
  const alertType = state.condition ? ALERT_TYPES[state.condition] : null;
  if (alertType?.parameters?.length) {
    parameters.innerHTML = alertType.parameters.map((param) => renderParameterField(param)).join("");
  }

  const create = el("button", { class: "button full-width", type: "button" }, [
    state.saving ? "Creating..." : "Create Alert",
  ]);
  if (state.saving) create.setAttribute("disabled", "true");

  const readForm = (): State => {
    const nextParameters = collectParameters(parameters, state.condition);
    return {
      ...state,
      parameters: nextParameters,
      symbol: symbol.value,
      threshold: threshold.value,
    };
  };

  create.addEventListener("click", async () => {
    const next = readForm();
    if (!next.condition) {
      render({ ...next, error: "Choose an alert type." });
      return;
    }
    if (next.isPremium === false && !isBasicAlertCondition(next.condition)) {
      render({ ...next, error: BASIC_ALERT_UPGRADE_MESSAGE });
      return;
    }
    if (
      !isAlertFormValid({
        symbol: next.symbol,
        condition: next.condition,
        threshold: next.threshold,
        parameters: next.parameters,
      })
    ) {
      const missing = getMissingRequiredParameters(next.condition, next.parameters);
      render({ ...next, error: missing.length ? `Please fill: ${missing.join(", ")}` : "Complete the alert form." });
      return;
    }

    render({ ...next, error: null, saving: true });
    const response = await sendMessage("CREATE_ALERT", buildCreateAlertRequest({
      symbol: next.symbol,
      condition: next.condition,
      threshold: next.threshold,
      parameters: next.parameters,
    }));
    if (!response.success) {
      render({ ...next, error: response.error || "Failed to create alert.", saving: false });
      return;
    }
    render({
      ...next,
      condition: "",
      error: null,
      notice: `Alert created for ${next.symbol.trim().toUpperCase()}.`,
      parameters: {},
      saving: false,
      symbol: "",
      threshold: "",
    });
  });

  const children: Array<HTMLElement | string> = [
    el("p", { class: "eyebrow" }, ["Create alert"]),
  ];
  if (state.isPremium === false) {
    children.push(
      el("p", { class: "muted" }, [
        "Price and Time alerts are included. ",
        el("a", { class: "muted-link", href: DASHBOARD_UPGRADE_URL, target: "_blank", rel: "noreferrer" }, [
          "Upgrade to Premium",
        ]),
        " for Death Cross and other types.",
      ])
    );
  }
  children.push(
    el("label", { class: "label" }, ["Stock symbol"]),
    symbol,
    el("label", { class: "label" }, ["Alert type"]),
    conditionSelect(state, render),
  );

  if (alertType?.requiresThreshold) {
    children.push(
      el("label", { class: "label" }, [
        `${alertType.thresholdLabel ?? "Threshold"}${alertType.thresholdUnit ? ` (${alertType.thresholdUnit})` : ""}`,
      ]),
      threshold
    );
  }

  if (alertType?.parameters?.length) {
    children.push(parameters);
  }

  children.push(create);
  return el("section", { class: "card stack" }, children);
}

function watchlistCard(state: State, render: (next: State) => void): HTMLElement {
  if (!state.watchlist.length) {
    return el("section", { class: "card stack" }, [
      el("p", { class: "eyebrow" }, ["Watchlist"]),
      el("p", { class: "muted" }, ["No symbols in your StockAlert.pro watchlist yet."]),
    ]);
  }

  return el("section", { class: "card stack" }, [
    el("p", { class: "eyebrow" }, ["Watchlist"]),
    ...state.watchlist.map((item) => {
      const remove = el("button", { class: "icon-button", type: "button" }, ["Remove"]);
      remove.addEventListener("click", async () => {
        const response = await sendMessage("REMOVE_FROM_WATCHLIST", { id: item.id, symbol: item.stock_symbol });
        if (!response.success) {
          render({ ...state, error: response.error || "Could not remove watchlist item." });
          return;
        }
        render({
          ...state,
          notice: `${item.stock_symbol} removed from watchlist.`,
          watchlist: state.watchlist.filter((entry) => entry.id !== item.id),
        });
      });
      return el("div", { class: "watchlist-item" }, [
        el("div", {}, [
          el("strong", {}, [item.stock_symbol]),
          item.stocks?.name ? el("span", { class: "muted" }, [item.stocks.name]) : el("span"),
        ]),
        remove,
      ]);
    }),
  ]);
}

function render(state: State): void {
  if (!app) return;
  app.replaceChildren(
    el("div", { class: "shell" }, [
      el("header", { class: "brand" }, [
        el("img", { alt: PRODUCT_NAME, class: "brand-logo", src: BRAND_LOGO_DARK }),
        el("p", { class: "eyebrow" }, ["Price alerts while you browse"]),
      ]),
      state.apiKey
        ? el("p", { class: "muted" }, [
            "Highlight a ticker, right-click, or enable detection on a site to create alerts from news and research.",
          ])
        : el("section", { class: "card stack" }, [
            el("p", { class: "eyebrow" }, ["Quick setup"]),
            el("h2", {}, ["Add your StockAlert.pro API key"]),
            el("p", { class: "muted" }, [
              "Your key stays in Chrome storage and is only sent to api.stockalert.pro when you create an alert or update your watchlist.",
            ]),
            apiKeyForm(state, render),
            el("a", { class: "muted-link", href: DASHBOARD_API_KEYS_URL, target: "_blank", rel: "noreferrer" }, [
              "Get an API key",
            ]),
          ]),
      pageDetectionCard(state, render),
      state.apiKey ? alertForm(state, render) : el("div", { class: "hidden" }),
      state.apiKey ? watchlistCard(state, render) : el("div", { class: "hidden" }),
      state.error ? el("div", { class: "alert" }, [state.error]) : el("div", { class: "hidden" }),
      state.notice ? el("div", { class: "notice" }, [state.notice]) : el("div", { class: "hidden" }),
      footer(),
    ])
  );
}

async function boot(): Promise<void> {
  const settings = await loadSettings();
  const pendingTicker = await loadPendingTicker();
  if (pendingTicker) await clearPendingTicker();

  let watchlist: WatchlistItem[] = [];
  let isPremium: boolean | null = null;
  let error: string | null = null;
  if (settings.apiKey) {
    const account = await loadAccount();
    watchlist = account.watchlist;
    isPremium = account.isPremium;
    error = account.error;
  }
  const detection = await readPageDetectionState();

  render({
    apiKey: settings.apiKey,
    condition: pendingTicker ? "price_above" : "",
    error,
    isPremium,
    notice: pendingTicker ? `Creating an alert for ${pendingTicker}.` : null,
    pageDetectionEnabled: detection.enabled,
    pageDetectionHost: detection.host,
    pageScanMessage: detection.blockedMessage,
    parameters: {},
    saving: false,
    status: null,
    symbol: pendingTicker ?? "",
    threshold: "",
    watchlist,
  });
}

void boot();
