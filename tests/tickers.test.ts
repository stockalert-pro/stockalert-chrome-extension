import { describe, expect, it } from "vitest";

import { findTickerMentions, normalizeTicker } from "../src/tickers";

describe("ticker parsing", () => {
  it("normalizes stock ticker selections", () => {
    expect(normalizeTicker(" $nvda ")).toBe("NVDA");
    expect(normalizeTicker("BRK.B")).toBe("BRK.B");
  });

  it("rejects invalid ticker strings", () => {
    expect(normalizeTicker("")).toBeNull();
    expect(normalizeTicker("$")).toBeNull();
    expect(normalizeTicker("too-long-ticker")).toBeNull();
    expect(normalizeTicker("1234")).toBeNull();
  });

  it("finds likely ticker mentions in page text", () => {
    expect(findTickerMentions("NVDA rallied while $TSLA lagged and BRK.B stayed flat.")).toEqual([
      { start: 0, end: 4, ticker: "NVDA" },
      { start: 19, end: 24, ticker: "TSLA" },
      { start: 36, end: 41, ticker: "BRK.B" },
    ]);
  });

  it("avoids common uppercase false positives while allowing prefixed ambiguous tickers", () => {
    expect(findTickerMentions("The API is for US users and $AI remains valid.")).toEqual([
      { start: 28, end: 31, ticker: "AI" },
    ]);
  });

  it("ignores Yahoo Finance labels that are not stock symbols", () => {
    const page = [
      "NasdaqGS - Nasdaq Real Time Price - USD",
      "Apple Inc. (AAPL)",
      "At close: September 21 at 4:00:04 PM EDT",
      "Pre-Market: 8:03:13 AM EDT",
      "1D 5D 1M 6M YTD 1Y 5Y All",
      "PE Ratio (TTM)",
      "EPS (TTM)",
      "Some of the best HR and people leaders",
    ].join("\n");

    expect(findTickerMentions(page).map((mention) => mention.ticker)).toEqual(["AAPL"]);
  });

  it("still highlights listed tickers and parenthetical symbols", () => {
    expect(
      findTickerMentions("Trending tickers include META, VRTX, GRAB and Philip Morris (PM).").map(
        (mention) => mention.ticker
      )
    ).toEqual(["META", "VRTX", "GRAB", "PM"]);
  });
});
