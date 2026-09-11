/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { Button, Text, View } from 'react-native';

import * as Sentry from '@sentry/react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as ObsModule from '../index';

function ThrowingComponent({
  shouldThrow,
  message = 'Explosion in Component',
}: {
  shouldThrow: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <Text>Working Component</Text>;
}

describe('ObservabilityService', () => {
  const originalEnv = process.env;
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (globalThis as any).__DEV__ = true;
  });

  afterAll(() => {
    process.env = originalEnv;
    (globalThis as any).__DEV__ = originalDev;
  });

  describe('Dev Mode (Fallback without active Sentry) with __DEV__ = true', () => {
    let obs: typeof ObsModule.observability;

    beforeEach(() => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.isolateModules(() => {
        const mod = require('../observability.service');
        obs = mod.observability;
        obs.init({ enabled: false });
        // Call again to verify isInitialized early return
        obs.init({ enabled: false });
      });
      warnSpy.mockRestore();
    });

    it('captures exception returning dev event ID and logs to console.error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const eventId = obs.captureException(new Error('Dev error'), {
        tags: { env: 'test' },
        extra: { info: 123 },
        level: 'error',
      });

      expect(eventId).toMatch(/^dev-err-/);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('captures exception with undefined context', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const eventId = obs.captureException(new Error('Dev error without context'));
      expect(eventId).toMatch(/^dev-err-/);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('captures message across error, fatal, warning, and default info levels', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const id1 = obs.captureMessage('Fatal error message', 'fatal');
      expect(id1).toMatch(/^dev-msg-/);
      expect(consoleErrorSpy).toHaveBeenCalled();

      const id2 = obs.captureMessage('Error message', 'error');
      expect(id2).toMatch(/^dev-msg-/);
      expect(consoleErrorSpy).toHaveBeenCalled();

      const id3 = obs.captureMessage('Warning message', 'warning');
      expect(id3).toMatch(/^dev-msg-/);
      expect(consoleWarnSpy).toHaveBeenCalled();

      const id4 = obs.captureMessage('Info message (default level)');
      expect(id4).toMatch(/^dev-msg-/);
      expect(consoleLogSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('sets and clears user in dev mode', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      obs.setUser({ id: 'user_1', email: 'dev@example.com', username: 'dev' });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability] User set:'),
        expect.objectContaining({ id: 'user_1' })
      );

      obs.setUser(null);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability] User set:'),
        null
      );

      obs.clearUser();
      expect(logSpy).toHaveBeenCalledWith('[Observability] User cleared');

      logSpy.mockRestore();
    });

    it('adds breadcrumbs with default and custom categories', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      obs.addBreadcrumb({ message: 'Navigated to home' });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability:Breadcrumb] [app] Navigated to home'),
        ''
      );

      obs.addBreadcrumb({ category: 'network', message: 'API 200', data: { status: 200 } });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability:Breadcrumb] [network] API 200'),
        { status: 200 }
      );

      logSpy.mockRestore();
    });

    it('sets tags, extras, and context', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      obs.setTag('build', '1.0.0');
      expect(logSpy).toHaveBeenCalledWith('[Observability:Tag] build = 1.0.0');

      obs.setTags({ os: 'ios', arch: 'arm64' });
      expect(logSpy).toHaveBeenCalledWith('[Observability:Tags]', { os: 'ios', arch: 'arm64' });

      obs.setExtra('sessionLength', 42);
      expect(logSpy).toHaveBeenCalledWith('[Observability:Extra] sessionLength:', 42);

      obs.setContext('deviceInfo', { model: 'iPhone 15' });
      expect(logSpy).toHaveBeenCalledWith('[Observability:Context] deviceInfo:', { model: 'iPhone 15' });

      logSpy.mockRestore();
    });

    it('starts span, executes callback, and returns result with and without op', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await obs.startSpan({ name: 'load_feed', op: 'http.client' }, async () => {
        return 'feed_data';
      });

      expect(result).toBe('feed_data');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability:Span:Start] load_feed (http.client)')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability:Span:End] load_feed')
      );

      const res2 = await obs.startSpan({ name: 'custom_span' }, () => 'sync_data');
      expect(res2).toBe('sync_data');

      logSpy.mockRestore();
    });

    it('calls appLoaded and wrap in dev mode', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      obs.appLoaded();
      expect(logSpy).toHaveBeenCalledWith('[Observability] Application loaded');

      const Component = () => <Text>Test</Text>;
      expect(obs.wrap(Component)).toBe(Component);

      logSpy.mockRestore();
    });

    it('renders DevErrorBoundary with children, static fallback, function fallback with reset, and undefined fallback', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onErrorMock = jest.fn();

      // 1. Normal render without errors
      const { rerender } = await render(
        <obs.ErrorBoundary fallback={<Text>Static Fallback</Text>} onError={onErrorMock}>
          <ThrowingComponent shouldThrow={false} />
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Working Component')).toBeOnTheScreen();

      // 2. Render with error and static fallback node
      await rerender(
        <obs.ErrorBoundary fallback={<Text>Static Fallback</Text>} onError={onErrorMock}>
          <ThrowingComponent shouldThrow={true} />
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Static Fallback')).toBeOnTheScreen();
      expect(onErrorMock).toHaveBeenCalled();

      // 3. Render with fallback function providing resetError
      await rerender(
        <obs.ErrorBoundary
          fallback={({ error, resetError }) => (
            <View>
              <Text>Error caught: {error.message}</Text>
              <Button title="Try Again" onPress={resetError} />
            </View>
          )}
        >
          <ThrowingComponent shouldThrow={true} />
        </obs.ErrorBoundary>
      );

      expect(screen.getByText('Error caught: Explosion in Component')).toBeOnTheScreen();
      const tryAgainBtn = screen.getByRole('button', { name: 'Try Again' });
      await user.press(tryAgainBtn);

      // 4. Render with undefined fallback when error occurs (should fall back to children)
      await rerender(
        <obs.ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Working Component')).toBeOnTheScreen();

      consoleErrorSpy.mockRestore();
    });

    it('DevErrorBoundary handles error when onError is undefined and when componentStack is undefined', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onErrorMock = jest.fn();
      jest.isolateModules(() => {
        const { DevErrorBoundary } = require('../observability.service');
        const boundaryWithoutOnError = new DevErrorBoundary({ children: null });
        expect(() => {
          boundaryWithoutOnError.componentDidCatch(new Error('No handler error'), { componentStack: 'stack' });
        }).not.toThrow();

        const boundaryWithOnError = new DevErrorBoundary({ children: null, onError: onErrorMock });
        boundaryWithOnError.componentDidCatch(new Error('Stackless error'), { componentStack: undefined as any });
        expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error), '');
      });
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Non-DEV Mode (__DEV__ = false)', () => {
    let obs: typeof ObsModule.observability;

    beforeEach(() => {
      (globalThis as any).__DEV__ = false;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.isolateModules(() => {
        const mod = require('../observability.service');
        obs = mod.observability;
        obs.init({ enabled: false });
      });
      warnSpy.mockRestore();
    });

    it('executes fallback paths without throwing when console logging is skipped in production fallback', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      obs.captureException(new Error('Prod fallback error'));
      obs.captureMessage('Prod fallback message', 'error');
      obs.setUser({ id: 'u1' });
      obs.clearUser();
      obs.addBreadcrumb({ message: 'Prod breadcrumb' });
      obs.setTag('k', 'v');
      obs.setTags({ k: 'v' });
      obs.setExtra('x', 1);
      obs.setContext('ctx', { a: 1 });
      const spanRes = await obs.startSpan({ name: 'span_prod' }, () => 'ok');
      expect(spanRes).toBe('ok');
      obs.appLoaded();

      // Ensure console methods were NOT called because __DEV__ is false
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleErrSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('DevErrorBoundary componentDidCatch skips console logging when __DEV__ = false', () => {
      const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onErrorMock = jest.fn();

      jest.isolateModules(() => {
        const { DevErrorBoundary } = require('../observability.service');
        const boundary = new DevErrorBoundary({ children: null, onError: onErrorMock });
        boundary.componentDidCatch(new Error('Dev error'), { componentStack: 'stack trace' });
        expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error), 'stack trace');
        expect(consoleErrSpy).not.toHaveBeenCalled();
      });

      consoleErrSpy.mockRestore();
    });
  });

  describe('init configuration matrix', () => {
    it('initializes from process.env.EXPO_PUBLIC_SENTRY_DSN when config is empty', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://env-dsn@sentry.io/999';
      process.env.EXPO_PUBLIC_ENV = 'staging';

      jest.isolateModules(() => {
        const mod = require('../observability.service');
        mod.observability.init();
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://env-dsn@sentry.io/999',
          environment: 'staging',
          debug: false,
          tracesSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        })
      );
    });

    it('defaults environment to production when __DEV__ is false and EXPO_PUBLIC_ENV is not set', () => {
      (globalThis as any).__DEV__ = false;
      delete process.env.EXPO_PUBLIC_ENV;

      jest.isolateModules(() => {
        const mod = require('../observability.service');
        mod.observability.init({
          dsn: 'https://prod-dsn@sentry.io/888',
        });
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
          tracesSampleRate: 0.2, // 0.2 for production default
        })
      );
    });

    it('defaults environment to development when __DEV__ is true and EXPO_PUBLIC_ENV is not set', () => {
      (globalThis as any).__DEV__ = true;
      delete process.env.EXPO_PUBLIC_ENV;

      jest.isolateModules(() => {
        const mod = require('../observability.service');
        mod.observability.init({
          dsn: 'https://dev-dsn@sentry.io/777',
        });
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          tracesSampleRate: 1.0, // 1.0 for development default
        })
      );
    });

    it('uses custom tracesSampleRate, replays rates, and debug when provided', () => {
      jest.isolateModules(() => {
        const mod = require('../observability.service');
        mod.observability.init({
          dsn: 'https://custom-dsn@sentry.io/666',
          environment: 'test',
          debug: true,
          tracesSampleRate: 0.75,
          replaysSessionSampleRate: 0.25,
          replaysOnErrorSampleRate: 0.5,
        });
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          debug: true,
          tracesSampleRate: 0.75,
          replaysSessionSampleRate: 0.25,
          replaysOnErrorSampleRate: 0.5,
        })
      );
    });

    it('falls back to dev mode when dsn is missing', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      jest.isolateModules(() => {
        const mod = require('../observability.service');
        mod.observability.init({ enabled: true });
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Observability] DSN not configured')
      );
      warnSpy.mockRestore();
    });
  });

  describe('Active Sentry Mode', () => {
    let obs: typeof ObsModule.observability;

    beforeEach(() => {
      jest.isolateModules(() => {
        const mod = require('../observability.service');
        obs = mod.observability;
        obs.init({
          dsn: 'https://key@sentry.io/12345',
          environment: 'production',
        });
      });
    });

    it('delegates captureException with full context and empty context to Sentry', () => {
      const sentrySpy = jest.spyOn(Sentry, 'captureException').mockReturnValueOnce('sentry-evt-id');

      const id1 = obs.captureException(new Error('Sentry error'), {
        tags: { tag1: 'v1' },
        extra: { k: 'v' },
        level: 'warning',
        fingerprint: ['custom-fp'],
      });

      expect(id1).toBe('sentry-evt-id');
      expect(sentrySpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: { tag1: 'v1' }, level: 'warning' })
      );

      obs.captureException(new Error('Error without context'));
      expect(sentrySpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ tags: undefined, extra: undefined, level: undefined, fingerprint: undefined })
      );
    });

    it('delegates captureMessage to Sentry with and without optional params', () => {
      const sentrySpy = jest.spyOn(Sentry, 'captureMessage').mockReturnValueOnce('sentry-msg-id');

      const id = obs.captureMessage('Sentry test message', 'info', {
        tags: { t: '1' },
        extra: { e: '2' },
        fingerprint: ['fp'],
      });

      expect(id).toBe('sentry-msg-id');
      expect(sentrySpy).toHaveBeenCalledWith('Sentry test message', {
        level: 'info',
        tags: { t: '1' },
        extra: { e: '2' },
        fingerprint: ['fp'],
      });

      obs.captureMessage('Default level message');
      expect(sentrySpy).toHaveBeenCalledWith('Default level message', {
        level: 'info',
        tags: undefined,
        extra: undefined,
        fingerprint: undefined,
      });
    });

    it('delegates setUser and clearUser to Sentry', () => {
      const sentryUserSpy = jest.spyOn(Sentry, 'setUser');

      obs.setUser({ id: 'u123', email: 'user@test.com', username: 'user1', plan: 'pro' });
      expect(sentryUserSpy).toHaveBeenCalledWith({
        id: 'u123',
        email: 'user@test.com',
        username: 'user1',
        plan: 'pro',
      });

      obs.setUser(null);
      expect(sentryUserSpy).toHaveBeenCalledWith(null);

      obs.clearUser();
      expect(sentryUserSpy).toHaveBeenCalledWith(null);
    });

    it('delegates addBreadcrumb to Sentry with and without optional fields', () => {
      const sentryBreadcrumbSpy = jest.spyOn(Sentry, 'addBreadcrumb');

      obs.addBreadcrumb({
        category: 'navigation',
        message: 'Switched tabs',
        level: 'info',
        data: { tab: 'settings' },
        type: 'navigation',
        timestamp: 123456789,
      });

      expect(sentryBreadcrumbSpy).toHaveBeenCalledWith({
        category: 'navigation',
        message: 'Switched tabs',
        level: 'info',
        data: { tab: 'settings' },
        type: 'navigation',
        timestamp: 123456789,
      });
    });

    it('delegates tags, extras, and context to Sentry', () => {
      const setTagSpy = jest.spyOn(Sentry, 'setTag');
      const setTagsSpy = jest.spyOn(Sentry, 'setTags');
      const setExtraSpy = jest.spyOn(Sentry, 'setExtra');
      const setContextSpy = jest.spyOn(Sentry, 'setContext');

      obs.setTag('lang', 'fr');
      expect(setTagSpy).toHaveBeenCalledWith('lang', 'fr');

      obs.setTags({ a: '1', b: '2' });
      expect(setTagsSpy).toHaveBeenCalledWith({ a: '1', b: '2' });

      obs.setExtra('count', 10);
      expect(setExtraSpy).toHaveBeenCalledWith('count', 10);

      obs.setContext('ctx', { active: true });
      expect(setContextSpy).toHaveBeenCalledWith('ctx', { active: true });
    });

    it('delegates startSpan to Sentry', async () => {
      const sentrySpanSpy = jest.spyOn(Sentry, 'startSpan').mockImplementation(async (ctx, cb: any) => {
        return cb({ spanId: 'span-1' });
      });

      const res = await obs.startSpan({ name: 'api_call', op: 'http', data: { url: '/users' } }, (span) => {
        return span;
      });

      expect(res).toEqual({ spanId: 'span-1' });
      expect(sentrySpanSpy).toHaveBeenCalled();
    });

    it('delegates appLoaded and wrap to Sentry', () => {
      const appLoadedSpy = jest.spyOn(Sentry, 'appLoaded');
      obs.appLoaded();
      expect(appLoadedSpy).toHaveBeenCalled();

      const Component = () => <Text>Test</Text>;
      const wrapSpy = jest.spyOn(Sentry, 'wrap').mockReturnValue(Component as any);
      expect(obs.wrap(Component)).toBe(Component);
      expect(wrapSpy).toHaveBeenCalledWith(Component);
    });

    it('renders Sentry.ErrorBoundary in active mode with function fallback, ReactElement fallback, and undefined fallback', async () => {
      const onErrorMock = jest.fn();

      // Function fallback + onError
      await render(
        <obs.ErrorBoundary
          fallback={({ error }) => <Text>Active Error: {error.message}</Text>}
          onError={onErrorMock}
        >
          <Text>Inside Sentry ErrorBoundary</Text>
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Inside Sentry ErrorBoundary')).toBeOnTheScreen();
      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error), 'mock stack');

      // Static fallback without onError
      await render(
        <obs.ErrorBoundary fallback={<Text>Static Active Fallback</Text>}>
          <Text>Inside Static Fallback Boundary</Text>
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Inside Static Fallback Boundary')).toBeOnTheScreen();

      // Undefined fallback
      await render(
        <obs.ErrorBoundary>
          <Text>Inside Undefined Fallback Boundary</Text>
        </obs.ErrorBoundary>
      );
      expect(screen.getByText('Inside Undefined Fallback Boundary')).toBeOnTheScreen();
    });
  });

  describe('index barrel exports', () => {
    it('exports all observability methods and types', () => {
      expect(ObsModule.observability).toBeDefined();
      expect(ObsModule.beforeSend).toBeDefined();
      expect(ObsModule.shouldSendToSentry).toBeDefined();
      expect(ObsModule.sanitizeSentryEvent).toBeDefined();
    });
  });
});
