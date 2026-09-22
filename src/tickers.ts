import { KNOWN_TICKERS } from "./known-tickers";

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,9}$/;
const TICKER_SCAN_PATTERN = /(^|[^A-Za-z0-9.])(\$?[A-Z][A-Z0-9]{0,4}(?:\.[A-Z])?)(?![A-Za-z0-9.])/g;

const NEVER_SCAN_WORDS = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "CAD",
  "AUD",
  "CHF",
  "HKD",
  "INR",
  "KRW",
  "BRL",
  "MXN",
  "SEK",
  "NOK",
  "DKK",
  "NZD",
  "SGD",
  "ZAR",
  "TRY",
  "UTC",
  "GMT",
  "EST",
  "EDT",
  "CST",
  "CDT",
  "MST",
  "MDT",
  "PST",
  "PDT",
  "BST",
  "CET",
  "CEST",
  "YTD",
  "TTM",
  "YOY",
  "QOQ",
  "MOM",
  "MTD",
  "QTD",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "NYSE",
  "NASDAQ",
  "AMEX",
  "CBOE",
  "HTML",
  "HTTP",
  "HTTPS",
  "CSS",
  "PDF",
  "FAQ",
  "CEO",
  "ETF",
  "SEC",
  "GDP",
  "INC",
  "LTD",
  "LLC",
  "THE",
  "AND",
  "FROM",
  "WITH",
  "THIS",
  "THAT",
]);

const AMBIGUOUS_UNPREFIXED = new Set([
  "ALL",
  "API",
  "APP",
  "ARE",
  "BID",
  "BOND",
  "BULL",
  "CAN",
  "CASH",
  "CFO",
  "COO",
  "CORP",
  "COST",
  "CRM",
  "CTO",
  "DEC",
  "EBIT",
  "EDIT",
  "EPS",
  "FACT",
  "FAST",
  "FOR",
  "FRI",
  "FUND",
  "GAIN",
  "GAME",
  "GOLD",
  "GOOD",
  "GROW",
  "HARD",
  "HAS",
  "HELP",
  "HIDE",
  "HIGH",
  "HIS",
  "HOPE",
  "IMF",
  "IPO",
  "JAN",
  "JOB",
  "JUST",
  "KNOW",
  "LAND",
  "LAW",
  "LIFE",
  "LINE",
  "LIVE",
  "LOVE",
  "LOW",
  "MADE",
  "MAIN",
  "MAN",
  "MAR",
  "MAX",
  "MIN",
  "MIND",
  "MOVE",
  "MUST",
  "NEAR",
  "NET",
  "NEXT",
  "NOV",
  "NOW",
  "OPEN",
  "OUT",
  "OWN",
  "PLAY",
  "PLUS",
  "REAL",
  "ROAD",
  "ROCK",
  "ROE",
  "RUN",
  "SAFE",
  "SAY",
  "SEEM",
  "SHE",
  "SHOP",
  "SIZE",
  "SNOW",
  "SUN",
  "SURE",
  "TEAM",
  "TECH",
  "TEST",
  "TIME",
  "TOP",
  "TOWN",
  "TREE",
  "UNIT",
  "USA",
  "USE",
  "WANT",
  "WAY",
  "WEEK",
  "WELL",
  "WEST",
  "WOOD",
  "WWW",
  "YEAR",
  "YOU",
]);

const HIGH_CONFIDENCE_TWO_LETTER = new Set([
  "BA",
  "BP",
  "BX",
  "CB",
  "CL",
  "DD",
  "DE",
  "FE",
  "GD",
  "GE",
  "GM",
  "GS",
  "HD",
  "KO",
  "MA",
  "MO",
  "MS",
  "PG",
  "PH",
  "TM",
  "UL",
  "VZ",
  "WM",
  "WY",
]);

const TIMEZONE_AFTER = /^(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|BST|CET|CEST)\b/;
const TIME_BEFORE = /\d{1,2}:\d{2}(?::\d{2})?\s*$/;

export type TickerMention = {
  end: number;
  start: number;
  ticker: string;
};

export function normalizeTicker(input: string): string | null {
  const ticker = input.trim().replace(/^\$/, "").toUpperCase();
  if (!TICKER_PATTERN.test(ticker)) return null;
  return ticker;
}

function isParenthetical(text: string, start: number, rawLength: number): boolean {
  return text[start - 1] === "(" && text[start + rawLength] === ")";
}

function isTimeContext(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 16), start);
  const after = text.slice(end, end + 8).trimStart();
  return TIME_BEFORE.test(before) || TIMEZONE_AFTER.test(after);
}

function isLikelyTicker(rawValue: string, ticker: string, text: string, start: number): boolean {
  if (NEVER_SCAN_WORDS.has(ticker)) return false;
  if (isTimeContext(text, start, start + rawValue.length)) return false;

  const hasDollarPrefix = rawValue.startsWith("$");
  if (hasDollarPrefix) return true;
  if (ticker.length === 1) return false;

  const parenthetical = isParenthetical(text, start, rawValue.length);
  if (AMBIGUOUS_UNPREFIXED.has(ticker) && !parenthetical) return false;
  if (ticker.length === 2 && !HIGH_CONFIDENCE_TWO_LETTER.has(ticker) && !parenthetical) return false;
  return KNOWN_TICKERS.has(ticker);
}

export function findTickerMentions(text: string, limit = 50): TickerMention[] {
  const mentions: TickerMention[] = [];

  for (const match of text.matchAll(TICKER_SCAN_PATTERN)) {
    const prefix = match[1] ?? "";
    const rawValue = match[2] ?? "";
    const ticker = normalizeTicker(rawValue);
    const start = (match.index ?? 0) + prefix.length;
    if (!ticker || !isLikelyTicker(rawValue, ticker, text, start)) continue;

    mentions.push({
      end: start + rawValue.length,
      start,
      ticker,
    });

    if (mentions.length >= limit) break;
  }

  return mentions;
}
