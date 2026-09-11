import { AuthUser } from '@/features/authentication/types/auth.types';

import { AuthResponse, IAuthAdapter } from '../auth-adapter.interface';

export class MockAuthAdapter implements IAuthAdapter {
  private mockUser: AuthUser = {
    id: 'mock_user_123',
    email: 'developer@example.com',
    name: 'Dev User',
    picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    emailVerified: true,
  };

  isConfigured(): boolean {
    return true;
  }

  async login(): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      user: this.mockUser,
      tokens: {
        accessToken: 'mock_access_token_' + Date.now(),
        idToken: 'mock_id_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 3600,
      },
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      user: this.mockUser,
      tokens: {
        accessToken: 'mock_refreshed_access_token_' + Date.now(),
        idToken: 'mock_refreshed_id_token_' + Date.now(),
        refreshToken: refreshToken || 'mock_refresh_token_' + Date.now(),
        expiresIn: 3600,
      },
    };
  }

  async logout(_refreshToken?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
