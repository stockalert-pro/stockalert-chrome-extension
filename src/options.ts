import "./styles.css";

import { API_DOCS_URL, BRAND_LOGO_DARK, DASHBOARD_API_KEYS_URL, PRIVACY_URL, PRODUCT_NAME, SITE_URL } from "./branding";
import { el } from "./dom";
import { pageDetectionHostLabel } from "./page-detection";
import {
  loadEnabledDetectionOrigins,
  loadSettings,
  removeEnabledDetectionOrigin,
  saveSettings,
} from "./storage";

const app = document.querySelector<HTMLElement>("#app");

function sendMessage(type: string): Promise<{ success: boolean; error?: string }> {
  return chrome.runtime.sendMessage({ type });
}

function render(apiKey: string, origins: string[], message = "", tone: "notice" | "alert" = "notice"): void {
  if (!app) return;

  const input = el("input", {
    autocomplete: "off",
    class: "input",
    placeholder: "sk_...",
    type: "password",
    value: apiKey,
  }) as HTMLInputElement;

  const save = el("button", { class: "button", type: "button" }, ["Save API key"]);
  save.addEventListener("click", async () => {
    const nextKey = input.value.trim();
    if (nextKey && !nextKey.startsWith("sk_")) {
      render(nextKey, origins, "API keys start with sk_.", "alert");
      return;
    }
    await saveSettings({ apiKey: nextKey });
    render(nextKey, origins, nextKey ? "API key saved locally in Chrome." : "API key removed.");
  });

  const siteCard = origins.length
    ? el("section", { class: "card stack" }, [
        el("p", { class: "eyebrow" }, ["Ticker detection sites"]),
        el("p", { class: "muted" }, ["These sites stay enabled after reload. Page text is scanned locally."]),
        ...origins.map((origin) => {
          const remove = el("button", { class: "icon-button", type: "button" }, ["Turn off"]);
          remove.addEventListener("click", async () => {
            await chrome.permissions.remove({ origins: [origin] });
            const nextOrigins = await removeEnabledDetectionOrigin(origin);
            await sendMessage("SYNC_PAGE_DETECTION");
            render(apiKey, nextOrigins, `Ticker detection turned off for ${pageDetectionHostLabel(origin)}.`);
          });
          return el("div", { class: "watchlist-item" }, [
            el("strong", {}, [pageDetectionHostLabel(origin)]),
            remove,
          ]);
        }),
      ])
    : el("section", { class: "card stack" }, [
        el("p", { class: "eyebrow" }, ["Ticker detection sites"]),
        el("p", { class: "muted" }, [
          "None yet. Enable a site from the popup. Chrome remembers it across reloads.",
        ]),
      ]);

  app.replaceChildren(
    el("div", { class: "shell wide" }, [
      el("header", { class: "brand" }, [
        el("img", { alt: PRODUCT_NAME, class: "brand-logo", src: BRAND_LOGO_DARK }),
        el("h1", {}, ["Settings"]),
      ]),
      el("section", { class: "card stack" }, [
        el("label", { class: "label" }, ["StockAlert.pro API key"]),
        input,
        el("p", { class: "muted" }, [
          "Stored only in Chrome local storage. It is sent to api.stockalert.pro when you create alerts or manage your watchlist.",
        ]),
        save,
        message ? el("div", { class: tone }, [message]) : el("div", { class: "hidden" }),
      ]),
      siteCard,
      el("footer", { class: "footer" }, [
        el("a", { href: DASHBOARD_API_KEYS_URL, target: "_blank", rel: "noreferrer" }, ["Get API key"]),
        el("a", { href: API_DOCS_URL, target: "_blank", rel: "noreferrer" }, ["API docs"]),
        el("a", { href: PRIVACY_URL, target: "_blank", rel: "noreferrer" }, ["Privacy"]),
        el("a", { href: SITE_URL, target: "_blank", rel: "noreferrer" }, ["StockAlert.pro"]),
      ]),
    ])
  );
}

void Promise.all([loadSettings(), loadEnabledDetectionOrigins()]).then(([settings, origins]) => {
  render(settings.apiKey, origins);
});
