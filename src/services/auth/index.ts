import { Auth0Adapter } from './adapters/auth0.adapter';
import { MockAuthAdapter } from './adapters/mock.adapter';
import { IAuthAdapter } from './auth-adapter.interface';

export * from './auth-adapter.interface';
export * from './adapters/auth0.adapter';
export * from './adapters/mock.adapter';

/**
 * Global authentication service instance.
 * Swap the adapter or determine at runtime based on environment configuration.
 */
function createAuthService(): IAuthAdapter {
  const provider = process.env.EXPO_PUBLIC_AUTH_PROVIDER?.toLowerCase();

  if (provider === 'mock') {
    return new MockAuthAdapter();
  }

  // Default provider
  return new Auth0Adapter();
}

export const authService: IAuthAdapter = createAuthService();
