import { AuthUser } from '@/features/authentication/types/auth.types';

export interface AuthTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface IAuthAdapter {
  /**
   * Interactive login (e.g., via OAuth2 PKCE / Universal Web Auth / Hosted Login)
   */
  login(): Promise<AuthResponse>;

  /**
   * Silently refresh session using a stored refresh token
   */
  refreshSession(refreshToken: string): Promise<AuthResponse>;

  /**
   * Log out. When a refreshToken is provided, revokes it server-side via a
   * direct API call (no browser redirect). Omit it to skip revocation.
   */
  logout(refreshToken?: string): Promise<void>;

  /**
   * Check if the underlying provider is properly configured with credentials
   */
  isConfigured(): boolean;
}
