import Auth0 from 'react-native-auth0';

import { AuthUser } from '@/features/authentication/types/auth.types';

import { AuthResponse, IAuthAdapter } from '../auth-adapter.interface';

const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';
export const CUSTOM_SCHEME = 'mobileboilerplate';

export class Auth0Adapter implements IAuthAdapter {
  private client: Auth0 | null = null;

  getClient(): Auth0 {
    if (!this.client) {
      this.client = new Auth0({
        domain: domain || 'tenant.auth0.com',
        clientId: clientId || 'client_id',
      });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(domain && clientId);
  }

  /**
   * Universal Login via browser with offline_access scope to obtain a refresh token.
   */
  async login(): Promise<AuthResponse> {
    const auth0 = this.getClient();

    const credentials = await auth0.webAuth.authorize(
      {
        scope: 'openid profile email offline_access',
      },
      { customScheme: CUSTOM_SCHEME }
    );

    if (!credentials || !credentials.accessToken) {
      throw new Error('Authentication failed: No access token received.');
    }

    // Retrieve user profile details using access token
    let profile: any = {};
    try {
      profile = await auth0.auth.userInfo({ token: credentials.accessToken });
    } catch {
      // Fallback
    }

    const user: AuthUser = {
      id: profile?.sub ?? 'user_default',
      email: profile?.email ?? '',
      name: profile?.name ?? profile?.nickname ?? profile?.email ?? 'User',
      picture: profile?.picture,
      emailVerified: profile?.email_verified,
    };

    return {
      user,
      tokens: {
        accessToken: credentials.accessToken,
        idToken: credentials.idToken,
        refreshToken: credentials.refreshToken,
        expiresIn: credentials.expiresIn,
      },
    };
  }

  /**
   * Refresh session using stored refresh token without requiring user credentials.
   */
  async refreshSession(refreshToken: string): Promise<AuthResponse> {
    const auth0 = this.getClient();

    const refreshed = await auth0.auth.refreshToken({
      refreshToken,
    });

    if (!refreshed || !refreshed.accessToken) {
      throw new Error('Failed to refresh tokens with stored refresh token.');
    }

    let profile: any = {};
    try {
      profile = await auth0.auth.userInfo({ token: refreshed.accessToken });
    } catch {
      // Fallback
    }

    const user: AuthUser = {
      id: profile?.sub ?? 'user_default',
      email: profile?.email ?? '',
      name: profile?.name ?? profile?.nickname ?? profile?.email ?? 'User',
      picture: profile?.picture,
      emailVerified: profile?.email_verified,
    };

    return {
      user,
      tokens: {
        accessToken: refreshed.accessToken,
        idToken: refreshed.idToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
      },
    };
  }

  /**
   * Invalidate the refresh token server-side via a direct API call (no browser).
   * Note: this does not clear Auth0's hosted-login SSO cookie, so a subsequent
   * interactive login may silently re-authenticate the browser session. Pass no
   * refreshToken to skip revocation (e.g. when biometric re-auth must keep using it).
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const auth0 = this.getClient();
      await auth0.auth.revoke({ refreshToken });
    } catch (error) {
      console.warn('Auth0 revoke error:', error);
    }
  }
}
