import React, { createContext, useContext, useEffect, useState } from 'react';

import { sessionCoordinator, SessionState } from '@/services/session';

import { AuthContextType } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionState, setSessionState] = useState<SessionState>(() =>
    sessionCoordinator.getState()
  );

  useEffect(() => {
    sessionCoordinator.initialize();
    const unsubscribe = sessionCoordinator.subscribe((state) => {
      setSessionState(state);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    isAuthenticated: sessionState.isAuthenticated,
    isLoading: sessionState.isLoading,
    isBiometricsAvailable: sessionState.isBiometricsAvailable,
    isBiometricsEnabled: sessionState.isBiometricsEnabled,
    biometricLabel: sessionState.biometricLabel,
    showBiometricOptIn: sessionState.showBiometricOptIn,
    error: sessionState.error,
    login: () => sessionCoordinator.login({ strategy: 'interactive' }),
    loginWithBiometrics: () =>
      sessionCoordinator.login({
        strategy: 'biometric',
        fallbackToInteractive: false,
      }),
    logout: () => sessionCoordinator.logout(),
    enableBiometrics: () => sessionCoordinator.enableBiometrics(),
    disableBiometrics: () => sessionCoordinator.disableBiometrics(),
    forgetSavedAccount: () => sessionCoordinator.forgetAccount(),
    dismissBiometricOptIn: () => sessionCoordinator.dismissBiometricOptIn(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
