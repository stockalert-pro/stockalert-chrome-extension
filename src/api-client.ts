import { API_BASE_URL } from "./branding";
import {
  Alert,
  ApiErrorEnvelopeSchema,
  ApiSuccessAlertEnvelopeSchema,
  ApiSuccessAlertsListEnvelopeSchema,
  ApiSuccessSubscriptionEnvelopeSchema,
  ApiSuccessWatchlistItemEnvelopeSchema,
  ApiSuccessWatchlistListEnvelopeSchema,
  CreateAlertRequest,
  CreateWatchlistItemRequest,
  Subscription,
  WatchlistItem,
} from "./types";

export class StockAlertApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "StockAlertApiError";
  }
}

type ApiClientConfig = {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

function boundFetch(fetchImpl: typeof fetch): typeof fetch {
  return fetchImpl.bind(globalThis);
}

export class StockAlertApiClient {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? API_BASE_URL;
    // Chrome MV3 workers throw "Illegal invocation" if native fetch is used as a method.
    this.fetchImpl = boundFetch(config.fetchImpl ?? globalThis.fetch);
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(options.headers);
    headers.set("X-API-Key", this.apiKey);
    headers.set("Content-Type", "application/json");

    const response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw apiErrorFromResponse(response.status, data);
    }

    return data;
  }

  async createAlert(request: CreateAlertRequest): Promise<Alert> {
    const response = await this.request("/v1/alerts", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return ApiSuccessAlertEnvelopeSchema.parse(response).data;
  }

  async listAlerts(): Promise<Alert[]> {
    const response = await this.request("/v1/alerts?limit=20", { method: "GET" });
    return ApiSuccessAlertsListEnvelopeSchema.parse(response).data;
  }

  async getSubscription(): Promise<Subscription> {
    const response = await this.request("/v1/user/subscription", { method: "GET" });
    return ApiSuccessSubscriptionEnvelopeSchema.parse(response).data;
  }

  async listWatchlist(): Promise<WatchlistItem[]> {
    const response = await this.request("/v1/watchlist", { method: "GET" });
    return ApiSuccessWatchlistListEnvelopeSchema.parse(response).data;
  }

  async addToWatchlist(request: CreateWatchlistItemRequest): Promise<WatchlistItem> {
    const response = await this.request("/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ ...request, intention: request.intention ?? "buy" }),
    });
    return ApiSuccessWatchlistItemEnvelopeSchema.parse(response).data;
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await this.request(`/v1/watchlist/${id}`, { method: "DELETE" });
  }
}

function detailErrorCode(details: unknown): string | undefined {
  if (!details || typeof details !== "object" || !("error" in details)) return undefined;
  const value = (details as { error?: unknown }).error;
  return typeof value === "string" ? value : undefined;
}

function apiErrorFromResponse(status: number, data: unknown): StockAlertApiError {
  const parsed = ApiErrorEnvelopeSchema.safeParse(data);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    const detailCode = detailErrorCode(details);
    if (detailCode === "PREMIUM_ALERT_CATEGORY_REQUIRED") {
      return new StockAlertApiError(detailCode, message, details);
    }
    if (detailCode === "ALERT_LIMIT_EXCEEDED") {
      return new StockAlertApiError(detailCode, message, details);
    }
    return new StockAlertApiError(code, message, details);
  }

  if (status === 401) {
    return new StockAlertApiError("UNAUTHORIZED", "API key is invalid. Check it in Settings.");
  }
  if (status === 403) {
    return new StockAlertApiError(
      "FORBIDDEN",
      "This API key is missing the required alerts or watchlist scopes."
    );
  }
  if (status === 429) {
    return new StockAlertApiError("RATE_LIMITED", "Rate limit reached. Try again in a few minutes.");
  }
  return new StockAlertApiError("UNKNOWN_ERROR", `HTTP ${status}`);
}

export function createApiClient(apiKey: string, fetchImpl?: typeof fetch): StockAlertApiClient {
  return new StockAlertApiClient({ apiKey, fetchImpl });
}
