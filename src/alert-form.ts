import { ALERT_TYPES, AlertCondition, AlertTypeInfo, CreateAlertRequest } from "./types";

type AlertParameter = NonNullable<AlertTypeInfo["parameters"]>[number];

export function renderParameterField(param: AlertParameter): string {
  switch (param.type) {
    case "select":
      return `
        <label class="label" for="param-${param.name}">${param.label}</label>
        <select class="select" id="param-${param.name}" data-param="${param.name}" data-param-type="${param.type}">
          <option value="" selected>${param.placeholder ?? (param.required ? `Select ${param.label}` : "Use backend default")}</option>
          ${param.options?.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("") ?? ""}
        </select>
      `;
    case "number":
      return `
        <label class="label" for="param-${param.name}">${param.label}</label>
        <input class="input" id="param-${param.name}" data-param="${param.name}" data-param-type="${param.type}" type="number" />
      `;
    case "boolean":
      return `
        <label class="checkbox">
          <input id="param-${param.name}" data-param="${param.name}" data-param-type="${param.type}" type="checkbox" />
          ${param.label}
        </label>
      `;
    default:
      return `
        <label class="label" for="param-${param.name}">${param.label}</label>
        <input class="input" id="param-${param.name}" data-param="${param.name}" data-param-type="${param.type}" type="text" />
      `;
  }
}

export function coerceParameterValue(param: AlertParameter, rawValue: string | boolean): unknown {
  if (param.type === "boolean") {
    return Boolean(rawValue);
  }

  if (param.type === "number") {
    if (rawValue === "") {
      return undefined;
    }
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  if (param.type === "select" && rawValue === "") {
    return undefined;
  }

  if (typeof rawValue === "string" && rawValue.trim() === "") {
    return undefined;
  }

  return rawValue;
}

export function getMissingRequiredParameters(
  condition: AlertCondition,
  parameters: Record<string, unknown>
): string[] {
  const definitions = ALERT_TYPES[condition].parameters ?? [];
  return definitions
    .filter((param) => {
      if (!param.required) {
        return false;
      }
      const value = parameters[param.name];
      return value === undefined || value === null || value === "";
    })
    .map((param) => param.name);
}

export function isAlertFormValid(input: {
  symbol: string;
  condition: AlertCondition | "";
  threshold: string;
  parameters: Record<string, unknown>;
}): boolean {
  const { symbol, condition, threshold, parameters } = input;
  if (!symbol.trim() || !condition) {
    return false;
  }

  const alertType = ALERT_TYPES[condition];
  if (alertType.requiresThreshold && threshold.trim() === "") {
    return false;
  }

  return getMissingRequiredParameters(condition, parameters).length === 0;
}

export function buildCreateAlertRequest(input: {
  symbol: string;
  condition: AlertCondition;
  threshold: string;
  parameters: Record<string, unknown>;
}): CreateAlertRequest {
  const { symbol, condition, threshold, parameters } = input;
  const alertType = ALERT_TYPES[condition];
  const request: CreateAlertRequest = {
    symbol: symbol.trim().toUpperCase(),
    condition,
    notification: "email",
  };

  if (alertType.requiresThreshold) {
    request.threshold = Number(threshold);
  }

  if (Object.keys(parameters).length > 0) {
    request.parameters = parameters;
  }

  return request;
}
