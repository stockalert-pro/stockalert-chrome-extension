export const PAGE_DETECTION_SCRIPT_ID = "stockalert-ticker-detection";

function hostnameOf(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isStockAlertPage(urlString: string): boolean {
  const hostname = hostnameOf(urlString);
  return hostname === "stockalert.pro" || Boolean(hostname?.endsWith(".stockalert.pro"));
}

export function pageDetectionOriginPattern(urlString: string): string | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isStockAlertPage(urlString)) return null;
  return `${url.protocol}//${url.host}/*`;
}

export function pageDetectionHostLabel(originPattern: string): string {
  return originPattern.replace(/^[a-z]+:\/\//i, "").replace(/\/\*$/, "");
}
