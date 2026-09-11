export interface ISecureStorageAdapter {
  /**
   * Retrieve an item from secure storage by key.
   * Returns null if key does not exist.
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Save an item in secure storage by key.
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Delete an item from secure storage by key.
   */
  deleteItem(key: string): Promise<void>;
}
