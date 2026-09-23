import { z } from "zod";

export const AlertConditionSchema = z.enum([
  "price_above",
  "price_below",
  "price_change_up",
  "price_change_down",
  "daily_change_up",
  "daily_change_down",
  "new_high",
  "new_low",
  "reminder",
  "daily_reminder",
  "ma_crossover_golden",
  "ma_crossover_death",
  "ma_touch_above",
  "ma_touch_below",
  "volume_change",
  "rsi_limit",
  "pe_ratio_below",
  "pe_ratio_above",
  "forward_pe_below",
  "forward_pe_above",
  "earnings_announcement",
  "dividend_ex_date",
  "dividend_payment",
  "insider_transactions",
  "social_buzz",
]);

export type AlertCondition = z.infer<typeof AlertConditionSchema>;

export const AlertStatusSchema = z.enum(["active", "paused", "triggered", "inactive"]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const NotificationTypeSchema = z.enum(["email", "sms"]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const CreateAlertRequestSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  condition: AlertConditionSchema,
  threshold: z.number().optional(),
  notification: NotificationTypeSchema.default("email"),
  parameters: z.record(z.unknown()).optional(),
});

export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  email: z.string().nullable().optional(),
  symbol: z.string(),
  condition: AlertConditionSchema,
  threshold: z.number().nullable().optional(),
  notification: NotificationTypeSchema.optional(),
  status: AlertStatusSchema.optional(),
  created_at: z.string().optional(),
  triggered_at: z.string().nullable().optional(),
  initial_price: z.number().nullable().optional(),
  parameters: z.record(z.unknown()).nullable().optional(),
  verified: z.boolean().optional(),
  last_evaluated_at: z.string().nullable().optional(),
  last_metric_value: z.number().nullable().optional(),
  stock: z
    .object({
      name: z.string(),
      last_price: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

export const RateLimitMetaSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number().optional(),
});

export const ApiSuccessAlertEnvelopeSchema = z.object({
  success: z.literal(true),
  data: AlertSchema,
  meta: z
    .object({
      rate_limit: RateLimitMetaSchema.optional(),
    })
    .optional(),
});

export const ApiSuccessAlertsListEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(AlertSchema),
  meta: z
    .object({
      pagination: PaginationMetaSchema.optional(),
      rate_limit: RateLimitMetaSchema.optional(),
    })
    .optional(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).nullable().optional(),
});

export const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const WatchlistItemSchema = z.object({
  id: z.string(),
  stock_symbol: z.string(),
  intention: z.enum(["buy", "sell"]).optional(),
  target_price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  initial_price: z.number().nullable().optional(),
  auto_alerts_enabled: z.boolean().optional(),
  stocks: z
    .object({
      symbol: z.string().optional(),
      name: z.string().optional(),
      last_price: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  active_alert_count: z.number().nullable().optional(),
  created_at: z.string().optional(),
});

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

export const CreateWatchlistItemRequestSchema = z.object({
  stock_symbol: z.string(),
  stock_name: z.string().optional(),
  intention: z.enum(["buy", "sell"]).optional(),
  target_price: z.number().optional(),
  notes: z.string().optional(),
});

export type CreateWatchlistItemRequest = z.infer<typeof CreateWatchlistItemRequestSchema>;

export const ApiSuccessWatchlistListEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(WatchlistItemSchema),
  meta: z
    .object({
      rate_limit: RateLimitMetaSchema.optional(),
    })
    .optional(),
});

export const ApiSuccessWatchlistItemEnvelopeSchema = z.object({
  success: z.literal(true),
  data: WatchlistItemSchema,
  meta: z
    .object({
      rate_limit: RateLimitMetaSchema.optional(),
    })
    .optional(),
});

export const SubscriptionSchema = z.object({
  is_premium: z.boolean(),
  account_type: z.string().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const ApiSuccessSubscriptionEnvelopeSchema = z.object({
  success: z.literal(true),
  data: SubscriptionSchema,
});

export interface AlertTypeInfo {
  condition: AlertCondition;
  category: "price" | "technical" | "fundamental" | "dividend" | "time" | "social";
  label: string;
  description: string;
  requiresThreshold: boolean;
  thresholdLabel?: string;
  thresholdUnit?: string;
  parameters?: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "select";
    label: string;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    required?: boolean;
  }>;
}

export const ALERT_TYPES: Record<AlertCondition, AlertTypeInfo> = {
  price_above: {
    condition: "price_above",
    category: "price",
    label: "Price Above",
    description: "Alert when price rises above a target",
    requiresThreshold: true,
    thresholdLabel: "Target Price",
    thresholdUnit: "$",
  },
  price_below: {
    condition: "price_below",
    category: "price",
    label: "Price Below",
    description: "Alert when price falls below a target",
    requiresThreshold: true,
    thresholdLabel: "Target Price",
    thresholdUnit: "$",
  },
  price_change_up: {
    condition: "price_change_up",
    category: "price",
    label: "Price Change Up",
    description: "Alert on a percentage increase",
    requiresThreshold: true,
    thresholdLabel: "Percentage Change",
    thresholdUnit: "%",
  },
  price_change_down: {
    condition: "price_change_down",
    category: "price",
    label: "Price Change Down",
    description: "Alert on a percentage decrease",
    requiresThreshold: true,
    thresholdLabel: "Percentage Change",
    thresholdUnit: "%",
  },
  daily_change_up: {
    condition: "daily_change_up",
    category: "price",
    label: "Daily Change Up",
    description: "Alert when today's move is up by a percentage",
    requiresThreshold: true,
    thresholdLabel: "Daily Increase",
    thresholdUnit: "%",
  },
  daily_change_down: {
    condition: "daily_change_down",
    category: "price",
    label: "Daily Change Down",
    description: "Alert when today's move is down by a percentage",
    requiresThreshold: true,
    thresholdLabel: "Daily Decrease",
    thresholdUnit: "%",
  },
  new_high: {
    condition: "new_high",
    category: "price",
    label: "New 52-Week High",
    description: "Alert when the stock hits a new 52-week high",
    requiresThreshold: false,
  },
  new_low: {
    condition: "new_low",
    category: "price",
    label: "New 52-Week Low",
    description: "Alert when the stock hits a new 52-week low",
    requiresThreshold: false,
  },
  ma_crossover_golden: {
    condition: "ma_crossover_golden",
    category: "technical",
    label: "Golden Cross",
    description: "50-day MA crosses above 200-day MA",
    requiresThreshold: false,
  },
  ma_crossover_death: {
    condition: "ma_crossover_death",
    category: "technical",
    label: "Death Cross",
    description: "50-day MA crosses below 200-day MA",
    requiresThreshold: false,
  },
  ma_touch_above: {
    condition: "ma_touch_above",
    category: "technical",
    label: "MA Touch Above",
    description: "Price crosses above a moving average",
    requiresThreshold: true,
    thresholdLabel: "MA Period",
    thresholdUnit: "days",
  },
  ma_touch_below: {
    condition: "ma_touch_below",
    category: "technical",
    label: "MA Touch Below",
    description: "Price crosses below a moving average",
    requiresThreshold: true,
    thresholdLabel: "MA Period",
    thresholdUnit: "days",
  },
  volume_change: {
    condition: "volume_change",
    category: "technical",
    label: "Volume Change",
    description: "Alert on unusual volume",
    requiresThreshold: true,
    thresholdLabel: "Volume Increase",
    thresholdUnit: "%",
    parameters: [
      {
        name: "volumeBaseline",
        type: "select",
        label: "Baseline",
        placeholder: "Use backend default",
        options: [
          { value: "ma20", label: "20-day Average" },
          { value: "ma50", label: "50-day Average" },
        ],
      },
    ],
  },
  rsi_limit: {
    condition: "rsi_limit",
    category: "technical",
    label: "RSI Limit",
    description: "Alert when RSI crosses a threshold",
    requiresThreshold: true,
    thresholdLabel: "RSI Value",
    parameters: [
      {
        name: "direction",
        type: "select",
        label: "Direction",
        placeholder: "Use backend default",
        options: [
          { value: "up", label: "Up" },
          { value: "down", label: "Down" },
          { value: "both", label: "Both" },
        ],
      },
    ],
  },
  pe_ratio_below: {
    condition: "pe_ratio_below",
    category: "fundamental",
    label: "P/E Ratio Below",
    description: "Alert when P/E falls below a threshold",
    requiresThreshold: true,
    thresholdLabel: "P/E Ratio",
  },
  pe_ratio_above: {
    condition: "pe_ratio_above",
    category: "fundamental",
    label: "P/E Ratio Above",
    description: "Alert when P/E rises above a threshold",
    requiresThreshold: true,
    thresholdLabel: "P/E Ratio",
  },
  forward_pe_below: {
    condition: "forward_pe_below",
    category: "fundamental",
    label: "Forward P/E Below",
    description: "Alert when forward P/E falls below a threshold",
    requiresThreshold: true,
    thresholdLabel: "Forward P/E",
  },
  forward_pe_above: {
    condition: "forward_pe_above",
    category: "fundamental",
    label: "Forward P/E Above",
    description: "Alert when forward P/E rises above a threshold",
    requiresThreshold: true,
    thresholdLabel: "Forward P/E",
  },
  earnings_announcement: {
    condition: "earnings_announcement",
    category: "fundamental",
    label: "Earnings Announcement",
    description: "Alert before earnings",
    requiresThreshold: true,
    thresholdLabel: "Days Before",
    thresholdUnit: "days",
  },
  dividend_ex_date: {
    condition: "dividend_ex_date",
    category: "dividend",
    label: "Dividend Ex-Date",
    description: "Alert before the ex-dividend date",
    requiresThreshold: true,
    thresholdLabel: "Days Before",
    thresholdUnit: "days",
  },
  dividend_payment: {
    condition: "dividend_payment",
    category: "dividend",
    label: "Dividend Payment",
    description: "Alert on the dividend payment date",
    requiresThreshold: false,
    parameters: [
      {
        name: "shares",
        type: "number",
        label: "Shares",
        required: true,
      },
    ],
  },
  reminder: {
    condition: "reminder",
    category: "time",
    label: "One-Time Reminder",
    description: "Reminder in a set number of days",
    requiresThreshold: true,
    thresholdLabel: "Days Until",
    thresholdUnit: "days",
  },
  daily_reminder: {
    condition: "daily_reminder",
    category: "time",
    label: "Daily Reminder",
    description: "Daily reminder for this stock",
    requiresThreshold: false,
    parameters: [
      {
        name: "deliveryTime",
        type: "select",
        label: "Delivery Time",
        placeholder: "Use backend default",
        options: [
          { value: "market_open", label: "Market Open" },
          { value: "after_market_close", label: "After Market Close" },
        ],
      },
    ],
  },
  insider_transactions: {
    condition: "insider_transactions",
    category: "fundamental",
    label: "Insider Transactions",
    description: "Alert on insider buys or sells above a minimum value",
    requiresThreshold: true,
    thresholdLabel: "Minimum Transaction Value",
    thresholdUnit: "$",
    parameters: [
      {
        name: "direction",
        type: "select",
        label: "Direction",
        placeholder: "Use backend default",
        options: [
          { value: "buy", label: "Buy" },
          { value: "sell", label: "Sell" },
          { value: "both", label: "Both" },
        ],
      },
      {
        name: "minExecutives",
        type: "number",
        label: "Min Executives",
      },
      {
        name: "windowDays",
        type: "number",
        label: "Window Days",
      },
      {
        name: "openMarketOnly",
        type: "boolean",
        label: "Open Market Only",
      },
    ],
  },
  social_buzz: {
    condition: "social_buzz",
    category: "social",
    label: "Social Buzz",
    description: "Alert when social volume is rising or falling",
    requiresThreshold: false,
    parameters: [
      {
        name: "direction",
        type: "select",
        label: "Direction",
        required: true,
        options: [
          { value: "rising", label: "Rising" },
          { value: "falling", label: "Falling" },
        ],
      },
    ],
  },
};

export const ALERT_CATEGORIES: Array<{
  id: AlertTypeInfo["category"];
  label: string;
  conditions: AlertCondition[];
}> = [
  {
    id: "price",
    label: "Price",
    conditions: [
      "price_above",
      "price_below",
      "price_change_up",
      "price_change_down",
      "daily_change_up",
      "daily_change_down",
      "new_high",
      "new_low",
    ],
  },
  {
    id: "technical",
    label: "Technical",
    conditions: [
      "ma_crossover_golden",
      "ma_crossover_death",
      "ma_touch_above",
      "ma_touch_below",
      "volume_change",
      "rsi_limit",
    ],
  },
  {
    id: "fundamental",
    label: "Fundamental",
    conditions: [
      "pe_ratio_below",
      "pe_ratio_above",
      "forward_pe_below",
      "forward_pe_above",
      "earnings_announcement",
      "insider_transactions",
    ],
  },
  {
    id: "social",
    label: "Social",
    conditions: ["social_buzz"],
  },
  {
    id: "dividend",
    label: "Dividend",
    conditions: ["dividend_ex_date", "dividend_payment"],
  },
  {
    id: "time",
    label: "Reminders",
    conditions: ["reminder", "daily_reminder"],
  },
];

export const BASIC_ALERT_CATEGORY_IDS = new Set<AlertTypeInfo["category"]>(["price", "time"]);

export function isBasicAlertCondition(condition: AlertCondition): boolean {
  return BASIC_ALERT_CATEGORY_IDS.has(ALERT_TYPES[condition].category);
}

export const BASIC_ALERT_UPGRADE_MESSAGE = "Price and Time only on Basic. Upgrade to Premium for technical, fundamental, and other alert types.";
