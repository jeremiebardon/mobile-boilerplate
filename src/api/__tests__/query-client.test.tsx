/* eslint-disable @typescript-eslint/no-require-imports */
import { AppState, Platform, Text } from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import { render, screen } from '@testing-library/react-native';

import { queryClient } from '../query-client';
import { QueryProvider } from '../query-provider';

describe('queryClient & network/lifecycle synchronization', () => {
  it('synchronizes onlineManager with NetInfo listener in query-client module', () => {
    let capturedListener: any;
    jest.spyOn(NetInfo, 'addEventListener').mockImplementation((listener: any) => {
      capturedListener = listener;
      return jest.fn();
    });

    let setOnlineSpy: any;
    jest.isolateModules(() => {
      const rq = require('@tanstack/react-query');
      setOnlineSpy = jest.spyOn(rq.onlineManager, 'setOnline');
      require('../query-client');
    });

    expect(capturedListener).toBeDefined();

    capturedListener({ isConnected: true });
    expect(setOnlineSpy).toHaveBeenCalledWith(true);

    capturedListener({ isConnected: false });
    expect(setOnlineSpy).toHaveBeenCalledWith(false);

    capturedListener({ isConnected: null });
    expect(setOnlineSpy).toHaveBeenCalledWith(false);
  });

  it('synchronizes focusManager on AppState changes when platform is not web', () => {
    let appStateListener: (status: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((event: any, handler: any) => {
      appStateListener = handler;
      return { remove: jest.fn() } as any;
    });

    let focusSpy: any;
    jest.isolateModules(() => {
      const rq = require('@tanstack/react-query');
      focusSpy = jest.spyOn(rq.focusManager, 'setFocused');
      require('../query-client');
    });

    appStateListener('active');
    expect(focusSpy).toHaveBeenCalledWith(true);

    appStateListener('background');
    expect(focusSpy).toHaveBeenCalledWith(false);
  });

  it('does not synchronize focusManager on AppState changes if Platform.OS is web', () => {
    const originalPlatform = Platform.OS;
    Platform.OS = 'web';

    let appStateListener: (status: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((event: any, handler: any) => {
      appStateListener = handler;
      return { remove: jest.fn() } as any;
    });

    let focusSpy: any;
    jest.isolateModules(() => {
      const rq = require('@tanstack/react-query');
      focusSpy = jest.spyOn(rq.focusManager, 'setFocused');
      require('../query-client');
    });

    appStateListener('active');
    expect(focusSpy).not.toHaveBeenCalled();

    Platform.OS = originalPlatform;
  });

  describe('retry configuration function', () => {
    const retryFn = (queryClient.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: any
    ) => boolean);

    it('returns false for 401 error in response.status', () => {
      const error = { response: { status: 401 } };
      expect(retryFn(0, error)).toBe(false);
    });

    it('returns false for 403 error in response.status', () => {
      const error = { response: { status: 403 } };
      expect(retryFn(0, error)).toBe(false);
    });

    it('returns false for 401 error in error.status', () => {
      const error = { status: 401 };
      expect(retryFn(0, error)).toBe(false);
    });

    it('returns false for 403 error in error.status', () => {
      const error = { status: 403 };
      expect(retryFn(0, error)).toBe(false);
    });

    it('retries up to 2 times for transient errors', () => {
      const error = { response: { status: 500 } };
      expect(retryFn(0, error)).toBe(true);
      expect(retryFn(1, error)).toBe(true);
      expect(retryFn(2, error)).toBe(false);
      expect(retryFn(3, error)).toBe(false);
    });
  });

  describe('<QueryProvider />', () => {
    it('renders children wrapped with QueryClientProvider', async () => {
      await render(
        <QueryProvider>
          <Text>Child in Provider</Text>
        </QueryProvider>
      );

      expect(screen.getByText('Child in Provider')).toBeOnTheScreen();
    });
  });
});
