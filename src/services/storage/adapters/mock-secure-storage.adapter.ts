import { ISecureStorageAdapter } from '../secure-storage.interface';

/**
 * Mock in-memory implementation of ISecureStorageAdapter.
 * Used for automated testing and local mock environments where
 * native Keychain/Keystore is not available or desired.
 */
export class MockSecureStorageAdapter implements ISecureStorageAdapter {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    const value = this.store.get(key);
    return value !== undefined ? value : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Helper to clear all mock storage entries (useful between test runs).
   */
  async clear(): Promise<void> {
    this.store.clear();
  }
}
