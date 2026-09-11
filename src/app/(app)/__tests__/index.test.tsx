import { Alert } from 'react-native';

import { fireEvent, userEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import * as AuthContextModule from '@/features/authentication/context/auth-context';
import { observability } from '@/services/observability';

import HomeScreen from '../index';

describe('HomeScreen (app/index.tsx)', () => {
  let mockAuth: any;
  let mockUseAuth: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockAuth = {
      biometricLabel: 'Face ID',
      isBiometricsAvailable: true,
      isBiometricsEnabled: false,
      enableBiometrics: jest.fn().mockResolvedValue(true),
      disableBiometrics: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      forgetSavedAccount: jest.fn().mockResolvedValue(undefined),
    };

    mockUseAuth = jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders overview, status card, and handles toggle enable biometrics via Expo Router', async () => {
    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    expect(router.getPathname()).toBe('/');
    expect(screen.getByText('Account Overview')).toBeOnTheScreen();
    expect(screen.getByText('Active Session')).toBeOnTheScreen();
    expect(screen.getByText('Face ID Quick Sign-In')).toBeOnTheScreen();
    expect(screen.getByText('Clears active session')).toBeOnTheScreen();

    // Toggle biometrics switch from false to true
    const switchEl = screen.getByRole('switch');
    await fireEvent(switchEl, 'valueChange', true);

    expect(mockAuth.enableBiometrics).toHaveBeenCalled();
  });

  it('handles toggle disable biometrics and shows biometrics-enabled subtext', async () => {
    mockUseAuth.mockReturnValue({
      ...mockAuth,
      isBiometricsEnabled: true,
    });

    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    expect(
      screen.getByText('Keeps biometric token in SecureStore to reconnect without password')
    ).toBeOnTheScreen();

    // Toggle biometrics switch from true to false
    const switchEl = screen.getByRole('switch');
    await fireEvent(switchEl, 'valueChange', false);

    expect(mockAuth.disableBiometrics).toHaveBeenCalled();
  });

  it('displays warning box when biometrics is unavailable on device', async () => {
    mockUseAuth.mockReturnValue({
      ...mockAuth,
      isBiometricsAvailable: false,
    });

    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    expect(
      screen.getByText('Biometric hardware or enrollment is not available on this device.')
    ).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('triggers Sentry diagnostic error and displays alert with event ID', async () => {
    const user = userEvent.setup();
    const breadcrumbSpy = jest.spyOn(observability, 'addBreadcrumb').mockImplementation(() => {});
    const captureExceptionSpy = jest
      .spyOn(observability, 'captureException')
      .mockReturnValue('test-event-id-999');

    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    const testBtn = screen.getByRole('button', { name: 'Send Test Sentry Event' });
    await user.press(testBtn);

    expect(breadcrumbSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'diagnostics',
        message: 'Diagnostic test event triggered by user',
      })
    );
    expect(captureExceptionSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sentry Event Sent',
      expect.stringContaining('Event ID: test-event-id-999')
    );

    breadcrumbSpy.mockRestore();
    captureExceptionSpy.mockRestore();
  });

  it('triggers Sentry diagnostic alert without event ID when captureException returns undefined', async () => {
    const user = userEvent.setup();
    jest.spyOn(observability, 'addBreadcrumb').mockImplementation(() => {});
    jest.spyOn(observability, 'captureException').mockReturnValue(undefined);

    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    const testBtn = screen.getByRole('button', { name: 'Send Test Sentry Event' });
    await user.press(testBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Sentry Event Sent',
      'Diagnostic error captured successfully!'
    );
  });

  it('invokes logout when logout button is pressed', async () => {
    const user = userEvent.setup();
    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    const logoutBtn = screen.getByRole('button', { name: /Log Out/i });
    await user.press(logoutBtn);

    expect(mockAuth.logout).toHaveBeenCalled();
  });

  it('invokes forgetSavedAccount when forget account button is pressed', async () => {
    const user = userEvent.setup();
    const router = renderRouter({ index: HomeScreen }, { initialUrl: '/' });
    await router;

    const forgetBtn = screen.getByRole('button', { name: 'Forget Account & Clear SecureStore' });
    await user.press(forgetBtn);

    expect(mockAuth.forgetSavedAccount).toHaveBeenCalled();
  });
});
