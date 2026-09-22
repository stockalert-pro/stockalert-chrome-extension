import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { ALERT_CATEGORIES, ALERT_TYPES } from "../src/types";

describe("Chrome Web Store scope", () => {
  it("keeps extension permissions narrow", () => {
    const manifest = JSON.parse(readFileSync(resolve("public/manifest.json"), "utf8")) as {
      content_scripts?: unknown;
      host_permissions: string[];
      optional_host_permissions?: string[];
      name: string;
      permissions: string[];
      short_name: string;
      version: string;
    };

    expect(manifest.name).toBe("StockAlert.pro");
    expect(manifest.short_name).toBe("StockAlert");
    expect(manifest.version).toBe("1.2.0");
    expect(manifest.permissions).toEqual(["storage", "contextMenus", "activeTab", "scripting"]);
    expect(manifest.host_permissions).toEqual(["https://api.stockalert.pro/*"]);
    expect(manifest.optional_host_permissions).toEqual(["http://*/*", "https://*/*"]);
    expect(manifest.content_scripts).toBeUndefined();
  });

  it("injects page ticker detection only after explicit user action", () => {
    const popupScript = readFileSync(resolve("src/popup.ts"), "utf8");

    expect(popupScript).toContain("chrome.permissions.request");
    expect(popupScript).toContain("SYNC_PAGE_DETECTION");
    expect(popupScript).toContain("Enable ticker detection on this site");
  });

  it("keeps the content script self-contained for Chrome MV3", () => {
    const contentScript = readFileSync(resolve("src/content.ts"), "utf8");
    const imports = [...contentScript.matchAll(/^import .+$/gm)].map((match) => match[0]);

    expect(imports).toEqual(['import { findTickerMentions } from "./tickers";']);
    expect(contentScript).not.toMatch(/^export\s/m);
    expect(contentScript).toContain("stockalertLoaded");
    expect(contentScript).toContain('tickerNode.addEventListener("click"');
    expect(contentScript).toContain("Create Alert");
    expect(contentScript).toContain("Add to Watchlist");
    expect(contentScript).not.toContain("chrome.runtime.getURL");
    expect(contentScript).toContain('createElementNS(SVG_NS, "svg")');
  });

  it("covers current StockAlert alert conditions in the popup catalog", () => {
    expect(Object.keys(ALERT_TYPES)).toEqual(expect.arrayContaining(["daily_change_up", "daily_change_down", "social_buzz"]));
    expect(ALERT_CATEGORIES.flatMap((category) => category.conditions)).toHaveLength(Object.keys(ALERT_TYPES).length);
  });
});
