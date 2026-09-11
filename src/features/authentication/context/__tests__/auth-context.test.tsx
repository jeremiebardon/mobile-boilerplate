import React from 'react';
import { Button, Text, View } from 'react-native';

import { sessionCoordinator } from '@/services/session';
import { render, screen, userEvent, waitFor } from '@/test-utils';

import { AuthProvider, useAuth } from '../auth-context';

function TestConsumer() {
  const {
    isAuthenticated,
    isLoading,
    login,
    loginWithBiometrics,
    logout,
    enableBiometrics,
    disableBiometrics,
    forgetSavedAccount,
    dismissBiometricOptIn,
    biometricLabel,
    isBiometricsAvailable,
    isBiometricsEnabled,
    showBiometricOptIn,
    error,
  } = useAuth();

  return (
    <View>
      <Text testID="loading-state">{isLoading ? 'loading' : 'ready'}</Text>
      <Text testID="auth-state">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="biometric-label">{biometricLabel}</Text>
      <Text testID="biometrics-available">{isBiometricsAvailable ? 'yes' : 'no'}</Text>
      <Text testID="biometrics-enabled">{isBiometricsEnabled ? 'yes' : 'no'}</Text>
      <Text testID="show-opt-in">{showBiometricOptIn ? 'yes' : 'no'}</Text>
      <Text testID="error-msg">{error ?? 'none'}</Text>

      <Button title="Login" onPress={() => login()} testID="login-button" />
      <Button title="Login Biometrics" onPress={() => loginWithBiometrics()} testID="login-bio-button" />
      <Button title="Logout" onPress={() => logout()} testID="logout-button" />
      <Button title="Enable Bio" onPress={() => enableBiometrics()} testID="enable-bio-button" />
      <Button title="Disable Bio" onPress={() => disableBiometrics()} testID="disable-bio-button" />
      <Button title="Forget Account" onPress={() => forgetSavedAccount()} testID="forget-account-button" />
      <Button title="Dismiss Opt In" onPress={() => dismissBiometricOptIn()} testID="dismiss-opt-in-button" />
    </View>
  );
}

describe('AuthProvider & useAuth', () => {
  it('renders initial unauthenticated state without exposing user info', async () => {
    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
  });

  it('authenticates on login without storing user profile in state', async () => {
    const user = userEvent.setup();

    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');

    await user.press(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    });
  });

  it('clears authentication on logout', async () => {
    const user = userEvent.setup();

    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.press(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
    });

    await user.press(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('unauthenticated');
    });
  });

  it('delegates biometric and account actions to sessionCoordinator', async () => {
    const user = userEvent.setup();
    const loginSpy = jest.spyOn(sessionCoordinator, 'login').mockResolvedValue(true);
    const enableBioSpy = jest.spyOn(sessionCoordinator, 'enableBiometrics').mockResolvedValue(true);
    const disableBioSpy = jest.spyOn(sessionCoordinator, 'disableBiometrics').mockResolvedValue(undefined);
    const forgetSpy = jest.spyOn(sessionCoordinator, 'forgetAccount').mockResolvedValue(undefined);
    const dismissSpy = jest.spyOn(sessionCoordinator, 'dismissBiometricOptIn').mockResolvedValue(undefined);

    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.press(screen.getByRole('button', { name: 'Login Biometrics' }));
    expect(loginSpy).toHaveBeenCalledWith({ strategy: 'biometric', fallbackToInteractive: false });

    await user.press(screen.getByRole('button', { name: 'Enable Bio' }));
    expect(enableBioSpy).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Disable Bio' }));
    expect(disableBioSpy).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Forget Account' }));
    expect(forgetSpy).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Dismiss Opt In' }));
    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it('throws error when useAuth is called outside of AuthProvider', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    await expect(render(<TestConsumer />)).rejects.toThrow(
      'useAuth must be used within an AuthProvider'
    );

    console.error = originalConsoleError;
  });
});
