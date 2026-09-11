import { ISecureStorageAdapter } from '@/services/storage';

import { InMemorySessionPersistence, SecureStoreSessionPersistence } from '../session-persistence';

describe('SessionPersistence', () => {
  describe('SecureStoreSessionPersistence', () => {
    let mockStorage: jest.Mocked<ISecureStorageAdapter>;
    let persistence: SecureStoreSessionPersistence;

    beforeEach(() => {
      mockStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        deleteItem: jest.fn(),
      };
      persistence = new SecureStoreSessionPersistence(mockStorage);
    });

    it('uses default storage adapter if none is provided', () => {
      const defaultPersistence = new SecureStoreSessionPersistence();
      expect(defaultPersistence).toBeDefined();
    });

    describe('loadSession', () => {
      it('loads full valid session from storage', async () => {
        mockStorage.getItem.mockImplementation(async (key: string) => {
          switch (key) {
            case 'auth_access_token':
              return 'access-token-123';
            case 'auth_refresh_token':
              return 'refresh-token-456';
            case 'auth_expires_at':
              return '1700000000';
            case 'auth_biometrics_opted_in':
              return 'true';
            case 'auth_opt_in_prompted':
              return 'true';
            default:
              return null;
          }
        });

        const session = await persistence.loadSession();
        expect(session).toEqual({
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresAt: 1700000000,
          biometricsOptedIn: true,
          promptedOptIn: true,
        });
      });

      it('handles nulls, falsy values, and invalid non-finite expiresAt', async () => {
        mockStorage.getItem.mockImplementation(async (key: string) => {
          if (key === 'auth_expires_at') return 'not-a-number';
          if (key === 'auth_biometrics_opted_in') return 'false';
          if (key === 'auth_opt_in_prompted') return null;
          return null;
        });

        const session = await persistence.loadSession();
        expect(session).toEqual({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          biometricsOptedIn: false,
          promptedOptIn: false,
        });

        // Test with auth_expires_at returning null
        mockStorage.getItem.mockImplementation(async (key: string) => {
          if (key === 'auth_expires_at') return null;
          return null;
        });
        const sessionWithNullExpires = await persistence.loadSession();
        expect(sessionWithNullExpires.expiresAt).toBeNull();
      });

      it('catches and handles storage error returning fallback empty session', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.getItem.mockRejectedValueOnce(new Error('Storage failure'));

        const session = await persistence.loadSession();
        expect(session).toEqual({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          biometricsOptedIn: false,
          promptedOptIn: false,
        });
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to load session from storage:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('saveTokens', () => {
      it('saves all token fields when provided', async () => {
        await persistence.saveTokens({
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresAt: 1800000000,
        });

        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_access_token', 'new-access');
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_refresh_token', 'new-refresh');
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_expires_at', '1800000000');
      });

      it('only saves accessToken when refreshToken and expiresAt are omitted', async () => {
        await persistence.saveTokens({
          accessToken: 'only-access',
        });

        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_access_token', 'only-access');
        expect(mockStorage.setItem).not.toHaveBeenCalledWith('auth_refresh_token', expect.any(String));
        expect(mockStorage.setItem).not.toHaveBeenCalledWith('auth_expires_at', expect.any(String));
      });

      it('catches storage error gracefully', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.setItem.mockRejectedValueOnce(new Error('Write error'));

        await expect(persistence.saveTokens({ accessToken: 'fail-access' })).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to save tokens to storage:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('getAccessToken and getRefreshToken', () => {
      it('returns access token from storage and handles error', async () => {
        mockStorage.getItem.mockResolvedValueOnce('acc-123');
        expect(await persistence.getAccessToken()).toBe('acc-123');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.getItem.mockRejectedValueOnce(new Error('Read error'));
        expect(await persistence.getAccessToken()).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to get access token:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });

      it('returns refresh token from storage and handles error', async () => {
        mockStorage.getItem.mockResolvedValueOnce('ref-456');
        expect(await persistence.getRefreshToken()).toBe('ref-456');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.getItem.mockRejectedValueOnce(new Error('Read error'));
        expect(await persistence.getRefreshToken()).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to get refresh token:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('clearActiveTokens', () => {
      it('deletes access token and expiresAt, and handles error', async () => {
        await persistence.clearActiveTokens();
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_access_token');
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_expires_at');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.deleteItem.mockRejectedValueOnce(new Error('Delete error'));
        await expect(persistence.clearActiveTokens()).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to clear active tokens:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('saveBiometricSession', () => {
      it('saves refresh token and enables biometrics flag, and handles error', async () => {
        await persistence.saveBiometricSession({ refreshToken: 'bio-refresh' });
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_refresh_token', 'bio-refresh');
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_biometrics_opted_in', 'true');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.setItem.mockRejectedValueOnce(new Error('Save error'));
        await expect(persistence.saveBiometricSession({ refreshToken: 'bio-refresh' })).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to save biometric session:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('setBiometricsOptedIn and setPromptedOptIn', () => {
      it('sets biometrics opted in true and false and handles error', async () => {
        await persistence.setBiometricsOptedIn(true);
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_biometrics_opted_in', 'true');

        await persistence.setBiometricsOptedIn(false);
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_biometrics_opted_in', 'false');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.setItem.mockRejectedValueOnce(new Error('Opt-in write error'));
        await expect(persistence.setBiometricsOptedIn(true)).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to set biometric opt-in flag:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });

      it('sets prompted opt-in true and false and handles error', async () => {
        await persistence.setPromptedOptIn(true);
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_opt_in_prompted', 'true');

        await persistence.setPromptedOptIn(false);
        expect(mockStorage.setItem).toHaveBeenCalledWith('auth_opt_in_prompted', 'false');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.setItem.mockRejectedValueOnce(new Error('Prompted write error'));
        await expect(persistence.setPromptedOptIn(true)).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to set prompted opt-in flag:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });

    describe('clearAll', () => {
      it('deletes all keys and handles error', async () => {
        await persistence.clearAll();
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_access_token');
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_refresh_token');
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_expires_at');
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_biometrics_opted_in');
        expect(mockStorage.deleteItem).toHaveBeenCalledWith('auth_opt_in_prompted');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockStorage.deleteItem.mockRejectedValueOnce(new Error('Clear error'));
        await expect(persistence.clearAll()).resolves.not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SessionPersistence] Failed to clear all session storage:'),
          expect.any(Error)
        );
        warnSpy.mockRestore();
      });
    });
  });

  describe('InMemorySessionPersistence', () => {
    let inMemory: InMemorySessionPersistence;

    beforeEach(() => {
      inMemory = new InMemorySessionPersistence();
    });

    it('loads empty session initially', async () => {
      const session = await inMemory.loadSession();
      expect(session).toEqual({
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        biometricsOptedIn: false,
        promptedOptIn: false,
      });
    });

    it('saves and loads full session tokens', async () => {
      await inMemory.saveTokens({
        accessToken: 'mem-acc',
        refreshToken: 'mem-ref',
        expiresAt: 1750000000,
      });

      expect(await inMemory.getAccessToken()).toBe('mem-acc');
      expect(await inMemory.getRefreshToken()).toBe('mem-ref');

      const session = await inMemory.loadSession();
      expect(session.accessToken).toBe('mem-acc');
      expect(session.refreshToken).toBe('mem-ref');
      expect(session.expiresAt).toBe(1750000000);
    });

    it('saves tokens with only accessToken', async () => {
      await inMemory.saveTokens({ accessToken: 'only-acc' });
      expect(await inMemory.getAccessToken()).toBe('only-acc');
      expect(await inMemory.getRefreshToken()).toBeNull();
    });

    it('clears active tokens', async () => {
      await inMemory.saveTokens({
        accessToken: 'mem-acc',
        refreshToken: 'mem-ref',
        expiresAt: 1750000000,
      });

      await inMemory.clearActiveTokens();
      expect(await inMemory.getAccessToken()).toBeNull();
      expect(await inMemory.getRefreshToken()).toBe('mem-ref');
    });

    it('saves biometric session and toggles flags', async () => {
      await inMemory.saveBiometricSession({ refreshToken: 'bio-ref' });
      expect(await inMemory.getRefreshToken()).toBe('bio-ref');
      expect((await inMemory.loadSession()).biometricsOptedIn).toBe(true);

      await inMemory.setBiometricsOptedIn(false);
      expect((await inMemory.loadSession()).biometricsOptedIn).toBe(false);
      await inMemory.setBiometricsOptedIn(true);
      expect((await inMemory.loadSession()).biometricsOptedIn).toBe(true);

      await inMemory.setPromptedOptIn(true);
      expect((await inMemory.loadSession()).promptedOptIn).toBe(true);
      await inMemory.setPromptedOptIn(false);
      expect((await inMemory.loadSession()).promptedOptIn).toBe(false);
    });

    it('clears all in-memory data', async () => {
      await inMemory.saveTokens({ accessToken: 'acc' });
      await inMemory.saveBiometricSession({ refreshToken: 'ref' });
      await inMemory.setPromptedOptIn(true);

      await inMemory.clearAll();
      const session = await inMemory.loadSession();
      expect(session).toEqual({
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        biometricsOptedIn: false,
        promptedOptIn: false,
      });
    });

    it('handles non-finite expiresAt in in-memory session', async () => {
      (inMemory as any).data.set('auth_expires_at', 'non-numeric');
      const session = await inMemory.loadSession();
      expect(session.expiresAt).toBeNull();
    });
  });
});
