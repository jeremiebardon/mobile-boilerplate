export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
}

export interface StoredBiometricSession {
  refreshToken: string;
}

export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  isBiometricsAvailable: boolean;
  isBiometricsEnabled: boolean;
  biometricLabel: string;
  showBiometricOptIn: boolean;
  error: string | null;
  login: () => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  logout: () => Promise<void>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  forgetSavedAccount: () => Promise<void>;
  dismissBiometricOptIn: () => Promise<void>;
}
