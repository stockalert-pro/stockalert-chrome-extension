# Troubleshooting

## Extension does not load

- Build first: `npm run build`
- Load the `dist/` folder, not the repo root
- Check the service worker error on `chrome://extensions`

## API key does not save

- Keys start with `sk_`
- Create a key at https://app.stockalert.pro/settings#api-keys
- Required scopes: `alerts:read`, `alerts:write`, `watchlist:read`, `watchlist:write`

## Tickers are not highlighted

- Click **Enable ticker detection on this site** in the popup and allow Chrome site access
- Detection stays on for that site after reload until you turn it off
- Detection only runs on `http` and `https` pages, not on StockAlert.pro itself
- After reloading the unpacked extension, visit the site once so the content script can register again

## Alerts fail to create

- Confirm the API key is valid and has alert write scope
- Check the popup error message
- Basic plans have alert limits; Premium raises them

## Context menu is missing

- Reload the extension
- Select a ticker such as `NVDA` or `$AAPL`, then right-click
