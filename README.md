# StockAlert Chrome Extension

Detect stock tickers while browsing and create alerts or add symbols to your watchlist with [StockAlert.pro](https://stockalert.pro).

## Features

- Highlight a ticker and right-click **Create StockAlert.pro alert**.
- Enable ticker detection on a site from the popup. Chrome remembers that site after reload. Detected symbols open a card with **Create Alert** and **Add to Watchlist**.
- Create StockAlert.pro alerts from the popup, including price, daily change, technical, fundamental, dividend, insider, and social conditions.
- Sync your watchlist through the StockAlert.pro API.
- Store the API key locally in Chrome. Requests go only to `https://api.stockalert.pro`.

## Development

```bash
npm install
npm run verify
```

Load locally:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable developer mode.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.

## Chrome Web Store

Single purpose: create StockAlert.pro alerts and manage a watchlist for selected stock tickers while browsing.

This extension does not collect browsing history, does not inject ads, does not ship analytics, and does not execute remotely hosted JavaScript. If you enable ticker detection on a site, webpage text is scanned locally only to detect likely stock ticker symbols. Page contents are not sent to StockAlert.pro.

Store listing copy, privacy answers, and screenshot notes live in `docs/WEBSTORE.md`.

```bash
npm run assets:store
npm run dist:zip
```

## Links

- Product: https://stockalert.pro
- API docs: https://stockalert.pro/api/docs
- Privacy: https://stockalert.pro/privacy
- Get an API key: https://app.stockalert.pro/settings#api-keys

## Disclaimer

StockAlert.pro helps you create alerts. It is not financial advice.
