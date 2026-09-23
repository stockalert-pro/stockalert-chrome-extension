# Privacy Policy

StockAlert.pro for Chrome is designed to keep user data minimal and local.

This policy covers the Chrome extension published by Adanos Software GmbH. The StockAlert.pro website and API are covered by https://stockalert.pro/privacy.

## Data Stored Locally

The extension stores the following data in Chrome local storage:

- StockAlert.pro API key
- The last ticker selected from the context menu or an on-page ticker card
- Site origins the user explicitly enabled for ticker detection

## Data Processed Locally

When the user enables ticker detection from the extension popup, Chrome asks for access to that site. After that, ticker detection stays on for the site across reloads until the user turns it off. The extension scans visible webpage text locally in the browser. Page contents are not sent to StockAlert.pro.

Selected text used with the context menu is normalized locally into a ticker symbol before the popup opens.

## Data Sent to StockAlert.pro

When the user creates an alert or adds/removes a watchlist item, the extension sends:

- The selected stock ticker symbol
- The selected alert condition, threshold, and optional parameters
- The user's StockAlert.pro API key in the `X-API-Key` header

Requests are sent only to `https://api.stockalert.pro`.

## Data Not Collected

The extension does not collect or transmit:

- Browsing history
- Page contents
- Personal financial account data
- Payment data
- Analytics events
- Advertising identifiers

## Limited Use

Data is used only to provide the extension's single purpose: create StockAlert.pro alerts and manage a watchlist for user-selected stock tickers.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

For privacy questions, contact: privacy@stockalert.pro
