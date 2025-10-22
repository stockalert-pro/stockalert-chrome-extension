/**
 * Simple rate limiter for API requests
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string = 'default'): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request record
    let records = this.requests.get(key) || [];

    // Remove expired records
    records = records.filter((r) => r.timestamp > windowStart);

    // Count requests in window
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);

    if (totalRequests >= this.config.maxRequests) {
      return false;
    }

    // Add new request
    records.push({ timestamp: now, count: 1 });
    this.requests.set(key, records);

    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(key: string = 'default'): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const records = this.requests.get(key) || [];
    const validRecords = records.filter((r) => r.timestamp > windowStart);
    const totalRequests = validRecords.reduce((sum, r) => sum + r.count, 0);

    return Math.max(0, this.config.maxRequests - totalRequests);
  }

  /**
   * Reset rate limiter for a key
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

/**
 * Global rate limiter instance
 */
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // Conservative limit
  windowMs: 3600000, // 1 hour
});
