import { ExtensionStorage, ExtensionStorageSchema } from './types';

/**
 * Chrome Extension Storage Wrapper
 * Provides type-safe access to chrome.storage.local
 */
export class StorageManager {
  /**
   * Get entire storage
   */
  async getStorage(): Promise<ExtensionStorage> {
    const data = await chrome.storage.local.get(null);
    const parsed = ExtensionStorageSchema.safeParse(data);

    if (parsed.success) {
      return parsed.data;
    }

    // Return defaults if parse fails
    return {
      settings: {
        autoDetect: true,
        highlightSymbols: true,
        overlayPosition: 'cursor',
      },
    };
  }

  /**
   * Get API key
   */
  async getApiKey(): Promise<string | undefined> {
    const storage = await this.getStorage();
    return storage.apiKey;
  }

  /**
   * Save API key
   */
  async saveApiKey(apiKey: string): Promise<void> {
    await chrome.storage.local.set({ apiKey });
  }

  /**
   * Remove API key
   */
  async removeApiKey(): Promise<void> {
    await chrome.storage.local.remove('apiKey');
  }

  /**
   * Watchlist methods removed - now handled via API
   * See api-client.ts for watchlist operations
   */

  /**
   * Get settings
   */
  async getSettings(): Promise<ExtensionStorage['settings']> {
    const storage = await this.getStorage();
    return storage.settings;
  }

  /**
   * Update settings
   */
  async updateSettings(
    updates: Partial<ExtensionStorage['settings']>
  ): Promise<void> {
    const storage = await this.getStorage();
    const settings = { ...storage.settings, ...updates };
    await chrome.storage.local.set({ settings });
  }

}

/**
 * Singleton storage manager instance
 */
export const storage = new StorageManager();
