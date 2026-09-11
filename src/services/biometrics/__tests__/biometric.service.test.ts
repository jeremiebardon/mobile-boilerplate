import { Platform } from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import { BiometricService } from '../biometric.service';

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  describe('getCapabilities', () => {
    it('returns false capabilities when device has no biometric hardware', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(false);
      const isEnrolledSpy = jest.spyOn(LocalAuthentication, 'isEnrolledAsync');

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: false,
        isEnrolled: false,
        biometricTypeLabel: 'Biometrics',
      });
      expect(isEnrolledSpy).not.toHaveBeenCalled();
    });

    it('returns isEnrolled false when hardware exists but user is not enrolled', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(false);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.hasHardware).toBe(true);
      expect(capabilities.isEnrolled).toBe(false);
      expect(capabilities.biometricTypeLabel).toBe('Face ID');
    });

    it('identifies Face ID on iOS', async () => {
      Platform.OS = 'ios';
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.biometricTypeLabel).toBe('Face ID');
    });

    it('identifies Face Recognition on Android', async () => {
      Platform.OS = 'android';
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.biometricTypeLabel).toBe('Face Recognition');
    });

    it('identifies Touch ID on iOS', async () => {
      Platform.OS = 'ios';
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.biometricTypeLabel).toBe('Touch ID');
    });

    it('identifies Fingerprint on Android', async () => {
      Platform.OS = 'android';
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities.biometricTypeLabel).toBe('Fingerprint');
    });

    it('returns safe fallback when native check throws an error', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockRejectedValue(new Error('Hardware check failed'));

      const capabilities = await BiometricService.getCapabilities();

      expect(capabilities).toEqual({
        hasHardware: false,
        isEnrolled: false,
        biometricTypeLabel: 'Biometrics',
      });
      warnSpy.mockRestore();
    });
  });

  describe('authenticate', () => {
    it('returns failure when biometrics is not available on device', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(false);
      const authenticateSpy = jest.spyOn(LocalAuthentication, 'authenticateAsync');

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not available or not enrolled/i);
      expect(authenticateSpy).not.toHaveBeenCalled();
    });

    it('prompts native authentication and returns success', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      const authenticateSpy = jest.spyOn(LocalAuthentication, 'authenticateAsync').mockResolvedValue({
        success: true,
      });

      const result = await BiometricService.authenticate('Sign in to your account');

      expect(result.success).toBe(true);
      expect(authenticateSpy).toHaveBeenCalledWith({
        promptMessage: 'Sign in to your account',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
    });

    it('returns error when user cancels native authentication', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      jest.spyOn(LocalAuthentication, 'authenticateAsync').mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_cancel');
    });

    it('returns default fallback error message when authenticateAsync error is nullish', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      jest.spyOn(LocalAuthentication, 'authenticateAsync').mockResolvedValue({
        success: false,
      } as any);

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication was cancelled or failed.');
    });

    it('catches unexpected native exceptions and returns error message', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      jest.spyOn(LocalAuthentication, 'authenticateAsync').mockRejectedValue(new Error('Sensor timeout'));

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sensor timeout');
    });

    it('returns generic error when native exception has no message property', async () => {
      jest.spyOn(LocalAuthentication, 'hasHardwareAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'isEnrolledAsync').mockResolvedValue(true);
      jest.spyOn(LocalAuthentication, 'supportedAuthenticationTypesAsync').mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      jest.spyOn(LocalAuthentication, 'authenticateAsync').mockRejectedValue({});

      const result = await BiometricService.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication encountered an error.');
    });
  });
});
