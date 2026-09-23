export type ExtensionSettings = {
  apiKey: string;
};

const EMPTY_SETTINGS: ExtensionSettings = {
  apiKey: "",
};

const PENDING_TICKER_KEY = "pendingTicker";
const ENABLED_DETECTION_ORIGINS_KEY = "enabledDetectionOrigins";

function asOriginList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is string => typeof item === "string" && /^https?:\/\/.+\*$/.test(item)
      )
    ),
  ].sort();
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get(["apiKey"]);
  return {
    apiKey: typeof data.apiKey === "string" ? data.apiKey : EMPTY_SETTINGS.apiKey,
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ apiKey: settings.apiKey });
}

export async function savePendingTicker(ticker: string): Promise<void> {
  await chrome.storage.local.set({ [PENDING_TICKER_KEY]: ticker });
}

export async function loadPendingTicker(): Promise<string | null> {
  const data = await chrome.storage.local.get(PENDING_TICKER_KEY);
  const ticker = data[PENDING_TICKER_KEY];
  return typeof ticker === "string" && ticker.length > 0 ? ticker : null;
}

export async function clearPendingTicker(): Promise<void> {
  await chrome.storage.local.remove(PENDING_TICKER_KEY);
}

export async function loadEnabledDetectionOrigins(): Promise<string[]> {
  const data = await chrome.storage.local.get(ENABLED_DETECTION_ORIGINS_KEY);
  return asOriginList(data[ENABLED_DETECTION_ORIGINS_KEY]);
}

export async function saveEnabledDetectionOrigins(origins: string[]): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_DETECTION_ORIGINS_KEY]: asOriginList(origins) });
}

export async function addEnabledDetectionOrigin(origin: string): Promise<string[]> {
  const origins = await loadEnabledDetectionOrigins();
  if (!origins.includes(origin)) origins.push(origin);
  await saveEnabledDetectionOrigins(origins);
  return loadEnabledDetectionOrigins();
}

export async function removeEnabledDetectionOrigin(origin: string): Promise<string[]> {
  const origins = (await loadEnabledDetectionOrigins()).filter((item) => item !== origin);
  await saveEnabledDetectionOrigins(origins);
  return origins;
}
