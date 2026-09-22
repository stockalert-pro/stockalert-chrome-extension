# CLAUDE.md - Chrome Extension Development Guide

This is a Manifest V3 Chrome extension that detects stock tickers after explicit user action and creates alerts through the StockAlert.pro API.

## Architecture

```
src/
  background.ts     # Service worker: context menu, API messages
  content.ts        # Self-contained page scanner, injected via scripting
  popup.ts          # Popup UI
  options.ts        # API key settings page
  api-client.ts     # api.stockalert.pro wrapper
  tickers.ts        # Ticker normalize/scan helpers
  alert-form.ts     # Alert form validation
  storage.ts        # chrome.storage.local
  types.ts          # Zod schemas and ALERT_TYPES
public/
  manifest.json
  content.css
  icons/
```

## Store review constraints

- No `<all_urls>` content scripts.
- Page detection is enabled per site after an explicit popup click, using `optional_host_permissions` so it survives reloads.
- Required host permission is only `https://api.stockalert.pro/*`.
- Content script must stay self-contained: no `import` / `export`.
- No analytics, ads, or remote JavaScript.

## Commands

```bash
npm run verify
npm run dist:zip
npm run assets:store
```

Load `dist/` in `chrome://extensions` as an unpacked extension.
