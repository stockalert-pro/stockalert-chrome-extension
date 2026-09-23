import { afterEach, describe, expect, it, vi } from "vitest";

import { StockAlertApiClient } from "../src/api-client";

function response(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    ...init,
  });
}

describe("StockAlert API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates alerts against the canonical API host", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        success: true,
        data: {
          id: "alert-1",
          symbol: "AAPL",
          condition: "price_above",
          threshold: 200,
          notification: "email",
          status: "active",
        },
      })
    );

    const client = new StockAlertApiClient({ apiKey: "sk_test", fetchImpl: fetchMock as unknown as typeof fetch });
    const alert = await client.createAlert({
      symbol: "AAPL",
      condition: "price_above",
      threshold: 200,
      notification: "email",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stockalert.pro/v1/alerts");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-API-Key")).toBe("sk_test");
    expect(alert).toMatchObject({ id: "alert-1", symbol: "AAPL", condition: "price_above" });
  });

  it("adds watchlist items with a default buy intention", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        success: true,
        data: { id: "wl-1", stock_symbol: "NVDA", intention: "buy" },
      })
    );
    const client = new StockAlertApiClient({ apiKey: "sk_test", fetchImpl: fetchMock as unknown as typeof fetch });
    const item = await client.addToWatchlist({ stock_symbol: "NVDA" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ intention: "buy", stock_symbol: "NVDA" });
    expect(item.stock_symbol).toBe("NVDA");
  });

  it("returns helpful errors for common API failures", async () => {
    const client = new StockAlertApiClient({
      apiKey: "sk_test",
      fetchImpl: vi.fn(async () => response({}, { status: 429 })) as unknown as typeof fetch,
    });

    await expect(client.listWatchlist()).rejects.toThrow("Rate limit reached");
  });

  it("surfaces premium category errors from the API envelope", async () => {
    const client = new StockAlertApiClient({
      apiKey: "sk_test",
      fetchImpl: vi.fn(async () =>
        response(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Price and Time only on Basic.",
              details: { error: "PREMIUM_ALERT_CATEGORY_REQUIRED" },
            },
          },
          { status: 403 }
        )
      ) as unknown as typeof fetch,
    });

    await expect(
      client.createAlert({
        symbol: "AAPL",
        condition: "ma_crossover_death",
        notification: "email",
      })
    ).rejects.toMatchObject({
      code: "PREMIUM_ALERT_CATEGORY_REQUIRED",
      message: "Price and Time only on Basic.",
    });
  });

  it("keeps generic 403 copy when the API does not send an envelope", async () => {
    const client = new StockAlertApiClient({
      apiKey: "sk_test",
      fetchImpl: vi.fn(async () => response({}, { status: 403 })) as unknown as typeof fetch,
    });

    await expect(client.listWatchlist()).rejects.toThrow(
      "This API key is missing the required alerts or watchlist scopes."
    );
  });

  it("reads is_premium from /v1/user/subscription", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        success: true,
        data: {
          account_type: "basic",
          is_premium: false,
          watchlist_items_count: 0,
        },
      })
    );
    const client = new StockAlertApiClient({
      apiKey: "sk_test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.getSubscription()).resolves.toEqual({
      account_type: "basic",
      is_premium: false,
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.stockalert.pro/v1/user/subscription");
  });

  it("binds global fetch so Chrome workers do not throw Illegal invocation", async () => {
    const original = globalThis.fetch;
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation");
      }
      return Promise.resolve(response({ success: true, data: [] }));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const client = new StockAlertApiClient({ apiKey: "sk_test" });
      await expect(client.listWatchlist()).resolves.toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });
});
