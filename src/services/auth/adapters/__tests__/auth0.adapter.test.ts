import { Auth0Adapter, CUSTOM_SCHEME } from '../auth0.adapter';

describe('Auth0Adapter', () => {
  let adapter: Auth0Adapter;
  let mockAuthorize: jest.Mock;
  let mockUserInfo: jest.Mock;
  let mockRefreshToken: jest.Mock;
  let mockRevoke: jest.Mock;

  beforeEach(() => {
    adapter = new Auth0Adapter();
    mockAuthorize = jest.fn();
    mockUserInfo = jest.fn();
    mockRefreshToken = jest.fn();
    mockRevoke = jest.fn();

    // Mock internal Auth0 instance
    (adapter as any).client = {
      webAuth: {
        authorize: mockAuthorize,
      },
      auth: {
        userInfo: mockUserInfo,
        refreshToken: mockRefreshToken,
        revoke: mockRevoke,
      },
    };
  });

  it('checks isConfigured based on domain and clientId environment variables', () => {
    expect(typeof adapter.isConfigured()).toBe('boolean');
  });

  it('returns false for isConfigured when domain is missing', () => {
    const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
    delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;

    let isConf: boolean;
    jest.isolateModules(() => {
      const { Auth0Adapter: IsolatedAuth0Adapter } = require('../auth0.adapter');
      const testAdapter = new IsolatedAuth0Adapter();
      isConf = testAdapter.isConfigured();
    });

    expect(isConf!).toBe(false);
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
  });

  it('returns false for isConfigured when clientId is missing but domain is present', () => {
    const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
    const originalClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN = 'some-domain';
    delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

    let isConf: boolean;
    jest.isolateModules(() => {
      const { Auth0Adapter: IsolatedAuth0Adapter } = require('../auth0.adapter');
      const testAdapter = new IsolatedAuth0Adapter();
      isConf = testAdapter.isConfigured();
    });

    expect(isConf!).toBe(false);
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
    process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClientId;
  });

  describe('login', () => {
    it('authenticates user and retrieves profile successfully', async () => {
      mockAuthorize.mockResolvedValueOnce({
        accessToken: 'valid_access_token',
        idToken: 'valid_id_token',
        refreshToken: 'valid_refresh_token',
        expiresIn: 3600,
      });

      mockUserInfo.mockResolvedValueOnce({
        sub: 'auth0|123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.png',
        email_verified: true,
      });

      const response = await adapter.login();

      expect(mockAuthorize).toHaveBeenCalledWith(
        { scope: 'openid profile email offline_access' },
        { customScheme: CUSTOM_SCHEME }
      );
      expect(mockUserInfo).toHaveBeenCalledWith({ token: 'valid_access_token' });
      expect(response.user.id).toBe('auth0|123');
      expect(response.user.email).toBe('test@example.com');
      expect(response.user.name).toBe('Test User');
      expect(response.tokens.accessToken).toBe('valid_access_token');
    });

    it('falls back to default user details when userInfo fails', async () => {
      mockAuthorize.mockResolvedValueOnce({
        accessToken: 'valid_access_token',
      });
      mockUserInfo.mockRejectedValueOnce(new Error('UserInfo network failure'));

      const response = await adapter.login();

      expect(response.user.id).toBe('user_default');
      expect(response.user.name).toBe('User');
      expect(response.user.email).toBe('');
    });

    it('falls back to nickname or email when name is missing in profile', async () => {
      mockAuthorize.mockResolvedValueOnce({
        accessToken: 'valid_access_token',
      });
      mockUserInfo.mockResolvedValueOnce({
        sub: 'auth0|nick',
        nickname: 'CoolNick',
      });

      const response = await adapter.login();
      expect(response.user.name).toBe('CoolNick');
    });

    it('falls back to email when nickname and name are missing', async () => {
      mockAuthorize.mockResolvedValueOnce({
        accessToken: 'valid_access_token',
      });
      mockUserInfo.mockResolvedValueOnce({
        sub: 'auth0|emailonly',
        email: 'emailonly@example.com',
      });

      const response = await adapter.login();
      expect(response.user.name).toBe('emailonly@example.com');
    });

    it('throws error when authorize returns no credentials or missing accessToken', async () => {
      mockAuthorize.mockResolvedValueOnce(null);
      await expect(adapter.login()).rejects.toThrow('Authentication failed: No access token received.');

      mockAuthorize.mockResolvedValueOnce({ accessToken: '' });
      await expect(adapter.login()).rejects.toThrow('Authentication failed: No access token received.');
    });
  });

  describe('refreshSession', () => {
    it('refreshes tokens and retrieves updated user profile', async () => {
      mockRefreshToken.mockResolvedValueOnce({
        accessToken: 'refreshed_access',
        idToken: 'refreshed_id',
        refreshToken: 'new_refresh',
        expiresIn: 7200,
      });

      mockUserInfo.mockResolvedValueOnce({
        sub: 'auth0|refreshed',
        email: 'refreshed@example.com',
        name: 'Refreshed User',
      });

      const response = await adapter.refreshSession('old_refresh_token');

      expect(mockRefreshToken).toHaveBeenCalledWith({ refreshToken: 'old_refresh_token' });
      expect(response.tokens.accessToken).toBe('refreshed_access');
      expect(response.tokens.refreshToken).toBe('new_refresh');
      expect(response.user.name).toBe('Refreshed User');
    });

    it('falls back to default user details when userInfo fails during refresh', async () => {
      mockRefreshToken.mockResolvedValueOnce({
        accessToken: 'refreshed_access',
      });
      mockUserInfo.mockRejectedValueOnce(new Error('UserInfo error'));

      const response = await adapter.refreshSession('old_refresh_token');

      expect(response.user.id).toBe('user_default');
      expect(response.user.name).toBe('User');
    });

    it('throws error when refreshToken call returns no credentials or missing accessToken', async () => {
      mockRefreshToken.mockResolvedValueOnce(null);
      await expect(adapter.refreshSession('token')).rejects.toThrow(
        'Failed to refresh tokens with stored refresh token.'
      );

      mockRefreshToken.mockResolvedValueOnce({ accessToken: '' });
      await expect(adapter.refreshSession('token')).rejects.toThrow(
        'Failed to refresh tokens with stored refresh token.'
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token via a direct API call when provided', async () => {
      mockRevoke.mockResolvedValueOnce(undefined);

      await adapter.logout('a_refresh_token');

      expect(mockRevoke).toHaveBeenCalledWith({ refreshToken: 'a_refresh_token' });
    });

    it('does nothing when no refresh token is provided', async () => {
      await adapter.logout();

      expect(mockRevoke).not.toHaveBeenCalled();
    });

    it('catches and logs warning if revoke throws', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Revoke failed');
      mockRevoke.mockRejectedValueOnce(error);

      await adapter.logout('a_refresh_token');

      expect(warnSpy).toHaveBeenCalledWith('Auth0 revoke error:', error);
      warnSpy.mockRestore();
    });
  });

  describe('getClient instantiation', () => {
    it('instantiates new Auth0 client when not initialized', () => {
      const freshAdapter = new Auth0Adapter();
      const client = freshAdapter.getClient();
      expect(client).toBeDefined();
      expect(freshAdapter.getClient()).toBe(client);
    });

    it('getClient uses fallback tenant and client_id when env vars are missing', () => {
      const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
      const originalClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
      delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
      delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

      jest.isolateModules(() => {
        const { Auth0Adapter: IsolatedAuth0Adapter } = require('../auth0.adapter');
        const testAdapter = new IsolatedAuth0Adapter();
        expect(testAdapter.getClient()).toBeDefined();
      });

      process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
      process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClientId;
    });
  });
});
