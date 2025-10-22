/**
 * Stock Symbol Detection Engine
 * Detects stock ticker symbols in webpage text content
 */

/**
 * Detected symbol metadata
 */
export interface DetectedSymbol {
  symbol: string;
  element: HTMLElement;
  range: Range;
  position: { x: number; y: number };
}

/**
 * Common stock symbols to exclude (words that look like symbols but aren't)
 */
const EXCLUDED_WORDS = new Set([
  'THE',
  'AND',
  'FOR',
  'ARE',
  'BUT',
  'NOT',
  'YOU',
  'ALL',
  'CAN',
  'HER',
  'WAS',
  'ONE',
  'OUR',
  'OUT',
  'DAY',
  'GET',
  'HAS',
  'HIM',
  'HIS',
  'HOW',
  'ITS',
  'MAY',
  'NEW',
  'NOW',
  'OLD',
  'SEE',
  'TWO',
  'WAY',
  'WHO',
  'BOY',
  'DID',
  'CAR',
  'LET',
  'PUT',
  'SAY',
  'SHE',
  'TOO',
  'USE',
  'CEO',
  'USA',
  'API',
  'URL',
  'HTML',
  'CSS',
  'PDF',
  'FAQ',
  'CEO',
  'CFO',
  'COO',
  'CTO',
  'USD',
  'EUR',
  'GBP',
]);

/**
 * Tags to exclude from scanning
 */
const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'IFRAME']);

/**
 * Stock symbol regex pattern
 * Matches 1-5 uppercase letters, optionally followed by a dot and 1-2 letters (for foreign exchanges)
 * Examples: AAPL, GOOGL, BRK.A, BRK.B
 */
const SYMBOL_PATTERN = /\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g;

/**
 * SymbolDetector class
 * Scans DOM for stock symbols and provides highlighting functionality
 */
export class SymbolDetector {
  private detectedSymbols: Map<string, DetectedSymbol[]> = new Map();
  private observer: MutationObserver | null = null;
  private highlightedElements: Set<HTMLElement> = new Set();

  constructor() {
    this.setupMutationObserver();
  }

  /**
   * Scan entire document for symbols
   */
  scanDocument(): Map<string, DetectedSymbol[]> {
    this.detectedSymbols.clear();
    this.scanNode(document.body);
    return this.detectedSymbols;
  }

  /**
   * Scan a specific node and its children
   */
  private scanNode(node: Node): void {
    // Skip excluded elements
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (EXCLUDED_TAGS.has(element.tagName)) {
        return;
      }
      // Skip already highlighted elements
      if (element.classList.contains('stockalert-symbol')) {
        return;
      }
      // Skip overlay and all StockAlert UI elements
      if (element.classList.contains('stockalert-overlay')) {
        return;
      }
      // Skip if inside an overlay
      if (element.closest('.stockalert-overlay')) {
        return;
      }
    }

    // Process text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      this.detectSymbolsInText(text, node);
      return;
    }

    // Recursively scan child nodes
    node.childNodes.forEach((child) => this.scanNode(child));
  }

  /**
   * Detect symbols in text content
   */
  private detectSymbolsInText(text: string, textNode: Node): void {
    const matches = text.matchAll(SYMBOL_PATTERN);

    for (const match of matches) {
      const symbol = match[1];

      // Skip excluded words
      if (EXCLUDED_WORDS.has(symbol)) {
        continue;
      }

      // Skip if symbol is too short (likely false positive)
      if (symbol.length < 2) {
        continue;
      }

      const element = textNode.parentElement;
      if (!element) continue;

      // Create range for the matched symbol
      const range = document.createRange();
      const startOffset = match.index!;
      const endOffset = startOffset + symbol.length;

      try {
        range.setStart(textNode, startOffset);
        range.setEnd(textNode, endOffset);
      } catch (e) {
        // Invalid range, skip
        continue;
      }

      // Get position for overlay
      const rect = range.getBoundingClientRect();
      const position = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
      };

      const detected: DetectedSymbol = {
        symbol,
        element,
        range,
        position,
      };

      // Store detected symbol
      if (!this.detectedSymbols.has(symbol)) {
        this.detectedSymbols.set(symbol, []);
      }
      this.detectedSymbols.get(symbol)!.push(detected);
    }
  }

  /**
   * Highlight detected symbols in the DOM
   */
  highlightSymbols(): void {
    this.detectedSymbols.forEach((detections) => {
      detections.forEach((detection) => {
        this.highlightSymbol(detection);
      });
    });
  }

  /**
   * Highlight a single symbol occurrence
   */
  private highlightSymbol(detection: DetectedSymbol): void {
    try {
      const span = document.createElement('span');
      span.className = 'stockalert-symbol';
      span.style.cssText = `
        background-color: rgba(59, 130, 246, 0.1);
        border-bottom: 2px solid #3b82f6;
        cursor: pointer;
        padding: 0 2px;
        border-radius: 2px;
        transition: background-color 0.2s;
      `;
      span.dataset.symbol = detection.symbol;

      // Hover effect
      span.addEventListener('mouseenter', () => {
        span.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
      });
      span.addEventListener('mouseleave', () => {
        span.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      });

      // Wrap the symbol with the span
      detection.range.surroundContents(span);
      this.highlightedElements.add(span);
    } catch (e) {
      // Range already modified, skip
      console.debug('Failed to highlight symbol:', e);
    }
  }

  /**
   * Remove all highlights
   */
  removeHighlights(): void {
    this.highlightedElements.forEach((element) => {
      const parent = element.parentNode;
      if (parent) {
        // Replace span with its text content
        const textNode = document.createTextNode(element.textContent || '');
        parent.replaceChild(textNode, element);
      }
    });
    this.highlightedElements.clear();
  }

  /**
   * Setup mutation observer to detect dynamically added content
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldRescan = true;
          break;
        }
      }

      if (shouldRescan) {
        // Debounce rescanning
        setTimeout(() => {
          this.scanDocument();
          this.highlightSymbols();
        }, 500);
      }
    });
  }

  /**
   * Start observing DOM changes
   */
  startObserving(): void {
    if (this.observer) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Get all detected symbols
   */
  getDetectedSymbols(): string[] {
    return Array.from(this.detectedSymbols.keys());
  }

  /**
   * Get detections for a specific symbol
   */
  getSymbolDetections(symbol: string): DetectedSymbol[] {
    return this.detectedSymbols.get(symbol) || [];
  }

  /**
   * Check if a symbol is detected
   */
  hasSymbol(symbol: string): boolean {
    return this.detectedSymbols.has(symbol);
  }

  /**
   * Destroy detector and clean up
   */
  destroy(): void {
    this.stopObserving();
    this.removeHighlights();
    this.detectedSymbols.clear();
  }
}
