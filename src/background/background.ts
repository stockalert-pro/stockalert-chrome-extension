import { createApiClient, StockAlertApiError } from '../lib/api-client';
import { storage } from '../lib/storage';
import { CreateAlertRequest } from '../lib/types';

/**
 * Background Service Worker
 * Handles API calls and Chrome runtime messaging
 */

console.log('[StockAlert] Background service worker loaded');

/**
 * Handle messages from content script and popup
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[StockAlert] Received message:', message.type);

  switch (message.type) {
    case 'CREATE_ALERT':
      handleCreateAlert(message.payload)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true; // Keep channel open for async response

    case 'OPEN_ALERT_MODAL':
      handleOpenAlertModal(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'ADD_TO_WATCHLIST':
      handleAddToWatchlist(message.payload)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'REMOVE_FROM_WATCHLIST':
      handleRemoveFromWatchlist(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'GET_WATCHLIST':
      handleGetWatchlist()
        .then((watchlist) => sendResponse({ success: true, data: watchlist }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'SAVE_API_KEY':
      handleSaveApiKey(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'GET_SETTINGS':
      storage
        .getSettings()
        .then((settings) => sendResponse({ success: true, data: settings }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    case 'UPDATE_SETTINGS':
      storage
        .updateSettings(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        );
      return true;

    default:
      console.warn('[StockAlert] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Handle create alert request
 */
async function handleCreateAlert(request: CreateAlertRequest) {
  console.log('[StockAlert] Creating alert:', request);

  const apiClient = await createApiClient();
  if (!apiClient) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  try {
    const alert = await apiClient.createAlert(request);
    console.log('[StockAlert] Alert created:', alert);

    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Alert Created',
      message: `Successfully created ${request.condition} alert for ${request.symbol}`,
    });

    return alert;
  } catch (error) {
    console.error('[StockAlert] Failed to create alert:', error);

    // Show error notification
    const errorMessage =
      error instanceof StockAlertApiError
        ? error.message
        : 'Failed to create alert. Please try again.';

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Alert Creation Failed',
      message: errorMessage,
    });

    throw error;
  }
}

/**
 * Handle open alert modal request
 */
async function handleOpenAlertModal(payload: { symbol: string }) {
  console.log('[StockAlert] Opening alert modal for:', payload.symbol);

  // Check if API key is configured
  const apiKey = await storage.getApiKey();
  if (!apiKey) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'API Key Required',
      message: 'Please configure your StockAlert.pro API key in the extension settings.',
    });

    // Open popup
    chrome.action.openPopup();
    return;
  }

  // Store pending alert symbol
  await chrome.storage.local.set({ pendingAlertSymbol: payload.symbol });

  // Open popup
  chrome.action.openPopup();
}

/**
 * Handle get watchlist
 */
async function handleGetWatchlist() {
  console.log('[StockAlert] Getting watchlist from API');
  const apiClient = await createApiClient();
  if (!apiClient) {
    throw new Error('API key not configured');
  }
  return await apiClient.listWatchlist();
}

/**
 * Handle add to watchlist
 */
async function handleAddToWatchlist(payload: { symbol: string }) {
  console.log('[StockAlert] Adding to watchlist:', payload.symbol);
  const apiClient = await createApiClient();
  if (!apiClient) {
    throw new Error('API key not configured');
  }

  const item = await apiClient.addToWatchlist({ stock_symbol: payload.symbol });

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
    title: 'Added to Watchlist',
    message: `${payload.symbol} has been added to your watchlist`,
  });

  return item;
}

/**
 * Handle remove from watchlist
 */
async function handleRemoveFromWatchlist(payload: { id: string; symbol: string }) {
  console.log('[StockAlert] Removing from watchlist:', payload.symbol);
  const apiClient = await createApiClient();
  if (!apiClient) {
    throw new Error('API key not configured');
  }

  await apiClient.removeFromWatchlist(payload.id);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
    title: 'Removed from Watchlist',
    message: `${payload.symbol} has been removed from your watchlist`,
  });
}

/**
 * Handle save API key
 */
async function handleSaveApiKey(payload: { apiKey: string }) {
  console.log('[StockAlert] Saving API key');

  // Validate API key format (sk_...)
  if (!payload.apiKey.startsWith('sk_')) {
    throw new Error('Invalid API key format. Key should start with "sk_"');
  }

  await storage.saveApiKey(payload.apiKey);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
    title: 'API Key Saved',
    message: 'Your StockAlert.pro API key has been saved',
  });
}

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[StockAlert] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First install - open welcome page
    chrome.tabs.create({
      url: 'https://stockalert.pro/api/docs',
    });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
      title: 'Welcome to StockAlert Symbol Detector',
      message: 'Click the extension icon to configure your API key',
    });
  }
});
