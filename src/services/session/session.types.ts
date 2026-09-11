export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthenticationStrategy = 'interactive' | 'biometric';

export interface SessionState {
  status: SessionStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  activeRefreshToken: string | null;
  isBiometricsAvailable: boolean;
  isBiometricsEnabled: boolean;
  biometricLabel: string;
  showBiometricOptIn: boolean;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  expiresAt?: number;
}

export interface StoredSessionData {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  biometricsOptedIn: boolean;
  promptedOptIn: boolean;
}

export interface LoginOptions {
  strategy?: AuthenticationStrategy;
  promptMessage?: string;
  /**
   * If true and biometric authentication is unavailable or fails,
   * automatically fall back and initiate interactive Auth0 login.
   */
  fallbackToInteractive?: boolean;
}

export interface ISessionPersistence {
  loadSession(): Promise<StoredSessionData>;
  saveTokens(tokens: SessionTokens): Promise<void>;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  clearActiveTokens(): Promise<void>;
  clearRefreshToken(): Promise<void>;
  saveBiometricSession(session: { refreshToken: string }): Promise<void>;
  setBiometricsOptedIn(enabled: boolean): Promise<void>;
  setPromptedOptIn(prompted: boolean): Promise<void>;
  clearAll(): Promise<void>;
}
