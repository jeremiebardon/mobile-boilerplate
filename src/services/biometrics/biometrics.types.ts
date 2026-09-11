export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricTypeLabel: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}
