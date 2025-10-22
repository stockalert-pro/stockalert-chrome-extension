import { storage } from '../lib/storage';
import { ALERT_TYPES, AlertCondition, CreateAlertRequest } from '../lib/types';

/**
 * Popup Script
 * Handles popup UI interactions
 */

// DOM Elements
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const saveApiKeyBtn = document.getElementById('save-api-key') as HTMLButtonElement;
const alertSection = document.getElementById('alert-section') as HTMLElement;

const alertSymbolInput = document.getElementById('alert-symbol') as HTMLInputElement;
const alertConditionSelect = document.getElementById('alert-condition') as HTMLSelectElement;
const alertThresholdInput = document.getElementById('alert-threshold') as HTMLInputElement;
const thresholdGroup = document.getElementById('threshold-group') as HTMLElement;
const thresholdLabel = document.getElementById('threshold-label') as HTMLElement;
const thresholdUnit = document.getElementById('threshold-unit') as HTMLElement;
const parametersGroup = document.getElementById('parameters-group') as HTMLElement;
const createAlertBtn = document.getElementById('create-alert-btn') as HTMLButtonElement;
const alertStatus = document.getElementById('alert-status') as HTMLElement;

const watchlistContainer = document.getElementById('watchlist-container') as HTMLElement;

const autoDetectCheckbox = document.getElementById('setting-auto-detect') as HTMLInputElement;
const highlightCheckbox = document.getElementById('setting-highlight') as HTMLInputElement;

/**
 * Initialize popup
 */
async function init() {
  console.log('[StockAlert] Popup initialized');

  // Load API key
  const apiKey = await storage.getApiKey();
  if (apiKey) {
    apiKeyInput.value = apiKey;
    alertSection.style.display = 'block';
  }

  // Check for pending alert symbol
  const { pendingAlertSymbol } = await chrome.storage.local.get('pendingAlertSymbol');
  if (pendingAlertSymbol) {
    alertSymbolInput.value = pendingAlertSymbol;
    await chrome.storage.local.remove('pendingAlertSymbol');
  }

  // Load watchlist
  await loadWatchlist();

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // API Key
  saveApiKeyBtn.addEventListener('click', handleSaveApiKey);

  // Alert creation
  alertConditionSelect.addEventListener('change', handleConditionChange);
  alertSymbolInput.addEventListener('input', validateAlertForm);
  alertThresholdInput.addEventListener('input', validateAlertForm);
  createAlertBtn.addEventListener('click', handleCreateAlert);

  // Watchlist - export removed (API-based now)

  // Settings
  autoDetectCheckbox.addEventListener('change', handleSettingsChange);
  highlightCheckbox.addEventListener('change', handleSettingsChange);
}

/**
 * Handle save API key
 */
async function handleSaveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('sk_')) {
    showStatus('Invalid API key format. Key should start with "sk_"', 'error');
    return;
  }

  try {
    await storage.saveApiKey(apiKey);
    showStatus('API key saved successfully', 'success');
    alertSection.style.display = 'block';
  } catch (error) {
    showStatus('Failed to save API key', 'error');
    console.error('[StockAlert] Save API key error:', error);
  }
}

/**
 * Handle condition change
 */
function handleConditionChange() {
  const condition = alertConditionSelect.value as AlertCondition;

  if (!condition) {
    thresholdGroup.style.display = 'none';
    parametersGroup.style.display = 'none';
    return;
  }

  const alertType = ALERT_TYPES[condition];

  // Show/hide threshold input
  if (alertType.requiresThreshold) {
    thresholdGroup.style.display = 'block';
    thresholdLabel.textContent = alertType.thresholdLabel || 'Threshold';
    thresholdUnit.textContent = alertType.thresholdUnit ? `(${alertType.thresholdUnit})` : '';
  } else {
    thresholdGroup.style.display = 'none';
  }

  // Show/hide parameters
  if (alertType.parameters && alertType.parameters.length > 0) {
    parametersGroup.style.display = 'block';
    parametersGroup.innerHTML = alertType.parameters
      .map((param) => {
        if (param.type === 'select') {
          return `
          <div class="input-group">
            <label for="param-${param.name}">${param.label}</label>
            <select id="param-${param.name}" data-param="${param.name}">
              ${param.options
                ?.map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
                .join('')}
            </select>
          </div>
        `;
        }
        return '';
      })
      .join('');
  } else {
    parametersGroup.style.display = 'none';
    parametersGroup.innerHTML = '';
  }

  validateAlertForm();
}

/**
 * Validate alert form
 */
function validateAlertForm() {
  const symbol = alertSymbolInput.value.trim();
  const condition = alertConditionSelect.value as AlertCondition;
  const threshold = alertThresholdInput.value;

  let isValid = symbol.length > 0 && condition.length > 0;

  if (condition && ALERT_TYPES[condition].requiresThreshold) {
    isValid = isValid && threshold.length > 0;
  }

  createAlertBtn.disabled = !isValid;
}

/**
 * Handle create alert
 */
async function handleCreateAlert() {
  const symbol = alertSymbolInput.value.trim().toUpperCase();
  const condition = alertConditionSelect.value as AlertCondition;
  const threshold = parseFloat(alertThresholdInput.value);
  const notification = 'email' as const; // Default to email

  // Collect parameters
  const parameters: Record<string, unknown> = {};
  const paramInputs = parametersGroup.querySelectorAll('[data-param]');
  paramInputs.forEach((input) => {
    const paramName = (input as HTMLElement).dataset.param!;
    parameters[paramName] = (input as HTMLInputElement | HTMLSelectElement).value;
  });

  const request: CreateAlertRequest = {
    symbol,
    condition,
    notification,
    threshold: ALERT_TYPES[condition].requiresThreshold ? threshold : undefined,
    parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
  };

  console.log('[StockAlert] Creating alert:', request);

  try {
    createAlertBtn.disabled = true;
    createAlertBtn.textContent = 'Creating...';

    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_ALERT',
      payload: request,
    });

    if (response.success) {
      showStatus('Alert created successfully!', 'success');

      // Reset form
      alertSymbolInput.value = '';
      alertConditionSelect.value = '';
      alertThresholdInput.value = '';
      thresholdGroup.style.display = 'none';
      parametersGroup.style.display = 'none';
      parametersGroup.innerHTML = '';

      createAlertBtn.textContent = 'Create Alert';
      validateAlertForm();
    } else {
      showStatus(response.error || 'Failed to create alert', 'error');
      createAlertBtn.disabled = false;
      createAlertBtn.textContent = 'Create Alert';
    }
  } catch (error) {
    console.error('[StockAlert] Create alert error:', error);
    showStatus('Failed to create alert', 'error');
    createAlertBtn.disabled = false;
    createAlertBtn.textContent = 'Create Alert';
  }
}

/**
 * Load watchlist from API
 */
async function loadWatchlist() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_WATCHLIST' });

    if (!response.success) {
      watchlistContainer.innerHTML = '<p class="empty-state">Configure API key to view watchlist</p>';
      return;
    }

    const watchlist = response.data || [];

    if (watchlist.length === 0) {
      watchlistContainer.innerHTML = '<p class="empty-state">No symbols in watchlist</p>';
      return;
    }

    watchlistContainer.innerHTML = watchlist
      .map(
        (item: any) => `
      <div class="watchlist-item">
        <div>
          <span class="watchlist-symbol">${item.stock_symbol}</span>
          ${item.stocks?.name ? `<span class="watchlist-date">${item.stocks.name}</span>` : ''}
        </div>
        <button class="btn-remove" data-id="${item.id}" data-symbol="${item.stock_symbol}">✕</button>
      </div>
    `
      )
      .join('');

    // Add remove handlers
    watchlistContainer.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const id = target.dataset.id!;
        const symbol = target.dataset.symbol!;
        await handleRemoveFromWatchlist(id, symbol);
      });
    });
  } catch (error) {
    console.error('[StockAlert] Load watchlist error:', error);
    watchlistContainer.innerHTML =
      '<p class="empty-state">Error loading watchlist. Check API key.</p>';
  }
}

/**
 * Handle remove from watchlist
 */
async function handleRemoveFromWatchlist(id: string, symbol: string) {
  try {
    await chrome.runtime.sendMessage({
      type: 'REMOVE_FROM_WATCHLIST',
      payload: { id, symbol },
    });
    await loadWatchlist();
  } catch (error) {
    console.error('[StockAlert] Remove from watchlist error:', error);
  }
}


/**
 * Load settings
 */
async function loadSettings() {
  try {
    const settings = await storage.getSettings();
    autoDetectCheckbox.checked = settings.autoDetect;
    highlightCheckbox.checked = settings.highlightSymbols;
  } catch (error) {
    console.error('[StockAlert] Load settings error:', error);
  }
}

/**
 * Handle settings change
 */
async function handleSettingsChange() {
  try {
    await storage.updateSettings({
      autoDetect: autoDetectCheckbox.checked,
      highlightSymbols: highlightCheckbox.checked,
    });

    // Notify content scripts to update
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'RESCAN_PAGE' });
    }
  } catch (error) {
    console.error('[StockAlert] Settings change error:', error);
  }
}

/**
 * Show status message
 */
function showStatus(message: string, type: 'success' | 'error') {
  alertStatus.textContent = message;
  alertStatus.className = `status-message status-${type}`;
  alertStatus.style.display = 'block';

  setTimeout(() => {
    alertStatus.style.display = 'none';
  }, 5000);
}

// Initialize on load
init();
