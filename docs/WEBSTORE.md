# Chrome Web Store Submission Notes

## Listing

Name: StockAlert.pro

Short description (132 characters max):

> Detect stock tickers while you browse. Create StockAlert.pro price alerts or add symbols to your watchlist from Chrome.

Single purpose:

> Create StockAlert.pro alerts and manage a watchlist for selected stock tickers while browsing.

Category: Productivity (or Finance / Productivity)

Language: English

## Long Description Draft

StockAlert.pro for Chrome lets you create live market alerts without leaving the page you are already reading. Stay on Yahoo Finance, an SEC filing, a newsletter, or a research note. Click a detected ticker or highlight a symbol, then send a price alert or watchlist update to your StockAlert.pro account.

This extension is for people who already use StockAlert.pro, or who want a faster way to capture tickers they see in the browser. It is not a broker, not a trading terminal, not a charting package, and not financial advice. Alerts are created through the StockAlert.pro API and managed in the same dashboard you already use on the web.

WHAT YOU CAN DO

Create alerts from any http or https page after a one-time API key. The popup supports the same families of conditions as the dashboard:

• Price: above, below, daily percent change, 52-week high, 52-week low
• Time: reminders for a date you choose
• Premium technical and fundamental types: moving-average crosses (including Death Cross), RSI, P/E, earnings, dividends, insider transactions, and social buzz

Basic StockAlert.pro accounts can create Price and Time alerts from Chrome. Other categories need Premium, matching the dashboard. If you pick a Premium type on a Basic plan, the extension tells you to upgrade instead of failing silently.

Add or remove symbols on your StockAlert.pro watchlist from the popup or from the on-page ticker card. Watchlist names stay in sync with https://app.stockalert.pro.

Keep one API key in Chrome local storage. The key is sent only to https://api.stockalert.pro when you create an alert or change the watchlist. It is never posted to a third-party host.

HOW TO SET IT UP

1. Install StockAlert.pro and pin the extension if you want the popup one click away.
2. Open https://app.stockalert.pro/settings#api-keys and create a key with alerts and watchlist scopes. Keys start with sk_.
3. Open the extension popup or Settings, paste the key, and save. It stays on your computer.
4. Optional: on a finance or news site, click Enable ticker detection on this site and allow Chrome access for that domain. Detection then stays on after reload until you turn it off.

You can skip step 4 and still create alerts from the popup or from selected text.

HOW TO CREATE AN ALERT

From the popup: type a symbol such as NVDA, choose an alert type (for example Price Above), fill the threshold, and click Create Alert. The request goes to api.stockalert.pro with your key.

From a page with detection enabled: listed US tickers on the visible page get an underline. Click NVDA, TSLA, or another match. A card offers Create Alert and Add to Watchlist. Nothing is sent until you click one of those actions.

From selected text: highlight a ticker in news, a filing, or research, then right-click Create StockAlert.pro alert. This path does not need ticker detection. The popup opens with the symbol filled in so you can choose the condition.

Example: you are reading a semiconductor note that mentions NVDA next to AMD and AVGO. Enable detection on that site once, click NVDA, set Price Above $140, and keep reading. Or highlight TSLA in an SEC excerpt and create a reminder before the next earnings date.

TICKER DETECTION

Detection runs locally in Chrome. The packaged content script looks for listed NASDAQ and NYSE symbols. It ignores common page labels such as USD, EDT, AM, PM, YTD, TTM, PE, EPS, and similar headings that are not tickers. Ambiguous two-letter names such as AI or PM need a $ prefix or a company-style (PM) mention before they count.

You grant site access one domain at a time. Allowing finance.yahoo.com does not unlock other sites. StockAlert.pro pages are never scanned. You can turn a site off from the popup or from Settings. If you remove site access, detection stops on that origin, including after reload.

PRIVACY AND PERMISSIONS

Required at install:
• Host: https://api.stockalert.pro/* for alerts and watchlist calls
• storage, for the API key, last ticker, and which sites you enabled
• contextMenus, for the right-click ticker action
• activeTab and scripting, so the popup can inject detection only after you enable a site

Optional, requested only after Enable ticker detection:
• The current site origin. Chrome may show a broader http/https prompt; the extension only keeps the domain you confirmed.

The extension does not read browsing history, does not inject ads, does not load remote JavaScript, and does not include analytics. There is no all_urls content script at install.

Page contents are not sent to StockAlert.pro. Only the ticker you select, the alert settings you submit, and your API key leave the machine.

WHO IT IS FOR

Readers who see tickers in articles and want a reminder without opening another tab. StockAlert.pro users who already manage alerts in the dashboard and want the same create flow from Chrome. Anyone who prefers opt-in site access instead of an extension that scans every page by default.

Get an API key: https://app.stockalert.pro/settings#api-keys
Product: https://stockalert.pro
API docs: https://stockalert.pro/api/docs
Privacy: https://stockalert.pro/privacy
Support: support@stockalert.pro

StockAlert.pro helps you create alerts. It is not financial advice.

## Store URLs

- Developer website: https://stockalert.pro
- Privacy policy: https://stockalert.pro/privacy
- Support URL: https://stockalert.pro/imprint (contact page returns 404; imprint has legal/support contact)
- Support email: support@stockalert.pro

## Publisher

Use the same Chrome Web Store developer account as Adanos Market Sentiment:

- Developer: Adanos Software GmbH
- Address: Käthe-Niederkirchner-Straße 30, 10407 Berlin, DE
- Email: contact@adanos.org or support@stockalert.pro
- Phone: +49 176 78060820
- D-U-N-S: 315190221
- EU trader: yes

## Privacy Practices Checklist

In the Chrome Web Store privacy form, declare:

- Personally identifiable information: yes, if the API key is treated as a credential. Prefer: "User activity" / authentication credential stored locally.
- Handles: User activity (selected tickers and alert configuration) and Website content only after explicit user action, processed locally.
- Remote code: none
- Data usage:
  - Not being sold to third parties
  - Not used for unrelated purposes
  - Not used for creditworthiness
- Host permission justification: `https://api.stockalert.pro/*` is required to create alerts and manage the watchlist.

Recommended answers:

- Collects personally identifiable information: No
- Collects user health info: No
- Collects financial and payment info: No
- Collects authentication info: Yes (API key stored locally, sent only to api.stockalert.pro)
- Collects personal communications: No
- Collects location: No
- Collects web history: No
- Collects user activity: Yes (tickers and alert settings the user submits)
- Collects website content: No (page text is scanned locally and never transmitted)

## Screenshot Assets

Chrome Web Store screenshots are 1280x800 PNG files. Paste these captions in the listing (132-character limit):

1. `store/output/screenshots/01-popup-create-alert.png`
   Caption: Create a price, reminder, or Premium technical alert from the popup. Your StockAlert.pro watchlist stays in the same window.
2. `store/output/screenshots/02-click-ticker-overlay.png`
   Caption: Enable ticker detection once per site. Click NVDA on the page to create an alert or add it to your watchlist. Scan stays on-device.
3. `store/output/screenshots/03-context-menu.png`
   Caption: Highlight a ticker in news or filings, then right-click Create StockAlert.pro alert. No detection toggle needed.
4. `store/output/screenshots/04-easy-setup.png`
   Caption: Paste your API key once. It stays in Chrome storage. Enable a site for detection and Chrome remembers it after reload.
5. `store/output/screenshots/05-privacy-permissions.png`
   Caption: Only api.stockalert.pro is required at install. Site access is opt-in. No ads, no analytics, no browsing-history permission.

Promo tiles:

- Store icon: `public/icons/icon-128.png`
- Small tile 440x280: `store/output/promo/small-440x280.png`
- Marquee 1400x560: `store/output/promo/marquee-1400x560.png`

Generate with:

```bash
npm run assets:store
```

## Permissions Justification

- `storage`: saves the API key, the last selected ticker, and which sites the user enabled for ticker detection.
- `contextMenus`: adds the right-click ticker lookup action for selected text.
- `activeTab`: lets the popup act on the current tab when the user opens it.
- `scripting`: injects the packaged content script and stylesheet into sites the user enables, including after reload.
- `optional_host_permissions` (`http://*/*`, `https://*/*`): requested only for the current site after the user clicks Enable ticker detection. Not granted at install.
- `https://api.stockalert.pro/*`: calls the StockAlert.pro API.

## Review Guardrails

- Manifest V3 only.
- No remote JavaScript.
- No analytics.
- No browsing-history permission.
- No broad API host permission beyond `https://api.stockalert.pro/*`.
- No broad webpage host permission at install. Ticker detection asks for the current site only after the user clicks Enable.
- No ad injection.
- No page-content collection. Ticker detection runs locally and only clicked or selected ticker symbols are sent to the API.
- No `notifications` permission.
- No `<all_urls>` content scripts.

## Submission Package

```bash
npm run verify
npm run dist:zip
```

Upload `stockalert-chrome-extension.zip`. Load `dist/` unpacked for a final manual pass before submit.
