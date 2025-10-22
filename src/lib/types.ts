import { z } from 'zod';

/**
 * Alert Condition Types - 21 supported alert types from StockAlert.pro API
 */
export const AlertConditionSchema = z.enum([
  // Price alerts
  'price_above',
  'price_below',
  'price_change_up',
  'price_change_down',
  'new_high',
  'new_low',
  // Time-based alerts
  'reminder',
  'daily_reminder',
  // Technical indicators
  'ma_crossover_golden',
  'ma_crossover_death',
  'ma_touch_above',
  'ma_touch_below',
  'volume_change',
  'rsi_limit',
  // Fundamental alerts
  'pe_ratio_below',
  'pe_ratio_above',
  'forward_pe_below',
  'forward_pe_above',
  'earnings_announcement',
  // Dividend alerts
  'dividend_ex_date',
  'dividend_payment',
]);

export type AlertCondition = z.infer<typeof AlertConditionSchema>;

/**
 * Alert Status
 */
export const AlertStatusSchema = z.enum(['active', 'paused', 'triggered']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

/**
 * Notification Type
 */
export const NotificationTypeSchema = z.enum(['email', 'sms']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/**
 * Alert Request Schema
 */
export const CreateAlertRequestSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  condition: AlertConditionSchema,
  threshold: z.number().optional(),
  notification: NotificationTypeSchema.default('email'),
  parameters: z.record(z.unknown()).optional(),
});

export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;

/**
 * Alert Response Schema
 */
export const AlertSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  email: z.string().email().nullable().optional(),
  symbol: z.string(),
  condition: AlertConditionSchema,
  threshold: z.number().nullable(),
  notification: NotificationTypeSchema,
  status: AlertStatusSchema,
  created_at: z.string(),
  triggered_at: z.string().nullable().optional(),
  initial_price: z.number(),
  parameters: z.record(z.unknown()).nullable().optional(),
  verified: z.boolean().optional(),
  last_evaluated_at: z.string().nullable().optional(),
  last_metric_value: z.number().nullable().optional(),
  stock: z
    .object({
      name: z.string(),
      last_price: z.number(),
      high_52w: z.number().nullable().optional(),
      low_52w: z.number().nullable().optional(),
      rsi: z.number().nullable().optional(),
      ma_50: z.number().nullable().optional(),
      ma_200: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

/**
 * API Response Envelope
 */
export const RateLimitMetaSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(), // Unix epoch milliseconds
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const ApiSuccessAlertEnvelopeSchema = z.object({
  success: z.literal(true),
  data: AlertSchema,
  meta: z.object({
    rateLimit: RateLimitMetaSchema,
  }),
});

export const ApiSuccessAlertsListEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(AlertSchema),
  meta: z.object({
    pagination: PaginationMetaSchema,
    rateLimit: RateLimitMetaSchema,
  }),
});

export const ApiErrorSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
    'BAD_REQUEST',
    'SERVICE_UNAVAILABLE',
  ]),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

export const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

/**
 * Watchlist Item (API)
 */
export const WatchlistItemSchema = z.object({
  id: z.string().uuid(),
  stock_symbol: z.string(),
  intention: z.enum(['buy', 'sell']).nullable().optional(),
  target_price: z.number().nullable().optional(),
  initial_price: z.number().nullable().optional(),
  auto_alerts_enabled: z.boolean().optional(),
  stocks: z
    .object({
      symbol: z.string(),
      name: z.string(),
      last_price: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  created_at: z.string().optional(),
});

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

/**
 * Create Watchlist Item Request
 */
export const CreateWatchlistItemRequestSchema = z.object({
  stock_symbol: z.string(),
  intention: z.enum(['buy', 'sell']).optional(),
  target_price: z.number().optional(),
  auto_alerts_enabled: z.boolean().optional(),
});

export type CreateWatchlistItemRequest = z.infer<typeof CreateWatchlistItemRequestSchema>;

/**
 * Watchlist API Response
 */
export const ApiSuccessWatchlistListEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(WatchlistItemSchema),
  meta: z.object({
    rateLimit: RateLimitMetaSchema,
  }),
});

export const ApiSuccessWatchlistItemEnvelopeSchema = z.object({
  success: z.literal(true),
  data: WatchlistItemSchema,
  meta: z.object({
    rateLimit: RateLimitMetaSchema,
  }),
});

/**
 * Extension Storage Schema
 * Note: Watchlist is now fetched from API, not stored locally
 */
export const ExtensionStorageSchema = z.object({
  apiKey: z.string().optional(),
  settings: z
    .object({
      autoDetect: z.boolean().default(true),
      highlightSymbols: z.boolean().default(true),
      overlayPosition: z.enum(['top', 'bottom', 'cursor']).default('cursor'),
    })
    .default({}),
});

export type ExtensionStorage = z.infer<typeof ExtensionStorageSchema>;

/**
 * Message Types for Chrome Runtime Messaging
 */
export type MessageType =
  | 'CREATE_ALERT'
  | 'ADD_TO_WATCHLIST'
  | 'REMOVE_FROM_WATCHLIST'
  | 'GET_WATCHLIST'
  | 'SAVE_API_KEY'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS';

export interface ChromeMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface CreateAlertMessage extends ChromeMessage<CreateAlertRequest> {
  type: 'CREATE_ALERT';
  payload: CreateAlertRequest;
}

export interface AddToWatchlistMessage extends ChromeMessage<{ symbol: string; notes?: string }> {
  type: 'ADD_TO_WATCHLIST';
  payload: { symbol: string; notes?: string };
}

/**
 * Alert Type Metadata for UI
 */
export interface AlertTypeInfo {
  condition: AlertCondition;
  category: 'price' | 'technical' | 'fundamental' | 'dividend' | 'time';
  label: string;
  description: string;
  requiresThreshold: boolean;
  thresholdLabel?: string;
  thresholdUnit?: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
  }>;
}

/**
 * Alert Type Definitions with metadata
 */
export const ALERT_TYPES: Record<AlertCondition, AlertTypeInfo> = {
  price_above: {
    condition: 'price_above',
    category: 'price',
    label: 'Price Above',
    description: 'Alert when price rises above threshold',
    requiresThreshold: true,
    thresholdLabel: 'Target Price',
    thresholdUnit: '$',
  },
  price_below: {
    condition: 'price_below',
    category: 'price',
    label: 'Price Below',
    description: 'Alert when price falls below threshold',
    requiresThreshold: true,
    thresholdLabel: 'Target Price',
    thresholdUnit: '$',
  },
  price_change_up: {
    condition: 'price_change_up',
    category: 'price',
    label: 'Price Change Up',
    description: 'Alert when price increases by percentage',
    requiresThreshold: true,
    thresholdLabel: 'Percentage Change',
    thresholdUnit: '%',
  },
  price_change_down: {
    condition: 'price_change_down',
    category: 'price',
    label: 'Price Change Down',
    description: 'Alert when price decreases by percentage',
    requiresThreshold: true,
    thresholdLabel: 'Percentage Change',
    thresholdUnit: '%',
  },
  new_high: {
    condition: 'new_high',
    category: 'price',
    label: 'New 52-Week High',
    description: 'Alert when stock hits new 52-week high',
    requiresThreshold: false,
  },
  new_low: {
    condition: 'new_low',
    category: 'price',
    label: 'New 52-Week Low',
    description: 'Alert when stock hits new 52-week low',
    requiresThreshold: false,
  },
  ma_crossover_golden: {
    condition: 'ma_crossover_golden',
    category: 'technical',
    label: 'Golden Cross',
    description: '50-day MA crosses above 200-day MA',
    requiresThreshold: false,
  },
  ma_crossover_death: {
    condition: 'ma_crossover_death',
    category: 'technical',
    label: 'Death Cross',
    description: '50-day MA crosses below 200-day MA',
    requiresThreshold: false,
  },
  ma_touch_above: {
    condition: 'ma_touch_above',
    category: 'technical',
    label: 'MA Touch Above',
    description: 'Price crosses above moving average',
    requiresThreshold: true,
    thresholdLabel: 'MA Period',
    thresholdUnit: 'days',
  },
  ma_touch_below: {
    condition: 'ma_touch_below',
    category: 'technical',
    label: 'MA Touch Below',
    description: 'Price crosses below moving average',
    requiresThreshold: true,
    thresholdLabel: 'MA Period',
    thresholdUnit: 'days',
  },
  volume_change: {
    condition: 'volume_change',
    category: 'technical',
    label: 'Volume Change',
    description: 'Alert on unusual volume',
    requiresThreshold: true,
    thresholdLabel: 'Volume Increase',
    thresholdUnit: '%',
    parameters: [
      {
        name: 'volumeBaseline',
        type: 'select',
        label: 'Baseline',
        options: [
          { value: 'ma20', label: '20-day Average' },
          { value: 'ma50', label: '50-day Average' },
        ],
      },
    ],
  },
  rsi_limit: {
    condition: 'rsi_limit',
    category: 'technical',
    label: 'RSI Limit',
    description: 'Alert when RSI crosses threshold',
    requiresThreshold: true,
    thresholdLabel: 'RSI Value',
    thresholdUnit: '',
    parameters: [
      {
        name: 'direction',
        type: 'select',
        label: 'Direction',
        options: [
          { value: 'above', label: 'Above (Overbought)' },
          { value: 'below', label: 'Below (Oversold)' },
        ],
        required: true,
      },
    ],
  },
  pe_ratio_below: {
    condition: 'pe_ratio_below',
    category: 'fundamental',
    label: 'P/E Ratio Below',
    description: 'Alert when P/E ratio falls below threshold',
    requiresThreshold: true,
    thresholdLabel: 'P/E Ratio',
    thresholdUnit: '',
  },
  pe_ratio_above: {
    condition: 'pe_ratio_above',
    category: 'fundamental',
    label: 'P/E Ratio Above',
    description: 'Alert when P/E ratio rises above threshold',
    requiresThreshold: true,
    thresholdLabel: 'P/E Ratio',
    thresholdUnit: '',
  },
  forward_pe_below: {
    condition: 'forward_pe_below',
    category: 'fundamental',
    label: 'Forward P/E Below',
    description: 'Alert when forward P/E falls below threshold',
    requiresThreshold: true,
    thresholdLabel: 'Forward P/E',
    thresholdUnit: '',
  },
  forward_pe_above: {
    condition: 'forward_pe_above',
    category: 'fundamental',
    label: 'Forward P/E Above',
    description: 'Alert when forward P/E rises above threshold',
    requiresThreshold: true,
    thresholdLabel: 'Forward P/E',
    thresholdUnit: '',
  },
  earnings_announcement: {
    condition: 'earnings_announcement',
    category: 'fundamental',
    label: 'Earnings Announcement',
    description: 'Alert before earnings announcement',
    requiresThreshold: true,
    thresholdLabel: 'Days Before',
    thresholdUnit: 'days',
  },
  dividend_ex_date: {
    condition: 'dividend_ex_date',
    category: 'dividend',
    label: 'Dividend Ex-Date',
    description: 'Alert before ex-dividend date',
    requiresThreshold: true,
    thresholdLabel: 'Days Before',
    thresholdUnit: 'days',
  },
  dividend_payment: {
    condition: 'dividend_payment',
    category: 'dividend',
    label: 'Dividend Payment',
    description: 'Alert on dividend payment date',
    requiresThreshold: false,
  },
  reminder: {
    condition: 'reminder',
    category: 'time',
    label: 'One-Time Reminder',
    description: 'Single reminder for this stock',
    requiresThreshold: false,
  },
  daily_reminder: {
    condition: 'daily_reminder',
    category: 'time',
    label: 'Daily Reminder',
    description: 'Daily reminder for this stock',
    requiresThreshold: false,
  },
};
