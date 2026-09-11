import * as SecureStore from 'expo-secure-store';

import { ISecureStorageAdapter } from '../secure-storage.interface';

export class ExpoSecureStoreAdapter implements ISecureStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[ExpoSecureStoreAdapter] Failed to get item for key "${key}":`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[ExpoSecureStoreAdapter] Failed to set item for key "${key}":`, error);
      throw error;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[ExpoSecureStoreAdapter] Failed to delete item for key "${key}":`, error);
    }
  }
}
