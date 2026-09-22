import { describe, expect, it } from "vitest";

import { ALERT_TYPES, isBasicAlertCondition } from "../src/types";
import {
  buildCreateAlertRequest,
  coerceParameterValue,
  isAlertFormValid,
  renderParameterField,
} from "../src/alert-form";

describe("alert-form helpers", () => {
  it("renders placeholder options for optional select parameters", () => {
    const html = renderParameterField(ALERT_TYPES.insider_transactions.parameters![0]);

    expect(html).toContain('<option value="" selected>Use backend default</option>');
    expect(html).toContain('data-param="direction"');
  });

  it("renders fields for non-select parameter types", () => {
    const html = renderParameterField(ALERT_TYPES.insider_transactions.parameters![3]);

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-param="openMarketOnly"');
  });

  it("coerces parameter values to the expected runtime types", () => {
    expect(coerceParameterValue({ name: "shares", type: "number", label: "Shares" }, "25")).toBe(25);
    expect(
      coerceParameterValue({ name: "openMarketOnly", type: "boolean", label: "Open Market Only" }, true)
    ).toBe(true);
    expect(coerceParameterValue({ name: "direction", type: "select", label: "Direction" }, "both")).toBe("both");
    expect(
      coerceParameterValue(
        {
          name: "direction",
          type: "select",
          label: "Direction",
          placeholder: "Use backend default",
        },
        ""
      )
    ).toBeUndefined();
  });

  it("validates required threshold and parameter combinations", () => {
    expect(
      isAlertFormValid({
        symbol: "AAPL",
        condition: "daily_reminder",
        threshold: "",
        parameters: { deliveryTime: "market_open" },
      })
    ).toBe(true);

    expect(
      isAlertFormValid({
        symbol: "KO",
        condition: "dividend_payment",
        threshold: "",
        parameters: {},
      })
    ).toBe(false);

    expect(
      isAlertFormValid({
        symbol: "MSFT",
        condition: "insider_transactions",
        threshold: "250000",
        parameters: { direction: "buy" },
      })
    ).toBe(true);

    expect(
      isAlertFormValid({
        symbol: "NVDA",
        condition: "daily_change_up",
        threshold: "5",
        parameters: {},
      })
    ).toBe(true);
  });

  it("builds create alert requests with typed parameters", () => {
    expect(
      buildCreateAlertRequest({
        symbol: " msft ",
        condition: "insider_transactions",
        threshold: "250000",
        parameters: {
          direction: "buy",
          minExecutives: 2,
          openMarketOnly: true,
        },
      })
    ).toEqual({
      symbol: "MSFT",
      condition: "insider_transactions",
      notification: "email",
      threshold: 250000,
      parameters: {
        direction: "buy",
        minExecutives: 2,
        openMarketOnly: true,
      },
    });
  });

  it("requires a social buzz direction and omits threshold", () => {
    expect(
      isAlertFormValid({
        symbol: "TSLA",
        condition: "social_buzz",
        threshold: "",
        parameters: {},
      })
    ).toBe(false);

    expect(
      buildCreateAlertRequest({
        symbol: "tsla",
        condition: "social_buzz",
        threshold: "10",
        parameters: { direction: "falling" },
      })
    ).toEqual({
      symbol: "TSLA",
      condition: "social_buzz",
      notification: "email",
      parameters: { direction: "falling" },
    });
  });
});

describe("basic vs premium alert types", () => {
  it("allows only price and time conditions on Basic", () => {
    expect(isBasicAlertCondition("price_above")).toBe(true);
    expect(isBasicAlertCondition("reminder")).toBe(true);
    expect(isBasicAlertCondition("ma_crossover_death")).toBe(false);
    expect(isBasicAlertCondition("social_buzz")).toBe(false);
  });
});
