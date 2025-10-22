# Troubleshooting Guide

## Symbols Not Being Detected

### Quick Checks

1. **Open Chrome DevTools** (F12) and go to Console tab
2. Look for `[StockAlert]` messages - you should see:
   ```
   [StockAlert] Content script loaded on: https://...
   [StockAlert] Settings loaded: {...}
   [StockAlert] Detector created
   [StockAlert] Starting document scan...
   [StockAlert] ✅ Highlighted X unique symbols
   ```

### Common Issues

#### 1. Extension Not Loaded

**Symptoms**: No console messages at all

**Solution**:
- Go to `chrome://extensions/`
- Verify extension shows "ON" toggle
- Look for error messages under extension
- Try removing and re-adding the extension

#### 2. Auto-Detect Disabled

**Symptoms**: Console shows "Auto-detect disabled in settings"

**Solution**:
- Click extension icon
- Scroll to Settings section
- Check ☑️ "Auto-detect symbols on webpages"
- Refresh the page

#### 3. Content Script Blocked

**Symptoms**: No console messages on specific sites

**Solution**:
- Some sites (chrome://, about://, extension pages) block content scripts
- Try on: https://finance.yahoo.com or https://www.marketwatch.com
- Extension cannot run on Chrome internal pages

#### 4. Storage Access Error

**Symptoms**: Console shows "Failed to load settings"

**Solution**:
- Extension still runs with defaults
- Try clearing extension storage:
  1. `chrome://extensions/`
  2. Find StockAlert extension
  3. Click "Details"
  4. Scroll to "Storage"
  5. Click "Clear storage"
- Reload extension

#### 5. CSP Violations

**Symptoms**: Console shows Content Security Policy errors

**Solution**:
- Some sites have strict CSP that blocks inline styles
- The extension uses inline styles for isolation
- Try on test page: `chrome-extension://YOUR_ID/test.html`

### Testing Steps

#### Step 1: Test Page

1. Open the included test page:
   ```
   file:///path/to/chrome-extension/test.html
   ```
   Or right-click `test.html` → Open with Chrome

2. Should see blue underlines on symbols like AAPL, MSFT, etc.

3. Check debug section at bottom of page

#### Step 2: Yahoo Finance

1. Go to https://finance.yahoo.com/quote/AAPL/
2. Open DevTools Console (F12)
3. Look for `[StockAlert]` messages
4. Symbols should be highlighted in article text

#### Step 3: Manual Trigger

Open console and run:
```javascript
// Check if content script loaded
console.log('Content script active:', window.location.href);

// Check for highlighted elements
document.querySelectorAll('.stockalert-symbol').length;

// Force rescan
location.reload();
```

### Debug Mode

#### Enable Verbose Logging

1. Open Console (F12)
2. Set verbose mode:
   ```javascript
   localStorage.setItem('stockalert-debug', 'true');
   location.reload();
   ```

#### Check Extension Background

1. Go to `chrome://extensions/`
2. Find StockAlert extension
3. Click "Inspect views: service worker"
4. Check console for errors

### Common False Positives

These should NOT be highlighted (they're in the exclusion list):
- Common words: THE, AND, FOR, ARE, BUT, NOT, YOU, ALL, CAN, etc.
- Acronyms: CEO, CFO, CTO, USA, API, URL, HTML, CSS, PDF
- Currency: USD, EUR, GBP

If these ARE highlighted, there's a bug in the detection.

### Performance Issues

#### Symptoms
- Page loading is slow
- Browser freezes when scanning
- High CPU usage

#### Solutions
1. Disable on heavy sites:
   - Click extension icon
   - Uncheck "Auto-detect"
   - Manually enable per-site

2. Check console for excessive scanning:
   ```
   [StockAlert] Starting document scan... (should only show once or twice)
   ```

3. If seeing repeated scans, mutation observer may be triggering too often

### Permissions Issues

The extension needs these permissions:
- `storage` - Save watchlist and settings
- `activeTab` - Access current page content

If permissions are missing:
1. Remove extension
2. Reload extension
3. Accept all permissions

### Still Not Working?

1. **Collect debug info**:
   ```javascript
   // In page console
   console.log('Location:', window.location.href);
   console.log('Highlighted:', document.querySelectorAll('.stockalert-symbol').length);
   console.log('Body children:', document.body.childElementCount);
   ```

2. **Try minimal test**:
   - Create simple HTML file with "AAPL" in text
   - Open in browser
   - Should highlight

3. **Check for conflicts**:
   - Disable other extensions temporarily
   - Test if StockAlert works alone

4. **Reinstall**:
   ```bash
   cd chrome-extension
   npm run clean
   npm run build
   # Reload in chrome://extensions/
   ```

## API Issues

### Alert Creation Fails

#### No API Key

**Symptoms**: "API key not configured"

**Solution**:
- Click extension icon
- Enter API key (starts with `sk_`)
- Click "Save API Key"

#### Invalid API Key

**Symptoms**: "Invalid or missing credentials"

**Solution**:
- Verify key at https://stockalert.pro/dashboard/api-keys
- Key must have scopes: `alerts:read`, `alerts:write`
- Copy full key including `sk_` prefix

#### Rate Limited

**Symptoms**: "Too many requests"

**Solution**:
- Basic tier: 100 requests/hour
- Premium tier: 10,000 requests/hour
- Wait for rate limit reset (check extension popup)

### Network Errors

**Symptoms**: "Failed to create alert"

**Solution**:
- Check internet connection
- Verify https://stockalert.pro is accessible
- Check browser console for CORS errors
- Try disabling VPN/firewall temporarily

## Need More Help?

1. Check README.md for full documentation
2. Review CLAUDE.md for technical details
3. Open an issue with:
   - Chrome version
   - Extension version
   - Console logs
   - Steps to reproduce
