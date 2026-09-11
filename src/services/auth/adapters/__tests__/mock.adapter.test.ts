import { MockAuthAdapter } from '../mock.adapter';

describe('MockAuthAdapter', () => {
  let adapter: MockAuthAdapter;

  beforeEach(() => {
    adapter = new MockAuthAdapter();
  });

  it('is always configured', () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it('performs mock login returning mock user and tokens', async () => {
    const response = await adapter.login();

    expect(response.user.id).toBe('mock_user_123');
    expect(response.user.email).toBe('developer@example.com');
    expect(response.tokens.accessToken).toMatch(/^mock_access_token_/);
    expect(response.tokens.refreshToken).toMatch(/^mock_refresh_token_/);
    expect(response.tokens.expiresIn).toBe(3600);
  });

  it('refreshes session with provided refresh token', async () => {
    const response = await adapter.refreshSession('custom_refresh_token');

    expect(response.tokens.refreshToken).toBe('custom_refresh_token');
    expect(response.tokens.accessToken).toMatch(/^mock_refreshed_access_token_/);
  });

  it('refreshes session generating fallback refresh token when empty', async () => {
    const response = await adapter.refreshSession('');

    expect(response.tokens.refreshToken).toMatch(/^mock_refresh_token_/);
  });

  it('completes logout without errors', async () => {
    await expect(adapter.logout()).resolves.toBeUndefined();
  });
});
