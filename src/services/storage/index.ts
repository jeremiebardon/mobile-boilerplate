import { ExpoSecureStoreAdapter } from './adapters/expo-secure-store.adapter';
import { MockSecureStorageAdapter } from './adapters/mock-secure-storage.adapter';
import { ISecureStorageAdapter } from './secure-storage.interface';

export * from './adapters/expo-secure-store.adapter';
export * from './adapters/mock-secure-storage.adapter';
export * from './secure-storage.interface';

/**
 * Global secure storage service factory.
 * Resolves to MockSecureStorageAdapter if mock mode is configured,
 * otherwise defaults to ExpoSecureStoreAdapter.
 */
export function createSecureStorageService(): ISecureStorageAdapter {
  const storageProvider = process.env.EXPO_PUBLIC_STORAGE_PROVIDER?.toLowerCase();
  const authProvider = process.env.EXPO_PUBLIC_AUTH_PROVIDER?.toLowerCase();

  if (storageProvider === 'mock' || storageProvider === 'memory' || authProvider === 'mock') {
    return new MockSecureStorageAdapter();
  }

  return new ExpoSecureStoreAdapter();
}

export const secureStorage: ISecureStorageAdapter = createSecureStorageService();
