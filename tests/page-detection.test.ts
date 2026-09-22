import { describe, expect, it } from "vitest";

import {
  isStockAlertPage,
  pageDetectionHostLabel,
  pageDetectionOriginPattern,
} from "../src/page-detection";

describe("page detection origins", () => {
  it("builds a site pattern from http(s) pages", () => {
    expect(pageDetectionOriginPattern("https://finance.yahoo.com/quote/AAPL")).toBe(
      "https://finance.yahoo.com/*"
    );
    expect(pageDetectionOriginPattern("http://localhost:3000/news")).toBe("http://localhost:3000/*");
    expect(pageDetectionHostLabel("https://finance.yahoo.com/*")).toBe("finance.yahoo.com");
  });

  it("rejects extension pages, StockAlert.pro, and non-web URLs", () => {
    expect(pageDetectionOriginPattern("chrome://extensions")).toBeNull();
    expect(pageDetectionOriginPattern("chrome-extension://abc/popup.html")).toBeNull();
    expect(pageDetectionOriginPattern("https://stockalert.pro/pricing")).toBeNull();
    expect(pageDetectionOriginPattern("https://app.stockalert.pro/settings")).toBeNull();
    expect(pageDetectionOriginPattern("https://api.stockalert.pro/v1/alerts")).toBeNull();
    expect(isStockAlertPage("https://app.stockalert.pro/alerts")).toBe(true);
  });
});
