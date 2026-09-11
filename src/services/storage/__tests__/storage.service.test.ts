import { ExpoSecureStoreAdapter } from '../adapters/expo-secure-store.adapter';
import { MockSecureStorageAdapter } from '../adapters/mock-secure-storage.adapter';
import * as StorageModule from '../index';

describe('createSecureStorageService', () => {
  const originalStorageProvider = process.env.EXPO_PUBLIC_STORAGE_PROVIDER;
  const originalAuthProvider = process.env.EXPO_PUBLIC_AUTH_PROVIDER;

  afterEach(() => {
    process.env.EXPO_PUBLIC_STORAGE_PROVIDER = originalStorageProvider;
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = originalAuthProvider;
  });

  it('returns MockSecureStorageAdapter when EXPO_PUBLIC_STORAGE_PROVIDER is mock', () => {
    process.env.EXPO_PUBLIC_STORAGE_PROVIDER = 'mock';
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;

    const service = StorageModule.createSecureStorageService();
    expect(service).toBeInstanceOf(MockSecureStorageAdapter);
  });

  it('returns MockSecureStorageAdapter when EXPO_PUBLIC_STORAGE_PROVIDER is memory', () => {
    process.env.EXPO_PUBLIC_STORAGE_PROVIDER = 'memory';
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;

    const service = StorageModule.createSecureStorageService();
    expect(service).toBeInstanceOf(MockSecureStorageAdapter);
  });

  it('returns MockSecureStorageAdapter when EXPO_PUBLIC_AUTH_PROVIDER is mock', () => {
    delete process.env.EXPO_PUBLIC_STORAGE_PROVIDER;
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'mock';

    const service = StorageModule.createSecureStorageService();
    expect(service).toBeInstanceOf(MockSecureStorageAdapter);
  });

  it('returns ExpoSecureStoreAdapter by default when no mock provider is set', () => {
    delete process.env.EXPO_PUBLIC_STORAGE_PROVIDER;
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;

    const service = StorageModule.createSecureStorageService();
    expect(service).toBeInstanceOf(ExpoSecureStoreAdapter);
  });

  it('exports singleton secureStorage and adapter classes', () => {
    expect(StorageModule.secureStorage).toBeDefined();
    expect(StorageModule.ExpoSecureStoreAdapter).toBeDefined();
    expect(StorageModule.MockSecureStorageAdapter).toBeDefined();
  });
});
