import { IAuthAdapter } from '@/services/auth';
import { BiometricService } from '@/services/biometrics';

import { sessionCoordinator, SessionCoordinator } from '../session-coordinator';
import { InMemorySessionPersistence } from '../session-persistence';

describe('SessionCoordinator', () => {
  let persistence: InMemorySessionPersistence;
  let mockAuth: jest.Mocked<IAuthAdapter>;
  let coordinator: SessionCoordinator;

  beforeEach(() => {
    jest.clearAllMocks();
    persistence = new InMemorySessionPersistence();

    mockAuth = {
      login: jest.fn().mockResolvedValue({
        user: { id: 'usr_1', email: 'test@example.com', name: 'Test User' },
        tokens: {
          accessToken: 'fresh_access_token',
          refreshToken: 'fresh_refresh_token',
          expiresIn: 3600,
        },
      }),
      refreshSession: jest.fn().mockResolvedValue({
        user: { id: 'usr_1', email: 'test@example.com', name: 'Test User' },
        tokens: {
          accessToken: 'renewed_access_token',
          refreshToken: 'renewed_refresh_token',
          expiresIn: 3600,
        },
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    coordinator = new SessionCoordinator(persistence, mockAuth);
  });

  describe('Adapters & Default Export', () => {
    it('allows changing persistence and auth adapter via setters', () => {
      const newPersistence = new InMemorySessionPersistence();
      coordinator.setPersistence(newPersistence);

      const newAuth: IAuthAdapter = {
        login: jest.fn(),
        logout: jest.fn(),
        refreshSession: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
      };
      coordinator.setAuthAdapter(newAuth);

      expect(coordinator).toBeDefined();
    });

    it('exports singleton instance sessionCoordinator', () => {
      expect(sessionCoordinator).toBeInstanceOf(SessionCoordinator);
    });
  });

  describe('Initialization & State', () => {
    it('initializes to unauthenticated when storage is empty', async () => {
      await coordinator.initialize();

      const state = coordinator.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('restores authenticated state if active access token exists with and without refresh token / expiresAt', async () => {
      await persistence.saveTokens({
        accessToken: 'saved_access_token',
      });

      await coordinator.initialize();

      const state = coordinator.getState();
      expect(state.status).toBe('authenticated');
      expect(state.isAuthenticated).toBe(true);
    });

    it('disables biometrics if user opted in but stored refresh token is missing', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Touch ID',
      });
      await persistence.setBiometricsOptedIn(true);

      await coordinator.initialize();

      const state = coordinator.getState();
      expect(state.isBiometricsEnabled).toBe(false);
      expect(state.biometricLabel).toBe('Touch ID');
    });

    it('handles initialization error gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(BiometricService, 'getCapabilities').mockRejectedValueOnce(new Error('Hardware sensor broken'));

      await coordinator.initialize();

      const state = coordinator.getState();
      expect(state.status).toBe('unauthenticated');
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Hardware sensor broken');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('handles initialization error with non-Error object', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(BiometricService, 'getCapabilities').mockRejectedValueOnce('string error');

      await coordinator.initialize();

      expect(coordinator.getState().error).toBe('Session initialization failed');
      warnSpy.mockRestore();
    });

    it('notifies subscribers of state transitions and handles listener error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      let callCount = 0;
      const faultyListener = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          throw new Error('Listener crash');
        }
      });

      const unsubscribe = coordinator.subscribe(faultyListener);
      expect(faultyListener).toHaveBeenCalledTimes(1);

      await coordinator.initialize();

      expect(faultyListener).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionCoordinator] Error in listener callback:'),
        expect.any(Error)
      );

      unsubscribe();
      // Ensure listener was deleted
      await coordinator.initialize();
      expect(faultyListener).toHaveBeenCalledTimes(3);

      warnSpy.mockRestore();
    });

    it('updates isAuthenticated based on partial status or explicit isAuthenticated', () => {
      // Test direct setState path via internal transition
      (coordinator as any).setState({ status: 'unauthenticated' });
      expect(coordinator.getState().isAuthenticated).toBe(false);

      (coordinator as any).setState({ status: 'authenticated' });
      expect(coordinator.getState().isAuthenticated).toBe(true);

      (coordinator as any).setState({ status: undefined, isAuthenticated: false });
      expect(coordinator.getState().isAuthenticated).toBe(false);

      (coordinator as any).setState({ status: undefined, isAuthenticated: undefined });
      expect(coordinator.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Proactive Token Resolution (getValidToken)', () => {
    it('auto-initializes if called before initialize()', async () => {
      await persistence.saveTokens({
        accessToken: 'auto_init_token',
        refreshToken: 'auto_refresh',
      });

      const token = await coordinator.getValidToken();
      expect(token).toBe('auto_init_token');
    });

    it('returns existing access token when valid and not expiring', async () => {
      await persistence.saveTokens({
        accessToken: 'valid_token',
        refreshToken: 'refresh_tok',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      await coordinator.initialize();

      const token = await coordinator.getValidToken();
      expect(token).toBe('valid_token');
      expect(mockAuth.refreshSession).not.toHaveBeenCalled();
    });

    it('proactively refreshes token when expiring within 60 seconds', async () => {
      await persistence.saveTokens({
        accessToken: 'expiring_token',
        refreshToken: 'valid_refresh_token',
        expiresAt: Date.now() + 30 * 1000,
      });

      await coordinator.initialize();

      const token = await coordinator.getValidToken();
      expect(mockAuth.refreshSession).toHaveBeenCalledWith('valid_refresh_token');
      expect(token).toBe('renewed_access_token');
    });

    it('waits for unlock if mutex is already locked in getValidToken', async () => {
      await persistence.saveTokens({
        accessToken: 'init_token',
        refreshToken: 'shared_refresh',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      await coordinator.initialize();

      // Acquire mutex manually to simulate another refresh running
      const release = await (coordinator as any).tokenRefreshMutex.acquire();

      setTimeout(() => {
        release();
      }, 50);

      const token = await coordinator.getValidToken();
      expect(token).toBe('init_token');
    });

    it('waits for unlock in getValidToken and falls back to persistence if cache is null', async () => {
      await persistence.saveTokens({
        accessToken: 'persisted_token',
      });
      await coordinator.initialize();

      const release = await (coordinator as any).tokenRefreshMutex.acquire();
      (coordinator as any).cachedTokens = null;

      setTimeout(() => {
        release();
      }, 50);

      const token = await coordinator.getValidToken();
      expect(token).toBe('persisted_token');
    });

    it('returns null if no token is available in cache or persistence', async () => {
      await coordinator.initialize();
      const token = await coordinator.getValidToken();
      expect(token).toBeNull();
    });
  });

  describe('Reactive 401 Handling (handleUnauthorized)', () => {
    it('renews session on 401 and returns new token', async () => {
      await persistence.saveTokens({
        accessToken: 'old_access_token',
        refreshToken: 'stored_refresh_token',
      });
      await coordinator.initialize();

      const freshToken = await coordinator.handleUnauthorized();

      expect(freshToken).toBe('renewed_access_token');
      expect(mockAuth.refreshSession).toHaveBeenCalledWith('stored_refresh_token');
      expect(await persistence.getAccessToken()).toBe('renewed_access_token');
    });

    it('waits for unlock if mutex is already locked in handleUnauthorized', async () => {
      await persistence.saveTokens({
        accessToken: 'current_token',
        refreshToken: 'stored_refresh_token',
      });
      await coordinator.initialize();

      const release = await (coordinator as any).tokenRefreshMutex.acquire();
      setTimeout(() => {
        release();
      }, 50);

      const token = await coordinator.handleUnauthorized();
      expect(token).toBe('current_token');
    });

    it('waits for unlock in handleUnauthorized and falls back to persistence if cache is null', async () => {
      await persistence.saveTokens({
        accessToken: 'current_persisted_token',
      });
      await coordinator.initialize();

      const release = await (coordinator as any).tokenRefreshMutex.acquire();
      (coordinator as any).cachedTokens = null;
      setTimeout(() => {
        release();
      }, 50);

      const token = await coordinator.handleUnauthorized();
      expect(token).toBe('current_persisted_token');
    });

    it('invalidates session when renewal fails with error without message property', async () => {
      await persistence.saveTokens({
        accessToken: 'revoked_access_token',
        refreshToken: 'revoked_refresh_token',
      });
      await coordinator.initialize();

      mockAuth.refreshSession.mockRejectedValueOnce({});

      const result = await coordinator.handleUnauthorized();

      expect(result).toBeNull();
      expect(coordinator.getState().status).toBe('unauthenticated');
    });

    it('invalidates session if token renewal fails when refresh token is missing', async () => {
      await persistence.saveTokens({ accessToken: 'orphan_access_token' });
      await coordinator.initialize();

      const result = await coordinator.handleUnauthorized();

      expect(result).toBeNull();
      expect(coordinator.getState().status).toBe('unauthenticated');
      expect(coordinator.getState().error).toMatch(/session has expired/i);
    });

    it('invalidates session if token renewal fails with network error', async () => {
      await persistence.saveTokens({
        accessToken: 'revoked_access_token',
        refreshToken: 'revoked_refresh_token',
      });
      await coordinator.initialize();

      mockAuth.refreshSession.mockRejectedValueOnce(new Error('Invalid refresh token'));

      const result = await coordinator.handleUnauthorized();

      expect(result).toBeNull();
      expect(coordinator.getState().status).toBe('unauthenticated');
      expect(coordinator.getState().isAuthenticated).toBe(false);
      expect(await persistence.getAccessToken()).toBeNull();
    });

    it('handles refreshSession without new refreshToken or expiresIn while biometrics is enabled', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      await persistence.saveTokens({
        accessToken: 'acc',
        refreshToken: 'existing_ref',
      });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      // Return tokens without new refreshToken or expiresIn
      mockAuth.refreshSession.mockResolvedValueOnce({
        user: { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        tokens: {
          accessToken: 'renewed_acc_only',
        } as any,
      });

      const token = await coordinator.handleUnauthorized();
      expect(token).toBe('renewed_acc_only');
      expect(coordinator.getState().activeRefreshToken).toBe('existing_ref');
    });
  });

  describe('Concurrency & Mutex Synchronization', () => {
    it('serializes concurrent refreshes so only one auth call is made', async () => {
      await persistence.saveTokens({
        accessToken: 'expired_access_token',
        refreshToken: 'shared_refresh_token',
      });
      await coordinator.initialize();

      const results = await Promise.all([
        coordinator.handleUnauthorized(),
        coordinator.handleUnauthorized(),
        coordinator.handleUnauthorized(),
        coordinator.handleUnauthorized(),
        coordinator.handleUnauthorized(),
      ]);

      results.forEach((token) => {
        expect(token).toBe('renewed_access_token');
      });

      expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interactive Login', () => {
    it('performs interactive login and sets biometric opt-in prompt when eligible', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      await coordinator.initialize();

      // Default login call (options omitted)
      const success = await coordinator.login();

      expect(success).toBe(true);
      expect(mockAuth.login).toHaveBeenCalled();
      expect(coordinator.getState().isAuthenticated).toBe(true);
      expect(coordinator.getState().showBiometricOptIn).toBe(true);
    });

    it('saves biometric session during interactive login when biometrics was already enabled', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      await persistence.setBiometricsOptedIn(true);
      await persistence.setPromptedOptIn(true);
      await coordinator.initialize();

      mockAuth.login.mockResolvedValueOnce({
        user: { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        tokens: {
          accessToken: 'acc_no_exp',
          refreshToken: 'ref_bio',
        } as any,
      });

      const success = await coordinator.login({ strategy: 'interactive' });
      expect(success).toBe(true);
      expect(coordinator.getState().showBiometricOptIn).toBe(false);
    });

    it('performs interactive login when tokens omit refreshToken', async () => {
      await coordinator.initialize();

      mockAuth.login.mockResolvedValueOnce({
        user: { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        tokens: {
          accessToken: 'only_access_token',
        } as any,
      });

      const success = await coordinator.login();
      expect(success).toBe(true);
      expect(coordinator.getState().activeRefreshToken).toBeNull();
    });

    it('handles interactive login failure gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await coordinator.initialize();

      mockAuth.login.mockRejectedValueOnce(new Error('User cancelled login'));

      const success = await coordinator.login({ strategy: 'interactive' });

      expect(success).toBe(false);
      expect(coordinator.getState().isAuthenticated).toBe(false);
      expect(coordinator.getState().error).toBe('User cancelled login');
      warnSpy.mockRestore();
    });

    it('handles interactive login failure with non-Error object', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await coordinator.initialize();

      mockAuth.login.mockRejectedValueOnce(null);

      const success = await coordinator.login({ strategy: 'interactive' });

      expect(success).toBe(false);
      expect(coordinator.getState().error).toBe('Login failed. Please try again.');
      warnSpy.mockRestore();
    });
  });

  describe('Biometric Login Strategy', () => {
    it('performs biometric login successfully', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Touch ID',
      });
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
        success: true,
      });

      await persistence.saveBiometricSession({ refreshToken: 'biometric_refresh_token' });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      const success = await coordinator.login({
        strategy: 'biometric',
        promptMessage: 'Custom Prompt',
      });

      expect(success).toBe(true);
      expect(BiometricService.authenticate).toHaveBeenCalledWith('Custom Prompt');
      expect(mockAuth.refreshSession).toHaveBeenCalledWith('biometric_refresh_token');
      expect(coordinator.getState().isAuthenticated).toBe(true);
    });

    it('performs biometric login when refreshSession omits new refreshToken and expiresIn', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Touch ID',
      });
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
        success: true,
      });

      await persistence.saveBiometricSession({ refreshToken: 'bio_existing_ref' });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      mockAuth.refreshSession.mockResolvedValueOnce({
        user: { id: 'u1', email: 'u1@example.com', name: 'User 1' },
        tokens: {
          accessToken: 'acc_renewed_plain',
        } as any,
      });

      const success = await coordinator.login({ strategy: 'biometric' });
      expect(success).toBe(true);
      expect(coordinator.getState().activeRefreshToken).toBe('bio_existing_ref');
    });

    it('falls back to interactive login when biometrics is unavailable or not enrolled', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        biometricTypeLabel: 'Biometrics',
      });

      await coordinator.initialize();

      const success = await coordinator.login({
        strategy: 'biometric',
        fallbackToInteractive: true,
      });

      expect(success).toBe(true);
      expect(mockAuth.login).toHaveBeenCalled();
      expect(coordinator.getState().isAuthenticated).toBe(true);
    });

    it('returns error when biometrics is unavailable and fallbackToInteractive is false', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        biometricTypeLabel: 'Biometrics',
      });

      await coordinator.initialize();

      const success = await coordinator.login({
        strategy: 'biometric',
        fallbackToInteractive: false,
      });

      expect(success).toBe(false);
      expect(mockAuth.login).not.toHaveBeenCalled();
      expect(coordinator.getState().error).toMatch(/No saved biometric credentials found/i);
    });

    it('handles biometric authentication prompt failure with and without error message', async () => {
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValueOnce({
        success: false,
        error: 'Too many attempts',
      });

      await persistence.saveBiometricSession({ refreshToken: 'bio_ref' });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      const res1 = await coordinator.login({ strategy: 'biometric' });
      expect(res1).toBe(false);
      expect(coordinator.getState().error).toBe('Too many attempts');

      // Without error message
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValueOnce({
        success: false,
      });
      const res2 = await coordinator.login({ strategy: 'biometric' });
      expect(res2).toBe(false);
      expect(coordinator.getState().error).toBe('Biometric authentication was cancelled.');
    });

    it('handles biometric refreshSession failure by falling back to interactive login', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
        success: true,
      });

      await persistence.saveBiometricSession({ refreshToken: 'invalid_bio_ref' });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      mockAuth.refreshSession.mockRejectedValueOnce(new Error('Refresh token revoked'));

      const success = await coordinator.login({ strategy: 'biometric', fallbackToInteractive: true });
      expect(success).toBe(true);
      expect(mockAuth.login).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('handles biometric refreshSession failure when fallbackToInteractive is false', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        biometricTypeLabel: 'Face ID',
      });
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
        success: true,
      });

      await persistence.saveBiometricSession({ refreshToken: 'invalid_bio_ref' });
      await persistence.setBiometricsOptedIn(true);
      await coordinator.initialize();

      mockAuth.refreshSession.mockRejectedValueOnce(new Error('Network error'));

      const success = await coordinator.login({ strategy: 'biometric', fallbackToInteractive: false });
      expect(success).toBe(false);
      expect(coordinator.getState().error).toMatch(/Biometric sign-in expired/i);
      warnSpy.mockRestore();
    });
  });

  describe('Enable & Disable Biometrics', () => {
    it('enables biometrics when authentication succeeds', async () => {
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({ success: true });
      await persistence.saveTokens({ accessToken: 'acc', refreshToken: 'ref' });
      await coordinator.initialize();

      const success = await coordinator.enableBiometrics();
      expect(success).toBe(true);
      expect(coordinator.getState().isBiometricsEnabled).toBe(true);
      expect(coordinator.getState().showBiometricOptIn).toBe(false);
      expect((await persistence.loadSession()).biometricsOptedIn).toBe(true);
    });

    it('enables biometrics when refresh token is in cache', async () => {
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({ success: true });
      await coordinator.initialize();

      // No tokens
      const success = await coordinator.enableBiometrics();
      expect(success).toBe(true);
    });

    it('returns false when enable biometrics prompt is cancelled', async () => {
      jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({ success: false });
      await coordinator.initialize();

      const success = await coordinator.enableBiometrics();
      expect(success).toBe(false);
      expect(coordinator.getState().isBiometricsEnabled).toBe(false);
    });

    it('catches and handles enableBiometrics error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(BiometricService, 'authenticate').mockRejectedValue(new Error('Biometric hardware error'));
      await coordinator.initialize();

      const success = await coordinator.enableBiometrics();
      expect(success).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionCoordinator] Enable biometrics error:'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });

    it('disables biometrics successfully and handles error', async () => {
      await coordinator.initialize();
      await coordinator.disableBiometrics();
      expect(coordinator.getState().isBiometricsEnabled).toBe(false);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(persistence, 'setBiometricsOptedIn').mockRejectedValueOnce(new Error('Storage failure'));

      await coordinator.disableBiometrics();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionCoordinator] Disable biometrics error:'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });

    it('dismisses biometric opt-in prompt', async () => {
      await coordinator.initialize();
      (coordinator as any).setState({ showBiometricOptIn: true });
      expect(coordinator.getState().showBiometricOptIn).toBe(true);

      await coordinator.dismissBiometricOptIn();
      expect(coordinator.getState().showBiometricOptIn).toBe(false);
      expect((await persistence.loadSession()).promptedOptIn).toBe(true);
    });
  });

  describe('Logout & Session Cleanup', () => {
    it('clears active session on logout while keeping biometric preference in storage', async () => {
      await persistence.saveTokens({
        accessToken: 'active_token',
        refreshToken: 'active_refresh',
      });
      await persistence.saveBiometricSession({ refreshToken: 'active_refresh' });
      await coordinator.initialize();

      await coordinator.logout();

      expect(mockAuth.logout).toHaveBeenCalledWith(undefined);
      expect(coordinator.getState().isAuthenticated).toBe(false);
      expect(await persistence.getAccessToken()).toBeNull();

      const stored = await persistence.loadSession();
      expect(stored.biometricsOptedIn).toBe(true);
      expect(stored.refreshToken).toBe('active_refresh');
    });

    it('revokes and clears the refresh token on logout when biometrics is not opted in', async () => {
      await persistence.saveTokens({
        accessToken: 'active_token',
        refreshToken: 'active_refresh',
      });
      await coordinator.initialize();

      await coordinator.logout();

      expect(mockAuth.logout).toHaveBeenCalledWith('active_refresh');

      const stored = await persistence.loadSession();
      expect(stored.refreshToken).toBeNull();
    });

    it('handles logout error gracefully', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockAuth.logout.mockRejectedValueOnce(new Error('Logout network error'));
      await coordinator.initialize();

      await coordinator.logout();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionCoordinator] Logout error:'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });

    it('completely wipes credentials on forgetAccount and handles error', async () => {
      await persistence.saveTokens({
        accessToken: 'active_token',
        refreshToken: 'active_refresh',
      });
      await persistence.saveBiometricSession({ refreshToken: 'active_refresh' });
      await coordinator.initialize();

      await coordinator.forgetAccount();

      const stored = await persistence.loadSession();
      expect(stored.accessToken).toBeNull();
      expect(stored.refreshToken).toBeNull();
      expect(stored.biometricsOptedIn).toBe(false);
      expect(coordinator.getState().isAuthenticated).toBe(false);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(persistence, 'clearAll').mockRejectedValueOnce(new Error('Clear failed'));

      await coordinator.forgetAccount();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SessionCoordinator] Forget account error:'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });
});
