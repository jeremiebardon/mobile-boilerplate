import { Platform } from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import { BiometricAuthResult, BiometricCapabilities } from './biometrics.types';

export class BiometricService {
  /**
   * Check biometric hardware and enrollment capabilities of the device.
   */
  static async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
      const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];

      let biometricTypeLabel = 'Biometrics';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricTypeLabel = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricTypeLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      }

      return {
        hasHardware,
        isEnrolled,
        biometricTypeLabel,
      };
    } catch (error) {
      console.warn('[BiometricService] Error checking biometric capabilities:', error);
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricTypeLabel: 'Biometrics',
      };
    }
  }

  /**
   * Prompt biometric authentication dialog on the device.
   */
  static async authenticate(promptMessage: string = 'Confirm your identity'): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getCapabilities();
      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication is not available or not enrolled on this device.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error ?? 'Biometric authentication was cancelled or failed.',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message ?? 'Biometric authentication encountered an error.',
      };
    }
  }
}
