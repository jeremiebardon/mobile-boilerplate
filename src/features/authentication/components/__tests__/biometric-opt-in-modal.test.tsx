import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '../../context/auth-context';
import { BiometricOptInModal } from '../biometric-opt-in-modal';

jest.mock('../../context/auth-context', () => ({
  useAuth: jest.fn(),
}));

describe('<BiometricOptInModal />', () => {
  const mockEnableBiometrics = jest.fn();
  const mockDismissBiometricOptIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when showBiometricOptIn is false', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      showBiometricOptIn: false,
      biometricLabel: 'Face ID',
      enableBiometrics: mockEnableBiometrics,
      dismissBiometricOptIn: mockDismissBiometricOptIn,
    });

    await render(<BiometricOptInModal />);

    expect(screen.queryByText('Enable Face ID?')).not.toBeOnTheScreen();
    expect(screen.toJSON()).toBeNull();
  });

  it('renders modal content and triggers enableBiometrics when primary button is pressed', async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({
      showBiometricOptIn: true,
      biometricLabel: 'Face ID',
      enableBiometrics: mockEnableBiometrics,
      dismissBiometricOptIn: mockDismissBiometricOptIn,
    });

    await render(<BiometricOptInModal />);

    expect(screen.getByText('Enable Face ID?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Sign in faster and securely next time using Face ID without having to re-enter your password.'
      )
    ).toBeOnTheScreen();

    const enableButton = screen.getByRole('button', { name: 'Enable Face ID' });
    await user.press(enableButton);

    expect(mockEnableBiometrics).toHaveBeenCalledTimes(1);
  });

  it('triggers dismissBiometricOptIn when "Not Now" secondary button is pressed', async () => {
    const user = userEvent.setup();
    (useAuth as jest.Mock).mockReturnValue({
      showBiometricOptIn: true,
      biometricLabel: 'Touch ID',
      enableBiometrics: mockEnableBiometrics,
      dismissBiometricOptIn: mockDismissBiometricOptIn,
    });

    await render(<BiometricOptInModal />);

    const notNowButton = screen.getByRole('button', { name: 'Not Now' });
    await user.press(notNowButton);

    expect(mockDismissBiometricOptIn).toHaveBeenCalledTimes(1);
  });

  it('triggers dismissBiometricOptIn when modal onRequestClose is called', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      showBiometricOptIn: true,
      biometricLabel: 'Face ID',
      enableBiometrics: mockEnableBiometrics,
      dismissBiometricOptIn: mockDismissBiometricOptIn,
    });

    await render(<BiometricOptInModal />);

    await fireEvent(screen.getByText('Enable Face ID?'), 'requestClose');

    expect(mockDismissBiometricOptIn).toHaveBeenCalledTimes(1);
  });
});
