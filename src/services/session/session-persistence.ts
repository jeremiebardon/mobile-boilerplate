import { ISecureStorageAdapter, secureStorage } from '@/services/storage';

import { ISessionPersistence, SessionTokens, StoredSessionData } from './session.types';

const KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  EXPIRES_AT: 'auth_expires_at',
  BIOMETRICS_OPTED_IN: 'auth_biometrics_opted_in',
  OPT_IN_PROMPTED: 'auth_opt_in_prompted',
} as const;

export class SecureStoreSessionPersistence implements ISessionPersistence {
  constructor(private storage: ISecureStorageAdapter = secureStorage) {}

  async loadSession(): Promise<StoredSessionData> {
    try {
      const accessToken = await this.storage.getItem(KEYS.ACCESS_TOKEN);
      const refreshToken = await this.storage.getItem(KEYS.REFRESH_TOKEN);

      const expiresAtRaw = await this.storage.getItem(KEYS.EXPIRES_AT);
      const expiresAt = expiresAtRaw ? parseInt(expiresAtRaw, 10) : null;

      const biometricsOptedInRaw = await this.storage.getItem(KEYS.BIOMETRICS_OPTED_IN);
      const biometricsOptedIn = biometricsOptedInRaw === 'true';

      const promptedOptInRaw = await this.storage.getItem(KEYS.OPT_IN_PROMPTED);
      const promptedOptIn = promptedOptInRaw === 'true';

      return {
        accessToken,
        refreshToken,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
        biometricsOptedIn,
        promptedOptIn,
      };
    } catch (error) {
      console.warn('[SessionPersistence] Failed to load session from storage:', error);
      return {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        biometricsOptedIn: false,
        promptedOptIn: false,
      };
    }
  }

  async saveTokens(tokens: SessionTokens): Promise<void> {
    try {
      await this.storage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken);
      if (tokens.refreshToken) {
        await this.storage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken);
      }
      if (tokens.expiresAt) {
        await this.storage.setItem(KEYS.EXPIRES_AT, tokens.expiresAt.toString());
      }
    } catch (error) {
      console.warn('[SessionPersistence] Failed to save tokens to storage:', error);
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await this.storage.getItem(KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to get access token:', error);
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await this.storage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to get refresh token:', error);
      return null;
    }
  }

  async clearActiveTokens(): Promise<void> {
    try {
      await Promise.all([
        this.storage.deleteItem(KEYS.ACCESS_TOKEN),
        this.storage.deleteItem(KEYS.EXPIRES_AT),
      ]);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to clear active tokens:', error);
    }
  }

  async clearRefreshToken(): Promise<void> {
    try {
      await this.storage.deleteItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to clear refresh token:', error);
    }
  }

  async saveBiometricSession(session: { refreshToken: string }): Promise<void> {
    try {
      await Promise.all([
        this.storage.setItem(KEYS.REFRESH_TOKEN, session.refreshToken),
        this.storage.setItem(KEYS.BIOMETRICS_OPTED_IN, 'true'),
      ]);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to save biometric session:', error);
    }
  }

  async setBiometricsOptedIn(enabled: boolean): Promise<void> {
    try {
      await this.storage.setItem(KEYS.BIOMETRICS_OPTED_IN, enabled ? 'true' : 'false');
    } catch (error) {
      console.warn('[SessionPersistence] Failed to set biometric opt-in flag:', error);
    }
  }

  async setPromptedOptIn(prompted: boolean): Promise<void> {
    try {
      await this.storage.setItem(KEYS.OPT_IN_PROMPTED, prompted ? 'true' : 'false');
    } catch (error) {
      console.warn('[SessionPersistence] Failed to set prompted opt-in flag:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.storage.deleteItem(KEYS.ACCESS_TOKEN),
        this.storage.deleteItem(KEYS.REFRESH_TOKEN),
        this.storage.deleteItem(KEYS.EXPIRES_AT),
        this.storage.deleteItem(KEYS.BIOMETRICS_OPTED_IN),
        this.storage.deleteItem(KEYS.OPT_IN_PROMPTED),
      ]);
    } catch (error) {
      console.warn('[SessionPersistence] Failed to clear all session storage:', error);
    }
  }
}

export class InMemorySessionPersistence implements ISessionPersistence {
  private data = new Map<string, string>();

  async loadSession(): Promise<StoredSessionData> {
    const accessToken = this.data.get(KEYS.ACCESS_TOKEN) ?? null;
    const refreshToken = this.data.get(KEYS.REFRESH_TOKEN) ?? null;
    const expiresAtRaw = this.data.get(KEYS.EXPIRES_AT);
    const expiresAt = expiresAtRaw ? parseInt(expiresAtRaw, 10) : null;
    const biometricsOptedIn = this.data.get(KEYS.BIOMETRICS_OPTED_IN) === 'true';
    const promptedOptIn = this.data.get(KEYS.OPT_IN_PROMPTED) === 'true';

    return {
      accessToken,
      refreshToken,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
      biometricsOptedIn,
      promptedOptIn,
    };
  }

  async saveTokens(tokens: SessionTokens): Promise<void> {
    this.data.set(KEYS.ACCESS_TOKEN, tokens.accessToken);
    if (tokens.refreshToken) {
      this.data.set(KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
    if (tokens.expiresAt) {
      this.data.set(KEYS.EXPIRES_AT, tokens.expiresAt.toString());
    }
  }

  async getAccessToken(): Promise<string | null> {
    return this.data.get(KEYS.ACCESS_TOKEN) ?? null;
  }

  async getRefreshToken(): Promise<string | null> {
    return this.data.get(KEYS.REFRESH_TOKEN) ?? null;
  }

  async clearActiveTokens(): Promise<void> {
    this.data.delete(KEYS.ACCESS_TOKEN);
    this.data.delete(KEYS.EXPIRES_AT);
  }

  async clearRefreshToken(): Promise<void> {
    this.data.delete(KEYS.REFRESH_TOKEN);
  }

  async saveBiometricSession(session: { refreshToken: string }): Promise<void> {
    this.data.set(KEYS.REFRESH_TOKEN, session.refreshToken);
    this.data.set(KEYS.BIOMETRICS_OPTED_IN, 'true');
  }

  async setBiometricsOptedIn(enabled: boolean): Promise<void> {
    this.data.set(KEYS.BIOMETRICS_OPTED_IN, enabled ? 'true' : 'false');
  }

  async setPromptedOptIn(prompted: boolean): Promise<void> {
    this.data.set(KEYS.OPT_IN_PROMPTED, prompted ? 'true' : 'false');
  }

  async clearAll(): Promise<void> {
    this.data.clear();
  }
}
