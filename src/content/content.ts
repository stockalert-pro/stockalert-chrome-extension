import { SymbolDetector } from '../lib/symbol-detector';
import { storage } from '../lib/storage';
import { createApiClient } from '../lib/api-client';

/**
 * Content Script
 * Runs on every webpage, detects stock symbols, and shows overlay
 */

let detector: SymbolDetector | null = null;
let overlay: HTMLElement | null = null;
let currentSymbol: string | null = null;

/**
 * Initialize content script
 */
async function init() {
  try {
    console.log('[StockAlert] Content script loaded on:', window.location.href);

    // Don't run on stockalert.pro itself
    if (window.location.hostname.includes('stockalert.pro')) {
      console.log('[StockAlert] Skipping symbol detection on stockalert.pro');
      return;
    }

    // Get settings with error handling
    let settings;
    try {
      settings = await storage.getSettings();
      console.log('[StockAlert] Settings loaded:', settings);
    } catch (error) {
      console.error('[StockAlert] Failed to load settings:', error);
      // Use defaults if storage fails
      settings = {
        autoDetect: true,
        highlightSymbols: true,
        overlayPosition: 'cursor' as const,
      };
    }

    if (!settings.autoDetect) {
      console.log('[StockAlert] Auto-detect disabled in settings');
      return;
    }

    // Create detector
    detector = new SymbolDetector();
    console.log('[StockAlert] Detector created');

    // Wait for page to load
    if (document.readyState === 'loading') {
      console.log('[StockAlert] Waiting for DOMContentLoaded...');
      document.addEventListener('DOMContentLoaded', scanAndHighlight);
    } else {
      console.log('[StockAlert] Document already loaded, scanning now');
      scanAndHighlight();
    }

    // Setup event listeners
    setupEventListeners();
    console.log('[StockAlert] Event listeners setup complete');
  } catch (error) {
    console.error('[StockAlert] Initialization error:', error);
  }
}

/**
 * Scan document and highlight symbols
 */
async function scanAndHighlight() {
  try {
    if (!detector) {
      console.warn('[StockAlert] Detector not initialized');
      return;
    }

    console.log('[StockAlert] Starting document scan...');
    const symbols = detector.scanDocument();
    console.log(`[StockAlert] Scan complete. Found ${symbols.size} unique symbols:`, Array.from(symbols.keys()));

    // Get settings with fallback
    let highlightEnabled = true;
    try {
      const settings = await storage.getSettings();
      highlightEnabled = settings.highlightSymbols;
    } catch (error) {
      console.warn('[StockAlert] Failed to load highlight setting, using default:', error);
    }

    if (highlightEnabled) {
      detector.highlightSymbols();
      console.log(`[StockAlert] ✅ Highlighted ${symbols.size} unique symbols`);

      // Log first few for debugging
      const symbolArray = Array.from(symbols.keys());
      if (symbolArray.length > 0) {
        console.log('[StockAlert] Example symbols:', symbolArray.slice(0, 5).join(', '));
      }
    } else {
      console.log('[StockAlert] Highlighting disabled in settings');
    }

    // Start observing for dynamic content
    detector.startObserving();
    console.log('[StockAlert] Now observing DOM for dynamic content');
  } catch (error) {
    console.error('[StockAlert] Error in scanAndHighlight:', error);
  }
}

/**
 * Setup event listeners for symbol clicks
 */
function setupEventListeners() {
  document.addEventListener('click', handleSymbolClick, true);
  document.addEventListener('keydown', handleKeydown);
}

/**
 * Handle symbol click
 */
function handleSymbolClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  // Check if clicked element is a symbol
  if (target.classList.contains('stockalert-symbol')) {
    event.preventDefault();
    event.stopPropagation();

    const symbol = target.dataset.symbol;
    if (symbol) {
      showOverlay(symbol, event.clientX, event.clientY);
    }
  } else if (overlay && !overlay.contains(target)) {
    // Click outside overlay - close it
    hideOverlay();
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(event: KeyboardEvent) {
  // ESC to close overlay
  if (event.key === 'Escape' && overlay) {
    hideOverlay();
  }
}

/**
 * Show overlay for symbol
 */
async function showOverlay(symbol: string, x: number, y: number) {
  currentSymbol = symbol;

  // Remove existing overlay
  if (overlay) {
    hideOverlay();
  }

  // Create overlay immediately with default state (not in watchlist)
  overlay = createOverlay(symbol, false);

  // Position overlay
  document.body.appendChild(overlay);

  // Get overlay dimensions
  const rect = overlay.getBoundingClientRect();

  // Position near cursor but ensure it's visible
  let left = x + 10;
  let top = y + 10;

  // Prevent overflow right
  if (left + rect.width > window.innerWidth) {
    left = window.innerWidth - rect.width - 10;
  }

  // Prevent overflow bottom
  if (top + rect.height > window.innerHeight) {
    top = y - rect.height - 10;
  }

  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;

  // Fade in immediately
  setTimeout(() => {
    if (overlay) {
      overlay.style.opacity = '1';
    }
  }, 10);

  // Check watchlist status asynchronously (non-blocking)
  checkWatchlistStatus(symbol);
}

/**
 * Check watchlist status and update overlay button
 */
async function checkWatchlistStatus(symbol: string) {
  try {
    const apiClient = await createApiClient();
    if (!apiClient || !overlay) return;

    const inWatchlist = await apiClient.isInWatchlist(symbol);

    // Update button if overlay is still visible
    if (overlay && currentSymbol === symbol) {
      const watchlistBtn = overlay.querySelector('[data-action="watchlist"]') as HTMLButtonElement;
      if (watchlistBtn) {
        watchlistBtn.innerHTML = inWatchlist
          ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> Remove from Watchlist'
          : '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> Add to Watchlist';

        watchlistBtn.style.background = inWatchlist
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)';
        watchlistBtn.style.boxShadow = inWatchlist
          ? '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';

        watchlistBtn.onmouseover = () => {
          watchlistBtn.style.transform = 'translateY(-2px)';
          watchlistBtn.style.boxShadow = inWatchlist
            ? '0 6px 16px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 6px 16px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
        };
        watchlistBtn.onmouseout = () => {
          watchlistBtn.style.transform = 'translateY(0)';
          watchlistBtn.style.boxShadow = inWatchlist
            ? '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
        };

        // Update click handler
        const newBtn = watchlistBtn.cloneNode(true) as HTMLButtonElement;
        newBtn.addEventListener('click', () => handleWatchlistToggle(symbol, inWatchlist));
        watchlistBtn.replaceWith(newBtn);
      }
    }
  } catch (error) {
    console.warn('[StockAlert] Could not check watchlist status:', error);
  }
}

/**
 * Hide overlay
 */
function hideOverlay() {
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay) {
        overlay.remove();
        overlay = null;
        currentSymbol = null;
      }
    }, 100);
  }
}

/**
 * Create overlay element
 */
function createOverlay(symbol: string, inWatchlist: boolean): HTMLElement {
  const div = document.createElement('div');
  div.className = 'stockalert-overlay';
  div.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
    padding: 20px;
    min-width: 300px;
    opacity: 0;
    transition: opacity 0.1s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;

  div.innerHTML = `
    <button
      data-action="close"
      style="
        position: absolute;
        top: 14px;
        right: 14px;
        background: rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
        color: #374151;
      "
      onmouseover="this.style.background='rgba(0, 0, 0, 0.1)'; this.style.transform='scale(1.05)'"
      onmouseout="this.style.background='rgba(0, 0, 0, 0.05)'; this.style.transform='scale(1)'"
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <div style="margin-bottom: 16px; padding-right: 32px;">
      <div style="font-size: 24px; font-weight: 800; color: #1f2937; letter-spacing: -0.02em;">
        ${symbol}
      </div>
      <div style="font-size: 13px; color: #6b7280; margin-top: 2px; font-weight: 500;">
        Stock Symbol
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button
        data-action="create-alert"
        style="
          width: 100%;
          padding: 12px 18px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        "
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        Create Alert
      </button>

      <button
        data-action="watchlist"
        style="
          width: 100%;
          padding: 12px 18px;
          background: ${inWatchlist
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)'};
          backdrop-filter: blur(10px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: ${inWatchlist
            ? '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'};
        "
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='${inWatchlist
          ? '0 6px 16px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 6px 16px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'}'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='${inWatchlist
          ? '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'}'"
      >
        ${
          inWatchlist
            ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> Remove from Watchlist'
            : '<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> Add to Watchlist'
        }
      </button>
    </div>
  `;

  // Add click handlers
  div.querySelector('[data-action="create-alert"]')?.addEventListener('click', () => {
    handleCreateAlert(symbol);
  });

  div.querySelector('[data-action="watchlist"]')?.addEventListener('click', () => {
    handleWatchlistToggle(symbol, inWatchlist);
  });

  div.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    hideOverlay();
  });

  return div;
}

/**
 * Handle create alert action
 */
function handleCreateAlert(symbol: string) {
  console.log(`[StockAlert] Creating alert for ${symbol}`);

  // Send message to background script to open alert modal
  chrome.runtime.sendMessage({
    type: 'OPEN_ALERT_MODAL',
    payload: { symbol },
  });

  hideOverlay();
}

/**
 * Handle watchlist toggle
 */
async function handleWatchlistToggle(symbol: string, inWatchlist: boolean) {
  try {
    const apiClient = await createApiClient();
    if (!apiClient) {
      showNotification('Please configure API key in extension settings', 'error');
      return;
    }

    if (inWatchlist) {
      // Find item ID and remove
      const items = await apiClient.listWatchlist();
      const item = items.find((i) => i.stock_symbol === symbol);
      if (item) {
        await apiClient.removeFromWatchlist(item.id);
        console.log(`[StockAlert] Removed ${symbol} from watchlist`);
        showNotification(`${symbol} removed from watchlist`, 'success');
      }
    } else {
      await apiClient.addToWatchlist({ stock_symbol: symbol });
      console.log(`[StockAlert] Added ${symbol} to watchlist`);
      showNotification(`${symbol} added to watchlist`, 'success');
    }

    // Update overlay
    if (currentSymbol === symbol) {
      hideOverlay();
    }
  } catch (error) {
    console.error('[StockAlert] Watchlist error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update watchlist';
    showNotification(message, 'error');
  }
}

/**
 * Show notification toast
 */
function showNotification(message: string, type: 'success' | 'error') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.1s;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 100);
  }, 3000);
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RESCAN_PAGE') {
    scanAndHighlight();
    sendResponse({ success: true });
  }
});

// Initialize
init();
