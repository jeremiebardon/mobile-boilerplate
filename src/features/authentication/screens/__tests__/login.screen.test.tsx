import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { authService } from '@/services/auth';
import { BiometricService } from '@/services/biometrics';
import { SecureStoreSessionPersistence } from '@/services/session';
import { testSecureStorage } from '@/test-utils/mocks/storage.mock';

import { AuthProvider } from '../../context/auth-context';
import { LoginScreen } from '../login.screen';

function LoginRoute() {
  return (
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>
  );
}

const testPersistence = new SecureStoreSessionPersistence(testSecureStorage);

describe('LoginScreen (Expo Router testing without mocking navigation)', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('renders initial welcome state with Expo Router and triggers login on button press', async () => {
    const user = userEvent.setup();
    const loginSpy = jest.spyOn(authService, 'login');

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    expect(router.getPathname()).toBe('/');

    expect(screen.getByText('Mobile Boilerplate')).toBeOnTheScreen();
    expect(screen.getByText('Welcome')).toBeOnTheScreen();
    expect(screen.getByText(/Experience seamless, passwordless login/i)).toBeOnTheScreen();

    const getStartedButton = screen.getByRole('button', { name: 'Get started' });
    expect(getStartedButton).toBeOnTheScreen();

    await user.press(getStartedButton);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalled();
    });
  });

  it('renders quick sign-in state when biometric authentication is enabled', async () => {
    const user = userEvent.setup();

    await testPersistence.setBiometricsOptedIn(true);
    await testPersistence.saveBiometricSession({
      refreshToken: 'mock_saved_refresh_token',
    });

    jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      biometricTypeLabel: 'Face ID',
    });
    const authenticateSpy = jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
      success: true,
    });
    const refreshSpy = jest.spyOn(authService, 'refreshSession');

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    // Wait for auth initialization
    expect(await screen.findByText('Quick Sign-In')).toBeOnTheScreen();

    expect(screen.getByRole('button', { name: /Log in with/i })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign in with another account' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove saved credentials' })).toBeOnTheScreen();

    // Trigger biometric login via userEvent
    await user.press(screen.getByRole('button', { name: /Log in with/i }));

    await waitFor(() => {
      expect(authenticateSpy).toHaveBeenCalled();
    });
    expect(refreshSpy).toHaveBeenCalledWith('mock_saved_refresh_token');
  });

  it('triggers interactive login when "Sign in with another account" is pressed', async () => {
    const user = userEvent.setup();
    const loginSpy = jest.spyOn(authService, 'login');

    await testPersistence.setBiometricsOptedIn(true);
    await testPersistence.saveBiometricSession({
      refreshToken: 'mock_saved_refresh_token',
    });

    jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      biometricTypeLabel: 'Face ID',
    });

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    expect(await screen.findByText('Quick Sign-In')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Sign in with another account' }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalled();
    });
  });

  it('allows removing saved credentials via userEvent', async () => {
    const user = userEvent.setup();

    await testPersistence.setBiometricsOptedIn(true);
    await testPersistence.saveBiometricSession({
      refreshToken: 'mock_saved_refresh_token',
    });

    jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      biometricTypeLabel: 'Touch ID',
    });

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    expect(await screen.findByText('Quick Sign-In')).toBeOnTheScreen();

    const removeButton = screen.getByRole('button', { name: 'Remove saved credentials' });
    await user.press(removeButton);

    // After removing credentials, screen reverts to the first login screen
    expect(await screen.findByText('Welcome')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeOnTheScreen();
  });

  it('displays error message when login encounters a failure', async () => {
    const user = userEvent.setup();
    jest.spyOn(authService, 'login').mockRejectedValueOnce(new Error('Network connection timeout'));

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    await user.press(screen.getByRole('button', { name: 'Get started' }));

    expect(await screen.findByText('Network connection timeout')).toBeOnTheScreen();
  });

  it('displays error in biometric card when biometric login fails', async () => {
    const user = userEvent.setup();
    await testPersistence.setBiometricsOptedIn(true);
    await testPersistence.saveBiometricSession({
      refreshToken: 'mock_saved_refresh_token',
    });

    jest.spyOn(BiometricService, 'getCapabilities').mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      biometricTypeLabel: 'Touch ID',
    });
    jest.spyOn(BiometricService, 'authenticate').mockResolvedValue({
      success: false,
      error: 'Fingerprint not recognized',
    });

    const router = renderRouter(
      {
        index: LoginRoute,
      },
      { initialUrl: '/' }
    );
    await router;

    expect(await screen.findByText('Quick Sign-In')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Log in with/i }));

    expect(await screen.findByText('Fingerprint not recognized')).toBeOnTheScreen();
  });
});
