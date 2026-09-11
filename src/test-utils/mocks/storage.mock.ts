import {
  SecureStoreSessionPersistence,
  sessionCoordinator,
} from '@/services/session';
import { MockSecureStorageAdapter } from '@/services/storage';

export const testSecureStorage = new MockSecureStorageAdapter();

export function setupTestStorage(): void {
  const persistence = new SecureStoreSessionPersistence(testSecureStorage);
  sessionCoordinator.setPersistence(persistence);
}

export async function resetTestStorage(): Promise<void> {
  await testSecureStorage.clear();
  const persistence = new SecureStoreSessionPersistence(testSecureStorage);
  sessionCoordinator.setPersistence(persistence);
}

// Automatically configure adapter on load
setupTestStorage();
