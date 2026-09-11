import * as ReactNative from 'react-native';

import { render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import * as AuthContextModule from '@/features/authentication/context/auth-context';
import { observability } from '@/services/observability';

import AppLayout from '../(app)/_layout';
import HomeScreen from '../(app)/index';
import WrappedApp, { App, RootNavigation } from '../_layout';
import LoginRoute from '../login';

function routes(rootLayout: React.ComponentType) {
  return {
    _layout: rootLayout,
    login: LoginRoute,
    '(app)/_layout': AppLayout,
    '(app)/index': HomeScreen,
  };
}

describe('Root _layout', () => {
  let mockUseAuth: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockUseAuth = jest.spyOn(AuthContextModule, 'useAuth');
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('RootNavigation', () => {
    it('renders loading indicator when isLoading is true', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      } as any);

      await render(<RootNavigation />);

      expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
      expect(screen.queryByText('Welcome')).not.toBeOnTheScreen();
      expect(screen.queryByText('Home')).not.toBeOnTheScreen();
    });

    it('hides splash screen, calls observability.appLoaded, and redirects to login when unauthenticated', async () => {
      const appLoadedSpy = jest.spyOn(observability, 'appLoaded').mockImplementation(() => {});
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const router = renderRouter(routes(RootNavigation), { initialUrl: '/' });
      await router;

      expect(router.getPathname()).toBe('/login');
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
      expect(appLoadedSpy).toHaveBeenCalled();
      expect(screen.getByText('Welcome')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Get started' })).toBeOnTheScreen();
      expect(screen.queryByText('Home')).not.toBeOnTheScreen();

      appLoadedSpy.mockRestore();
    });

    it('renders the (app) tab group and BiometricOptInModal when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        showBiometricOptIn: false,
        biometricLabel: 'Face ID',
        enableBiometrics: jest.fn(),
        dismissBiometricOptIn: jest.fn(),
      } as any);

      const router = renderRouter(routes(RootNavigation), { initialUrl: '/' });
      await router;

      expect(router.getPathname()).toBe('/');
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
      expect(screen.getByText('Home')).toBeOnTheScreen();
      expect(screen.queryByText('Welcome')).not.toBeOnTheScreen();
    });

    it('handles SplashScreen.hideAsync rejection and undefined appLoaded gracefully', async () => {
      jest.spyOn(SplashScreen, 'hideAsync').mockRejectedValueOnce(new Error('Hide error'));
      const originalAppLoaded = observability.appLoaded;
      (observability as any).appLoaded = undefined;

      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const router = renderRouter(routes(RootNavigation), { initialUrl: '/' });
      await expect(router).resolves.not.toThrow();
      expect(await screen.findByText('Welcome')).toBeOnTheScreen();

      (observability as any).appLoaded = originalAppLoaded;
    });
  });

  describe('App component and ThemeProvider', () => {
    it('renders with dark theme when useColorScheme returns dark', async () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const router = renderRouter(routes(App), { initialUrl: '/' });
      await router;

      expect(screen.getByText('Welcome')).toBeOnTheScreen();
    });

    it('renders with default light theme when useColorScheme returns light', async () => {
      jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const router = renderRouter(routes(App), { initialUrl: '/' });
      await router;

      expect(screen.getByText('Welcome')).toBeOnTheScreen();
    });

    it('renders wrapped default export', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const router = renderRouter(routes(WrappedApp), { initialUrl: '/' });
      await router;

      expect(screen.getByText('Welcome')).toBeOnTheScreen();
    });
  });

  describe('Real Expo Router navigation', () => {
    it('mounts root layout and (app) index route using renderRouter', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        showBiometricOptIn: false,
        biometricLabel: 'Face ID',
        enableBiometrics: jest.fn(),
        dismissBiometricOptIn: jest.fn(),
      } as any);

      const router = renderRouter(routes(WrappedApp), { initialUrl: '/' });
      await router;

      expect(router.getPathname()).toBe('/');
      expect(screen.getByText('Home')).toBeOnTheScreen();
    });
  });
});
