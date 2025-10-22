# CLAUDE.md - Chrome Extension Development Guide

## Project Overview

This is a Chrome Extension (Manifest V3) that detects stock symbols on any webpage and provides quick actions to create alerts via StockAlert.pro API or add symbols to a local watchlist.

**Key Features**:
- Automatic stock symbol detection using regex
- Visual highlighting with hover overlays
- Direct API integration for alert creation
- Local watchlist management
- 21 supported alert types
- Privacy-focused (local storage only)

## Architecture

### File Structure

```
chrome-extension/
├── src/
│   ├── background/
│   │   └── background.ts           # Service worker - API calls, messaging
│   ├── content/
│   │   ├── content.ts              # Content script - symbol detection, UI
│   │   └── content.css             # Injected styles for highlighting
│   ├── popup/
│   │   ├── popup.html              # Extension popup UI
│   │   ├── popup.css               # Popup styles
│   │   └── popup.ts                # Popup interactivity
│   └── lib/
│       ├── api-client.ts           # StockAlert API wrapper
│       ├── symbol-detector.ts      # Symbol detection engine
│       ├── storage.ts              # Chrome storage wrapper
│       ├── types.ts                # TypeScript types + Zod schemas
│       └── rate-limiter.ts         # Client-side rate limiting
├── public/
│   ├── manifest.json               # Manifest V3 configuration
│   └── icons/                      # Extension icons (16, 48, 128)
└── dist/                           # Build output (load in Chrome)
```

### Component Interaction Flow

1. **Content Script** (`content.ts`):
   - Runs on every webpage
   - Scans DOM for stock symbols using `SymbolDetector`
   - Highlights detected symbols
   - Shows overlay on click
   - Sends messages to background worker

2. **Background Service Worker** (`background.ts`):
   - Handles API calls to StockAlert.pro
   - Manages Chrome storage operations
   - Processes messages from content script and popup
   - Shows Chrome notifications

3. **Popup** (`popup.ts`):
   - Configuration UI for API key
   - Alert creation form with all 21 alert types
   - Watchlist management
   - Settings panel

4. **Storage** (`storage.ts`):
   - Wraps `chrome.storage.local` with type safety
   - Stores: API key, watchlist, settings
   - Validates data with Zod schemas

## Key Implementation Details

### Symbol Detection (`symbol-detector.ts`)

**Regex Pattern**: `/\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g`

- Matches 1-5 uppercase letters
- Optional dot + 1-2 letters (for exchanges like BRK.A)
- Word boundaries to avoid partial matches

**Exclusions**:
- Common English words (THE, AND, FOR, etc.)
- HTML tags (SCRIPT, STYLE, CODE, etc.)
- Already highlighted elements

**Performance**:
- Uses `TreeWalker` for efficient DOM traversal
- Mutation observer for dynamic content
- Debounced rescanning (500ms)

### API Client (`api-client.ts`)

**Base URL**: `https://stockalert.pro/api/v1`

**Authentication**: `X-API-Key` header

**Methods**:
- `createAlert(request)` - Create new alert
- `listAlerts(params)` - List user alerts (not currently used)
- `getAlert(id)` - Get single alert (not currently used)
- `deleteAlert(id)` - Delete alert (not currently used)

**Error Handling**:
- Custom `StockAlertApiError` class
- Parses API error envelope
- Shows user-friendly notifications

### Storage Schema (`types.ts`)

```typescript
{
  apiKey?: string;
  watchlist: Array<{
    symbol: string;
    addedAt: string;
    notes?: string;
  }>;
  settings: {
    autoDetect: boolean;
    highlightSymbols: boolean;
    overlayPosition: 'top' | 'bottom' | 'cursor';
  };
}
```

### Alert Types

All 21 alert types defined in `ALERT_TYPES` constant:

**Categories**:
- Price (6 types)
- Technical (6 types)
- Fundamental (5 types)
- Dividend (2 types)
- Time (2 types)

**Metadata per type**:
- `requiresThreshold`: boolean
- `thresholdLabel`: string (e.g., "Target Price")
- `thresholdUnit`: string (e.g., "$", "%", "days")
- `parameters`: optional additional inputs

## Development Workflow

### Building

```bash
# Development mode (watch + sourcemaps)
npm run dev

# Production build (minified)
npm run build
```

**Build Output** (`dist/`):
- `background.js` - Service worker
- `content.js` - Content script
- `content.css` - Content styles
- `popup.js` - Popup script
- `popup.html` - Popup HTML
- `popup.css` - Popup styles
- `manifest.json` - Extension manifest
- `icons/` - Extension icons

### Loading in Chrome

1. Build: `npm run build`
2. Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. "Load unpacked" → Select `dist/` folder

### Debugging

**Content Script**:
- Right-click page → Inspect → Console tab
- Look for `[StockAlert]` prefixed logs

**Background Worker**:
- Chrome extensions page → Extension details → "Inspect views: service worker"

**Popup**:
- Right-click extension icon → "Inspect popup"

## API Integration

### Creating Alerts

**Request** (`POST /api/v1/alerts`):
```json
{
  "symbol": "AAPL",
  "condition": "price_above",
  "threshold": 200,
  "notification": "email",
  "parameters": {} // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "symbol": "AAPL",
    "condition": "price_above",
    "threshold": 200,
    "status": "active",
    "created_at": "2025-01-01T12:00:00Z",
    "initial_price": 189.2
  },
  "meta": {
    "rateLimit": {
      "limit": 100,
      "remaining": 99,
      "reset": 1736180400000
    }
  }
}
```

### Error Handling

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid threshold",
    "details": { ... }
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR` - Invalid request params
- `UNAUTHORIZED` - Invalid API key
- `FORBIDDEN` - Missing scopes
- `RATE_LIMITED` - Too many requests
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## Common Development Tasks

### Adding a New Alert Type

1. **Update OpenAPI spec** (in main repo)
2. **Add to `AlertConditionSchema`** in `types.ts`
3. **Add to `ALERT_TYPES`** constant with metadata
4. **Update popup HTML** `<select>` options

### Modifying Symbol Detection

**File**: `src/lib/symbol-detector.ts`

**Pattern**: `SYMBOL_PATTERN` regex
**Exclusions**: `EXCLUDED_WORDS`, `EXCLUDED_TAGS` sets

**Performance considerations**:
- Use `IntersectionObserver` for lazy detection
- Debounce mutation observer callbacks
- Limit DOM traversal depth

### Customizing Overlay UI

**File**: `src/content/content.ts`

**Function**: `createOverlay(symbol, inWatchlist)`

**Styling**: Inline styles for isolation from page CSS
- Use `!important` sparingly
- Shadow DOM could be added for stronger isolation

### Storage Management

**File**: `src/lib/storage.ts`

**Methods**:
- `getApiKey()` / `saveApiKey(key)`
- `getWatchlist()` / `addToWatchlist(symbol)`
- `getSettings()` / `updateSettings(updates)`

**Validation**: All storage operations validated with Zod schemas

## Security Considerations

### API Key Storage

- Stored in `chrome.storage.local` (encrypted by Chrome)
- NOT synced across devices
- Never exposed to page scripts
- Validated on save (must start with `sk_`)

### Content Script Isolation

- Runs in isolated world (no access to page JS variables)
- Uses message passing to communicate with background
- Overlay uses inline styles to prevent page CSS interference

### Permissions

**Minimal permissions**:
- `storage` - Local data persistence
- `activeTab` - Access current tab when clicked
- `https://stockalert.pro/*` - API calls only

**NOT requested**:
- `<all_urls>` - Only inject when needed
- `tabs` - Don't track browsing
- `webRequest` - No request interception

## Testing Strategy

### Manual Testing Checklist

- [ ] Symbol detection on various websites (news, forums, blogs)
- [ ] Highlighting appears and is clickable
- [ ] Overlay shows on symbol click
- [ ] Alert creation for all 21 types
- [ ] Watchlist add/remove
- [ ] Watchlist export
- [ ] Settings toggle (auto-detect, highlighting)
- [ ] API key save/validation
- [ ] Error notifications
- [ ] Rate limiting handling

### Test Pages

Good sites for testing symbol detection:
- https://finance.yahoo.com
- https://www.marketwatch.com
- https://seekingalpha.com
- Reddit r/stocks, r/investing

### Edge Cases

- **Dynamic content**: Single-page apps (React, Vue sites)
- **Overlapping symbols**: Multiple occurrences on page
- **False positives**: Common words that look like symbols
- **Non-English sites**: International stock symbols

## Performance Optimization

### Current Optimizations

1. **Debounced mutation observer** (500ms)
2. **Excluded tags** (skip SCRIPT, STYLE, etc.)
3. **Range caching** for highlighted elements
4. **Lazy overlay creation** (only on click)

### Future Improvements

- IntersectionObserver for viewport-only detection
- Web Worker for symbol scanning
- IndexedDB for larger watchlists
- Symbol validation via API (check if ticker exists)

## Troubleshooting

### Symbols not detected

**Check**:
- Settings → Auto-detect enabled
- Page has finished loading
- Symbols match pattern (1-5 uppercase letters)
- Not in excluded words list

**Debug**:
```javascript
// In console on page
document.querySelectorAll('.stockalert-symbol')
```

### API calls failing

**Check**:
- API key starts with `sk_`
- API key has required scopes
- Not rate limited (check response)
- Network tab shows request

**Debug**:
```javascript
// In background service worker console
chrome.storage.local.get('apiKey')
```

### Overlay not showing

**Check**:
- Symbol is highlighted (clickable)
- No console errors
- Overlay not blocked by page CSS

**Debug**:
```javascript
// In page console
document.querySelector('.stockalert-overlay')
```

## Future Enhancements

### Planned Features

- [ ] Symbol price display in overlay (fetch from API)
- [ ] Recently created alerts list
- [ ] Alert history/statistics
- [ ] Bulk alert creation from watchlist
- [ ] Import watchlist from CSV
- [ ] Symbol autocomplete
- [ ] Keyboard shortcuts
- [ ] Dark mode

### API Limitations

- No real-time price endpoint (would need external API)
- No symbol validation endpoint (would reduce false positives)
- No bulk alert creation endpoint
- Rate limits on Basic tier (100 req/hour)

## Related Documentation

- [Main CLAUDE.md](../CLAUDE.md) - Monorepo overview
- [OpenAPI Spec](../openapi.yaml) - API reference
- [JS SDK CLAUDE.md](../stockalert-js-sdk/CLAUDE.md) - SDK implementation
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**When working on this extension, prioritize:**
1. User privacy (minimal permissions, local storage)
2. Performance (efficient DOM scanning)
3. Error handling (graceful degradation)
4. Type safety (TypeScript strict mode)
