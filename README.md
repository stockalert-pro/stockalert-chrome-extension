# StockAlert Chrome Extension

> Detect stock symbols on any webpage and create alerts or add to watchlist with StockAlert.pro

## Features

- **Automatic Symbol Detection**: Scans webpages for stock ticker symbols (AAPL, GOOGL, etc.)
- **Visual Highlighting**: Highlights detected symbols with hover effects
- **Quick Actions**: Click any symbol to instantly create alerts or add to watchlist
- **21 Alert Types**: Full support for all StockAlert.pro alert conditions:
  - Price alerts (above, below, change up/down, 52-week high/low)
  - Technical indicators (MA crossovers, RSI, volume)
  - Fundamental alerts (P/E ratios, earnings, dividends)
  - Reminders (one-time, daily)
- **Watchlist Management**: API-based watchlist synced across devices
- **Real-time Notifications**: Chrome notifications for alert creation
- **Privacy-Focused**: API key stored locally, encrypted by Chrome

## Installation

### For Development

1. **Clone and install dependencies**:

```bash
cd chrome-extension
npm install
```

2. **Build the extension**:

```bash
npm run build
```

3. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder

### For Production

_Coming soon: Chrome Web Store listing_

## Configuration

### 1. Get API Key

1. Go to [StockAlert.pro](https://stockalert.pro)
2. Create an account or log in
3. Navigate to Dashboard → API Keys
4. Create a new API key with required scopes:
   - `alerts:read`
   - `alerts:write`
   - `watchlist:read`
   - `watchlist:write`

### 2. Configure Extension

1. Click the extension icon in Chrome toolbar
2. Enter your API key in the "API Configuration" section
3. Click "Save API Key"

## Usage

### Detecting Symbols

1. **Browse any webpage** containing stock symbols (news sites, forums, blogs)
2. Symbols are automatically detected and highlighted
3. **Click any highlighted symbol** to see quick actions

### Creating Alerts

**Option 1: From Highlighted Symbol**

1. Click a highlighted symbol on any webpage
2. Click "📊 Create Alert" in the popup
3. Select alert type and configure threshold
4. Click "Create Alert"

**Option 2: From Extension Popup**

1. Click extension icon
2. Enter stock symbol manually
3. Select alert type and configure
4. Click "Create Alert"

### Managing Watchlist

**Add to Watchlist**:

- Click highlighted symbol → "⭐ Add to Watchlist"
- Symbol is saved via API and synced across devices

**Remove from Watchlist**:

- Open extension popup
- Click "✕" next to symbol in watchlist section
- Changes are synced via API

## Alert Types Reference

| Category      | Alert Type              | Requires Threshold | Description                     |
| ------------- | ----------------------- | ------------------ | ------------------------------- |
| **Price**     | Price Above             | ✅                 | Alert when price > threshold    |
|               | Price Below             | ✅                 | Alert when price < threshold    |
|               | Price Change Up         | ✅                 | Alert on % increase             |
|               | Price Change Down       | ✅                 | Alert on % decrease             |
|               | New 52-Week High        | ❌                 | Alert on new high               |
|               | New 52-Week Low         | ❌                 | Alert on new low                |
| **Technical** | Golden Cross            | ❌                 | 50-day MA crosses above 200-day |
|               | Death Cross             | ❌                 | 50-day MA crosses below 200-day |
|               | MA Touch Above          | ✅                 | Price crosses above MA          |
|               | MA Touch Below          | ✅                 | Price crosses below MA          |
|               | Volume Change           | ✅                 | Unusual volume spike            |
|               | RSI Limit               | ✅                 | RSI crosses threshold           |
| **Funds**     | P/E Ratio Below         | ✅                 | P/E < threshold                 |
|               | P/E Ratio Above         | ✅                 | P/E > threshold                 |
|               | Forward P/E Below       | ✅                 | Forward P/E < threshold         |
|               | Forward P/E Above       | ✅                 | Forward P/E > threshold         |
|               | Earnings Announcement   | ✅                 | N days before earnings          |
| **Dividend**  | Dividend Ex-Date        | ✅                 | N days before ex-date           |
|               | Dividend Payment        | ❌                 | On payment date                 |
| **Time**      | One-Time Reminder       | ❌                 | Single reminder                 |
|               | Daily Reminder          | ❌                 | Daily reminder                  |

## Settings

Access settings in the extension popup:

- **Auto-detect symbols**: Enable/disable automatic symbol detection
- **Highlight symbols**: Show/hide visual highlighting on webpages

## Architecture

```
chrome-extension/
├── src/
│   ├── background/          # Service worker (API calls)
│   ├── content/             # Content script (symbol detection)
│   ├── popup/               # Extension popup UI
│   └── lib/                 # Shared utilities
│       ├── api-client.ts    # StockAlert API wrapper
│       ├── symbol-detector.ts
│       ├── storage.ts       # Chrome storage wrapper
│       ├── types.ts         # TypeScript types
│       └── rate-limiter.ts
├── public/
│   ├── manifest.json        # Manifest V3 config
│   └── icons/
└── dist/                    # Built extension (load this)
```

## Development

### Available Scripts

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Clean build directory
npm run clean
```

### Tech Stack

- **TypeScript** - Type safety
- **Vite** - Build tooling
- **Zod** - Runtime schema validation
- **Chrome Extension Manifest V3** - Latest extension standard

### API Integration

The extension uses the [StockAlert.pro API v1](https://stockalert.pro/api/docs):

- Base URL: `https://stockalert.pro/api/v1`
- Authentication: API Key via `X-API-Key` header
- Response format: Envelope with `{ success, data, meta }`
- Rate limiting: 100 requests/hour (Basic), 10,000/hour (Premium)

## Privacy & Security

- **API Key Storage**: Encrypted in Chrome storage (local only, not synced)
- **No Tracking**: Extension does not collect analytics or usage data
- **HTTPS Only**: All API calls over secure HTTPS
- **Minimal Permissions**: Only requires `storage`, `activeTab`, and `notifications`
- **API-Based Watchlist**: Watchlist stored securely on StockAlert.pro servers
- **No Third Parties**: Direct integration with StockAlert.pro API only

## Troubleshooting

### API Key Not Saving

- Ensure key starts with `sk_`
- Check Chrome storage is not full
- Try clearing extension storage: Chrome → Settings → Privacy → Site Settings → StockAlert Extension

### Symbols Not Detected

- Enable "Auto-detect symbols" in settings
- Refresh the page after enabling detection
- Some dynamic content may require a page reload

### Alerts Not Creating

- Verify API key is valid in StockAlert.pro dashboard
- Check browser console for error messages (F12 → Console)
- Ensure you're not rate limited (100 req/hour on Basic tier)

### Extension Not Loading

- Ensure you built the extension: `npm run build`
- Load the `dist` folder, not the root folder
- Check Chrome extensions page for error messages

## Contributing

This extension is part of the [StockAlert.pro](https://github.com/stockalert-pro) organization.

To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Proprietary - StockAlert.pro

## Support

- API Reference: https://stockalert.pro/api/docs
- Support: support@stockalert.pro
- Issues: [GitHub Issues](https://github.com/stockalert-pro/stockalert-chrome-extension/issues)

## Related Projects

Explore other StockAlert.pro integrations at [github.com/stockalert-pro](https://github.com/stockalert-pro):

- JavaScript SDK - Official JS/TS SDK
- Python SDK - Official Python SDK
- n8n Nodes - Workflow automation
- Slack App - Slack integration

---

**Built with ❤️ for stock market enthusiasts**
