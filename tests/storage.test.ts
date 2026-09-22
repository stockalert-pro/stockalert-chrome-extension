import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addEnabledDetectionOrigin,
  clearPendingTicker,
  loadEnabledDetectionOrigins,
  loadPendingTicker,
  loadSettings,
  removeEnabledDetectionOrigin,
  savePendingTicker,
  saveSettings,
} from "../src/storage";

const memory = new Map<string, unknown>();

function installChromeMock(): void {
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        async get(keys: string | string[] | Record<string, unknown> | null) {
          if (!keys || keys === null) {
            return Object.fromEntries(memory);
          }
          const list = Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : Object.keys(keys);
          return Object.fromEntries(list.map((key) => [key, memory.get(key)]));
        },
        async set(items: Record<string, unknown>) {
          for (const [key, value] of Object.entries(items)) {
            memory.set(key, value);
          }
        },
        async remove(keys: string | string[]) {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            memory.delete(key);
          }
        },
      },
    },
  });
}

describe("extension storage", () => {
  beforeEach(() => {
    memory.clear();
    installChromeMock();
  });

  it("stores the API key locally", async () => {
    await saveSettings({ apiKey: "sk_test" });
    await expect(loadSettings()).resolves.toEqual({ apiKey: "sk_test" });
  });

  it("round-trips a pending context-menu ticker", async () => {
    await savePendingTicker("NVDA");
    await expect(loadPendingTicker()).resolves.toBe("NVDA");
    await clearPendingTicker();
    await expect(loadPendingTicker()).resolves.toBeNull();
  });

  it("remembers ticker detection sites", async () => {
    await addEnabledDetectionOrigin("https://finance.yahoo.com/*");
    await addEnabledDetectionOrigin("https://www.marketwatch.com/*");
    await addEnabledDetectionOrigin("https://finance.yahoo.com/*");
    await expect(loadEnabledDetectionOrigins()).resolves.toEqual([
      "https://finance.yahoo.com/*",
      "https://www.marketwatch.com/*",
    ]);
    await expect(removeEnabledDetectionOrigin("https://finance.yahoo.com/*")).resolves.toEqual([
      "https://www.marketwatch.com/*",
    ]);
  });
});
