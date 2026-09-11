import { Mutex } from 'async-mutex';

import { authService, IAuthAdapter } from '@/services/auth';
import { BiometricService } from '@/services/biometrics';
import { observability } from '@/services/observability';

import { SecureStoreSessionPersistence } from './session-persistence';
import {
  ISessionPersistence,
  LoginOptions,
  SessionState,
  SessionTokens,
} from './session.types';

export class SessionCoordinator {
  private state: SessionState = {
    status: 'loading',
    isAuthenticated: false,
    isLoading: true,
    error: null,
    activeRefreshToken: null,
    isBiometricsAvailable: false,
    isBiometricsEnabled: false,
    biometricLabel: 'Biometrics',
    showBiometricOptIn: false,
  };

  private listeners = new Set<(state: SessionState) => void>();
  private tokenRefreshMutex = new Mutex();
  private cachedTokens: SessionTokens | null = null;
  private isInitialized = false;

  constructor(
    private persistence: ISessionPersistence = new SecureStoreSessionPersistence(),
    private auth: IAuthAdapter = authService
  ) {}

  /**
   * Set a custom persistence adapter (e.g. InMemorySessionPersistence for testing).
   */
  setPersistence(persistence: ISessionPersistence): void {
    this.persistence = persistence;
  }

  /**
   * Set a custom auth adapter (e.g. MockAuthAdapter for testing).
   */
  setAuthAdapter(auth: IAuthAdapter): void {
    this.auth = auth;
  }

  /**
   * Current snapshot of session state.
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to session state transitions.
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.warn('[SessionCoordinator] Error in listener callback:', err);
      }
    });
  }

  private setState(partial: Partial<SessionState>): void {
    this.state = {
      ...this.state,
      ...partial,
      isAuthenticated: partial.status
        ? partial.status === 'authenticated'
        : partial.isAuthenticated ?? this.state.isAuthenticated,
    };
    this.notify();
  }

  /**
   * Initialize device biometric hardware checks and load existing credentials.
   */
  async initialize(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      // 1. Probe device biometric capabilities
      const capabilities = await BiometricService.getCapabilities();
      const isBiometricsAvailable = capabilities.hasHardware && capabilities.isEnrolled;

      // 2. Load stored session and biometric opt-in preference
      const stored = await this.persistence.loadSession();

      let isBiometricsEnabled = stored.biometricsOptedIn && isBiometricsAvailable;
      let activeRefreshToken = stored.refreshToken;

      if (isBiometricsEnabled && !stored.refreshToken) {
        isBiometricsEnabled = false;
      }

      const hasActiveAccessToken = Boolean(stored.accessToken);
      if (hasActiveAccessToken && stored.accessToken) {
        this.cachedTokens = {
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken ?? undefined,
          expiresAt: stored.expiresAt ?? undefined,
        };
      }

      this.isInitialized = true;
      this.setState({
        status: hasActiveAccessToken ? 'authenticated' : 'unauthenticated',
        isAuthenticated: hasActiveAccessToken,
        isLoading: false,
        activeRefreshToken,
        isBiometricsAvailable,
        isBiometricsEnabled,
        biometricLabel: capabilities.biometricTypeLabel,
        showBiometricOptIn: false,
      });
    } catch (err: any) {
      console.warn('[SessionCoordinator] Initialization error:', err);
      this.isInitialized = true;
      this.setState({
        status: 'unauthenticated',
        isAuthenticated: false,
        isLoading: false,
        error: err?.message || 'Session initialization failed',
      });
    }
  }

  /**
   * Proactive token resolution: retrieves a valid access token.
   * If expired or expiring within 60s, automatically renews before returning.
   */
  async getValidToken(): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If another request is currently refreshing the token, await unlock
    if (this.tokenRefreshMutex.isLocked()) {
      await this.tokenRefreshMutex.waitForUnlock();
      return this.cachedTokens?.accessToken ?? (await this.persistence.getAccessToken());
    }

    // Check cached token
    const token = this.cachedTokens?.accessToken ?? (await this.persistence.getAccessToken());
    if (!token) {
      return null;
    }

    // Check if token is expiring within 60s
    const expiresAt = this.cachedTokens?.expiresAt;
    const isExpiringSoon = expiresAt ? Date.now() >= expiresAt - 60_000 : false;

    if (isExpiringSoon) {
      observability.addBreadcrumb({
        category: 'auth',
        level: 'info',
        message: 'Access token expiring soon; triggering proactive refresh',
      });
      return await this.refreshTokens();
    }

    return token;
  }

  /**
   * Reactive 401 fallback: invoked when a request returns 401 Unauthorized.
   * Locks the mutex and refreshes the token. If renewal fails, logs out.
   */
  async handleUnauthorized(): Promise<string | null> {
    if (this.tokenRefreshMutex.isLocked()) {
      await this.tokenRefreshMutex.waitForUnlock();
      return this.cachedTokens?.accessToken ?? (await this.persistence.getAccessToken());
    }

    return await this.refreshTokens();
  }

  /**
   * Internal synchronized token renewal.
   */
  private async refreshTokens(): Promise<string | null> {
    return await this.tokenRefreshMutex.runExclusive(async () => {
      try {
        const refreshToken =
          this.cachedTokens?.refreshToken ?? (await this.persistence.getRefreshToken());

        if (!refreshToken) {
          throw new Error('No refresh token available to renew session');
        }

        observability.addBreadcrumb({
          category: 'auth',
          level: 'info',
          message: 'Renewing session token',
        });

        const result = await this.auth.refreshSession(refreshToken);
        const newRefreshToken = result.tokens.refreshToken || refreshToken;

        const expiresAt = result.tokens.expiresIn
          ? Date.now() + result.tokens.expiresIn * 1000
          : undefined;

        this.cachedTokens = {
          accessToken: result.tokens.accessToken,
          refreshToken: newRefreshToken,
          expiresAt,
        };

        await this.persistence.saveTokens(this.cachedTokens);

        if (this.state.isBiometricsEnabled) {
          await this.persistence.saveBiometricSession({
            refreshToken: newRefreshToken,
          });
        }

        this.setState({
          status: 'authenticated',
          isAuthenticated: true,
          activeRefreshToken: newRefreshToken,
          error: null,
        });

        observability.addBreadcrumb({
          category: 'auth',
          level: 'info',
          message: 'Session token successfully renewed',
        });

        return result.tokens.accessToken;
      } catch (err: any) {
        observability.addBreadcrumb({
          category: 'auth',
          level: 'warning',
          message: `Session renewal failed: ${err?.message || 'Unknown error'}. Invalidating session.`,
        });

        await this.invalidateSession();
        return null;
      }
    });
  }

  /**
   * Log in using either interactive OAuth2 (Auth0) or biometric verification.
   * If biometrics is unavailable or fails, automatically falls back to interactive Auth0 login.
   */
  async login(options: LoginOptions = {}): Promise<boolean> {
    const strategy = options.strategy ?? 'interactive';

    if (strategy === 'biometric') {
      return await this.loginWithBiometrics(options);
    }

    return await this.loginInteractive();
  }

  private async loginInteractive(): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const result = await this.auth.login();
      const refreshToken = result.tokens.refreshToken;

      const expiresAt = result.tokens.expiresIn
        ? Date.now() + result.tokens.expiresIn * 1000
        : undefined;

      this.cachedTokens = {
        accessToken: result.tokens.accessToken,
        refreshToken,
        expiresAt,
      };

      await this.persistence.saveTokens(this.cachedTokens);

      observability.addBreadcrumb({
        category: 'auth',
        level: 'info',
        message: 'User logged in interactively',
      });

      // Check if biometric opt-in prompt should be shown
      const capabilities = await BiometricService.getCapabilities();
      const stored = await this.persistence.loadSession();

      const shouldPrompt =
        capabilities.hasHardware && capabilities.isEnrolled && !stored.promptedOptIn;

      if (this.state.isBiometricsEnabled && refreshToken) {
        await this.persistence.saveBiometricSession({ refreshToken });
      }

      this.setState({
        status: 'authenticated',
        isAuthenticated: true,
        isLoading: false,
        activeRefreshToken: refreshToken ?? null,
        showBiometricOptIn: shouldPrompt,
        error: null,
      });

      return true;
    } catch (err: any) {
      console.warn('[SessionCoordinator] Login error:', err);
      const errorMessage = err?.message || 'Login failed. Please try again.';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });
      observability.addBreadcrumb({
        category: 'auth',
        level: 'warning',
        message: `Interactive login failed: ${errorMessage}`,
      });
      return false;
    }
  }

  private async loginWithBiometrics(options: LoginOptions): Promise<boolean> {
    const fallbackToInteractive = options.fallbackToInteractive !== false;

    try {
      this.setState({ isLoading: true, error: null });

      const stored = await this.persistence.loadSession();
      const capabilities = await BiometricService.getCapabilities();

      // If biometrics is not available or not opted in: redirect/fall back to interactive Auth0 login
      if (!capabilities.hasHardware || !capabilities.isEnrolled || !stored.biometricsOptedIn || !stored.refreshToken) {
        observability.addBreadcrumb({
          category: 'auth',
          level: 'info',
          message: 'Biometric credentials not available; falling back to interactive login',
        });

        if (fallbackToInteractive) {
          return await this.loginInteractive();
        }

        this.setState({
          isLoading: false,
          error: 'No saved biometric credentials found. Please sign in with your account.',
        });
        return false;
      }

      // Prompt OS biometric verification
      const prompt = options.promptMessage ?? `Sign in with ${capabilities.biometricTypeLabel}`;
      const authResult = await BiometricService.authenticate(prompt);

      if (!authResult.success) {
        observability.addBreadcrumb({
          category: 'auth',
          level: 'info',
          message: `Biometric prompt cancelled or failed: ${authResult.error}`,
        });

        this.setState({
          isLoading: false,
          error: authResult.error ?? 'Biometric authentication was cancelled.',
        });

        return false;
      }

      // Exchange stored refresh token for fresh access token
      const result = await this.auth.refreshSession(stored.refreshToken);
      const newRefreshToken = result.tokens.refreshToken || stored.refreshToken;

      const expiresAt = result.tokens.expiresIn
        ? Date.now() + result.tokens.expiresIn * 1000
        : undefined;

      this.cachedTokens = {
        accessToken: result.tokens.accessToken,
        refreshToken: newRefreshToken,
        expiresAt,
      };

      await this.persistence.saveTokens(this.cachedTokens);
      await this.persistence.saveBiometricSession({ refreshToken: newRefreshToken });

      observability.addBreadcrumb({
        category: 'auth',
        level: 'info',
        message: 'Authenticated successfully with biometrics',
      });

      this.setState({
        status: 'authenticated',
        isAuthenticated: true,
        isLoading: false,
        activeRefreshToken: newRefreshToken,
        error: null,
      });

      return true;
    } catch (err: any) {
      console.warn('[SessionCoordinator] Biometric login error:', err);
      observability.addBreadcrumb({
        category: 'auth',
        level: 'warning',
        message: `Biometric login failed: ${err?.message}. Falling back to interactive login if enabled.`,
      });

      if (fallbackToInteractive) {
        return await this.loginInteractive();
      }

      this.setState({
        isLoading: false,
        error: 'Biometric sign-in expired. Please log in with your account.',
      });
      return false;
    }
  }

  /**
   * Log out: clears active access session. If biometrics is opted in, the refresh
   * token is kept (and NOT revoked) so it can be used later for biometric re-auth;
   * otherwise it's revoked server-side and removed from storage.
   */
  async logout(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      const keepRefreshTokenForBiometrics = this.state.isBiometricsEnabled;
      const refreshToken =
        this.cachedTokens?.refreshToken ?? (await this.persistence.getRefreshToken());

      await this.auth.logout(keepRefreshTokenForBiometrics ? undefined : (refreshToken ?? undefined));
      await this.persistence.clearActiveTokens();
      if (!keepRefreshTokenForBiometrics) {
        await this.persistence.clearRefreshToken();
      }
      this.cachedTokens = null;

      observability.addBreadcrumb({
        category: 'auth',
        level: 'info',
        message: 'User logged out',
      });
      observability.clearUser();

      this.setState({
        status: 'unauthenticated',
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.warn('[SessionCoordinator] Logout error:', err);
      this.setState({ isLoading: false });
    }
  }

  /**
   * Invalidate session completely (e.g. after expired or revoked refresh token).
   */
  private async invalidateSession(): Promise<void> {
    await this.persistence.clearActiveTokens();
    this.cachedTokens = null;
    observability.clearUser();

    this.setState({
      status: 'unauthenticated',
      isAuthenticated: false,
      error: 'Your session has expired. Please log in again.',
    });
  }

  /**
   * Enable biometric sign-in for the current user session.
   */
  async enableBiometrics(): Promise<boolean> {
    try {
      const authResult = await BiometricService.authenticate(
        `Enable ${this.state.biometricLabel} for fast sign-in`
      );

      if (!authResult.success) {
        return false;
      }

      const refreshToken =
        this.cachedTokens?.refreshToken ?? (await this.persistence.getRefreshToken());

      if (refreshToken) {
        await this.persistence.saveBiometricSession({ refreshToken });
      }

      await this.persistence.setBiometricsOptedIn(true);
      await this.persistence.setPromptedOptIn(true);

      this.setState({
        isBiometricsEnabled: true,
        showBiometricOptIn: false,
      });

      return true;
    } catch (err) {
      console.warn('[SessionCoordinator] Enable biometrics error:', err);
      return false;
    }
  }

  /**
   * Disable biometric sign-in.
   */
  async disableBiometrics(): Promise<void> {
    try {
      await this.persistence.setBiometricsOptedIn(false);
      this.setState({ isBiometricsEnabled: false });
    } catch (err) {
      console.warn('[SessionCoordinator] Disable biometrics error:', err);
    }
  }

  /**
   * Completely remove all stored tokens, credentials, and biometric preferences.
   */
  async forgetAccount(): Promise<void> {
    try {
      const refreshToken =
        this.cachedTokens?.refreshToken ?? (await this.persistence.getRefreshToken());

      await this.auth.logout(refreshToken ?? undefined);
      await this.persistence.clearAll();
      this.cachedTokens = null;

      this.setState({
        status: 'unauthenticated',
        isAuthenticated: false,
        isBiometricsEnabled: false,
        activeRefreshToken: null,
      });
    } catch (err) {
      console.warn('[SessionCoordinator] Forget account error:', err);
    }
  }

  /**
   * Dismiss the post-login biometric opt-in prompt.
   */
  async dismissBiometricOptIn(): Promise<void> {
    await this.persistence.setPromptedOptIn(true);
    this.setState({ showBiometricOptIn: false });
  }
}

export const sessionCoordinator = new SessionCoordinator();
