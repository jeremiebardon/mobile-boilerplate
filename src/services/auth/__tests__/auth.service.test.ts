import * as AuthModule from '../index';

describe('createAuthService & auth barrel', () => {
  const originalAuthProvider = process.env.EXPO_PUBLIC_AUTH_PROVIDER;

  afterEach(() => {
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = originalAuthProvider;
  });

  it('creates MockAuthAdapter when EXPO_PUBLIC_AUTH_PROVIDER is mock', () => {
    process.env.EXPO_PUBLIC_AUTH_PROVIDER = 'mock';

    jest.isolateModules(() => {
      const auth = require('../index');
      expect(auth.authService.constructor.name).toBe('MockAuthAdapter');
    });
  });

  it('creates Auth0Adapter by default', () => {
    delete process.env.EXPO_PUBLIC_AUTH_PROVIDER;

    jest.isolateModules(() => {
      const auth = require('../index');
      expect(auth.authService.constructor.name).toBe('Auth0Adapter');
    });
  });

  it('exports singleton authService and adapter classes', () => {
    expect(AuthModule.authService).toBeDefined();
    expect(AuthModule.Auth0Adapter).toBeDefined();
    expect(AuthModule.MockAuthAdapter).toBeDefined();
  });
});
