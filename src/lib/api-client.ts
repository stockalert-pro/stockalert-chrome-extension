import {
  Alert,
  CreateAlertRequest,
  ApiSuccessAlertEnvelopeSchema,
  ApiSuccessAlertsListEnvelopeSchema,
  ApiErrorEnvelopeSchema,
  ApiError,
  WatchlistItem,
  CreateWatchlistItemRequest,
  ApiSuccessWatchlistListEnvelopeSchema,
  ApiSuccessWatchlistItemEnvelopeSchema,
} from './types';

/**
 * StockAlert API Client Configuration
 */
interface ApiClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * API Client Error
 */
export class StockAlertApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'StockAlertApiError';
  }

  static fromApiError(error: ApiError): StockAlertApiError {
    return new StockAlertApiError(error.code, error.message, error.details);
  }
}

/**
 * StockAlert API Client
 * Handles all HTTP communication with StockAlert.pro API v1
 */
export class StockAlertApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://stockalert.pro';
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('X-API-Key', this.apiKey);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle error responses
    if (!response.ok || !data.success) {
      const errorEnvelope = ApiErrorEnvelopeSchema.safeParse(data);
      if (errorEnvelope.success) {
        throw StockAlertApiError.fromApiError(errorEnvelope.data.error);
      }
      throw new StockAlertApiError(
        'UNKNOWN_ERROR',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data;
  }

  /**
   * Create a new alert
   */
  async createAlert(request: CreateAlertRequest): Promise<Alert> {
    const response = await this.request<unknown>('/api/v1/alerts', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const parsed = ApiSuccessAlertEnvelopeSchema.parse(response);
    return parsed.data;
  }

  /**
   * List alerts with optional filters
   */
  async listAlerts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    condition?: string;
    search?: string;
  }): Promise<{ alerts: Alert[]; total: number; page: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.condition) searchParams.set('condition', params.condition);
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const endpoint = `/api/v1/alerts${query ? `?${query}` : ''}`;

    const response = await this.request<unknown>(endpoint, {
      method: 'GET',
    });

    const parsed = ApiSuccessAlertsListEnvelopeSchema.parse(response);
    return {
      alerts: parsed.data,
      total: parsed.meta.pagination.total,
      page: parsed.meta.pagination.page,
    };
  }

  /**
   * Get a single alert by ID
   */
  async getAlert(id: string): Promise<Alert> {
    const response = await this.request<unknown>(`/api/v1/alerts/${id}`, {
      method: 'GET',
    });

    const parsed = ApiSuccessAlertEnvelopeSchema.parse(response);
    return parsed.data;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(id: string): Promise<void> {
    await this.request(`/api/v1/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Pause an alert
   */
  async pauseAlert(id: string): Promise<void> {
    await this.request(`/api/v1/alerts/${id}/pause`, {
      method: 'POST',
    });
  }

  /**
   * Activate an alert
   */
  async activateAlert(id: string): Promise<void> {
    await this.request(`/api/v1/alerts/${id}/activate`, {
      method: 'POST',
    });
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * List watchlist items
   */
  async listWatchlist(): Promise<WatchlistItem[]> {
    const response = await this.request<unknown>('/api/v1/watchlist', {
      method: 'GET',
    });

    const parsed = ApiSuccessWatchlistListEnvelopeSchema.parse(response);
    return parsed.data;
  }

  /**
   * Add item to watchlist
   */
  async addToWatchlist(request: CreateWatchlistItemRequest): Promise<WatchlistItem> {
    const response = await this.request<unknown>('/api/v1/watchlist', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const parsed = ApiSuccessWatchlistItemEnvelopeSchema.parse(response);
    return parsed.data;
  }

  /**
   * Remove item from watchlist
   */
  async removeFromWatchlist(id: string): Promise<void> {
    await this.request(`/api/v1/watchlist/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Check if symbol is in watchlist
   */
  async isInWatchlist(symbol: string): Promise<boolean> {
    const items = await this.listWatchlist();
    return items.some((item) => item.stock_symbol === symbol);
  }
}

/**
 * Create API client instance with stored API key
 */
export async function createApiClient(): Promise<StockAlertApiClient | null> {
  const { apiKey } = await chrome.storage.local.get('apiKey');

  if (!apiKey) {
    return null;
  }

  return new StockAlertApiClient({ apiKey });
}
