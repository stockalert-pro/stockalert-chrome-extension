import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TICKER_PATTERN = /^[A-Z][A-Z0-9.]{0,9}$/;
const SOURCES = [
  {
    url: "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt",
    symbolIndex: 0,
    testIndex: 3,
  },
  {
    url: "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt",
    symbolIndex: 0,
    testIndex: 6,
  },
];

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  return response.text();
}

function parse(text, symbolIndex, testIndex) {
  const tickers = [];
  for (const line of text.trim().split("\n").slice(1)) {
    if (line.startsWith("File Creation")) continue;
    const cols = line.split("|");
    const ticker = (cols[symbolIndex] || "").trim().replace(/\//g, ".").toUpperCase();
    if (cols[testIndex] === "Y") continue;
    if (TICKER_PATTERN.test(ticker)) tickers.push(ticker);
  }
  return tickers;
}

const unique = [...new Set((await Promise.all(SOURCES.map(async (source) => parse(await download(source.url), source.symbolIndex, source.testIndex)))).flat())].sort();

const body = `/** Generated from NASDAQ Trader symbol directories. Regenerate with \`node scripts/sync-known-tickers.mjs\`. */
export const KNOWN_TICKERS = new Set<string>(
  "${unique.join(",")}".split(",")
);
`;

const out = resolve("src/known-tickers.ts");
writeFileSync(out, body);
console.log(`Wrote ${unique.length} tickers to ${out}`);
