import { createApiClient, StockAlertApiError } from "./api-client";
import { PAGE_DETECTION_SCRIPT_ID } from "./page-detection";
import {
  loadEnabledDetectionOrigins,
  loadSettings,
  saveEnabledDetectionOrigins,
  savePendingTicker,
} from "./storage";
import { CreateAlertRequest } from "./types";

function normalizeTicker(input: string): string | null {
  const ticker = input.trim().replace(/^\$/, "").toUpperCase();
  if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(ticker)) return null;
  return ticker;
}

const MENU_ID = "stockalert-create-alert";

function ensureContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      contexts: ["selection"],
      id: MENU_ID,
      title: "Create StockAlert.pro alert for \"%s\"",
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu();
  void syncPageDetectionScripts();
});

ensureContextMenu();
void syncPageDetectionScripts();

async function allowedDetectionOrigins(): Promise<string[]> {
  const stored = await loadEnabledDetectionOrigins();
  const allowed: string[] = [];
  for (const origin of stored) {
    if (await chrome.permissions.contains({ origins: [origin] })) allowed.push(origin);
  }
  if (allowed.length !== stored.length) await saveEnabledDetectionOrigins(allowed);
  return allowed;
}

async function syncPageDetectionScripts(): Promise<void> {
  const matches = await allowedDetectionOrigins();
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [PAGE_DETECTION_SCRIPT_ID],
  });
  if (!matches.length) {
    if (existing.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [PAGE_DETECTION_SCRIPT_ID] });
    }
    return;
  }

  const script = {
    css: ["content.css"],
    id: PAGE_DETECTION_SCRIPT_ID,
    js: ["content.js"],
    matches,
    persistAcrossSessions: true,
    runAt: "document_idle" as const,
  };
  if (existing.length) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

async function injectDetection(tabId: number): Promise<void> {
  await chrome.scripting.insertCSS({ files: ["content.css"], target: { tabId } });
  await chrome.scripting.executeScript({ files: ["content.js"], target: { tabId } });
}

chrome.permissions.onRemoved.addListener(() => {
  void syncPageDetectionScripts();
});

async function openPopupForTicker(ticker: string): Promise<void> {
  await savePendingTicker(ticker);
  await chrome.windows.create({
    focused: true,
    height: 680,
    type: "popup",
    url: chrome.runtime.getURL("popup.html"),
    width: 420,
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const ticker = normalizeTicker(info.selectionText);
  if (!ticker) return;
  await openPopupForTicker(ticker);
});

async function withClient() {
  const settings = await loadSettings();
  if (!settings.apiKey) {
    throw new Error("Add your StockAlert.pro API key in Settings before using this action.");
  }
  return createApiClient(settings.apiKey);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    try {
      switch (message.type) {
        case "OPEN_ALERT_MODAL": {
          const ticker = normalizeTicker(String(message.payload?.symbol ?? ""));
          if (!ticker) throw new Error("Select a valid stock ticker first.");
          await openPopupForTicker(ticker);
          sendResponse({ success: true });
          return;
        }
        case "CREATE_ALERT": {
          const client = await withClient();
          const alert = await client.createAlert(message.payload as CreateAlertRequest);
          sendResponse({ success: true, data: alert });
          return;
        }
        case "GET_WATCHLIST": {
          const client = await withClient();
          const watchlist = await client.listWatchlist();
          sendResponse({ success: true, data: watchlist });
          return;
        }
        case "GET_SUBSCRIPTION": {
          const client = await withClient();
          try {
            const subscription = await client.getSubscription();
            sendResponse({ success: true, data: subscription });
          } catch {
            sendResponse({ success: true, data: null });
          }
          return;
        }
        case "ADD_TO_WATCHLIST": {
          const ticker = normalizeTicker(String(message.payload?.symbol ?? ""));
          if (!ticker) throw new Error("Select a valid stock ticker first.");
          const client = await withClient();
          const item = await client.addToWatchlist({ stock_symbol: ticker, intention: "buy" });
          sendResponse({ success: true, data: item });
          return;
        }
        case "REMOVE_FROM_WATCHLIST": {
          const client = await withClient();
          await client.removeFromWatchlist(String(message.payload?.id ?? ""));
          sendResponse({ success: true });
          return;
        }
        case "SYNC_PAGE_DETECTION": {
          await syncPageDetectionScripts();
          const tabId = Number(message.payload?.tabId);
          if (Number.isInteger(tabId) && tabId > 0) await injectDetection(tabId);
          sendResponse({ success: true });
          return;
        }
        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      const messageText =
        error instanceof StockAlertApiError || error instanceof Error
          ? error.message
          : "Unknown error";
      sendResponse({ success: false, error: messageText });
    }
  })();
  return true;
});
