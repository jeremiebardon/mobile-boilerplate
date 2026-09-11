import React, { Component, ErrorInfo, ReactNode } from 'react';

import * as Sentry from '@sentry/react-native';

import {
  Breadcrumb,
  ErrorBoundaryProps,
  ObservabilityConfig,
  ObservabilityContext,
  ObservabilityUser,
  SeverityLevel,
  SpanContext,
} from './observability.types';
import { beforeSend } from './sentry-error-filter';

interface DevErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class DevErrorBoundary extends Component<ErrorBoundaryProps, DevErrorBoundaryState> {
  state: DevErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): DevErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('[Observability:ErrorBoundary] Uncaught component error:', error, errorInfo.componentStack);
    }
    this.props.onError?.(error, errorInfo.componentStack ?? '');
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.resetError,
        });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
    }

    return this.props.children;
  }
}

let isInitialized = false;
let isSentryActive = false;

export function init(config?: ObservabilityConfig): void {
  if (isInitialized) {
    return;
  }

  const dsn = config?.dsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN;
  const isEnabled = config?.enabled ?? Boolean(dsn);

  if (!isEnabled || !dsn) {
    if (__DEV__) {
      console.warn('[Observability] DSN not configured or observability disabled. Using development console fallback.');
    }
    isSentryActive = false;
    isInitialized = true;
    return;
  }

  const environment =
    config?.environment ??
    process.env.EXPO_PUBLIC_ENV ??
    (__DEV__ ? 'development' : 'production');

  Sentry.init({
    dsn,
    environment,
    debug: config?.debug ?? false,
    tracesSampleRate: config?.tracesSampleRate ?? (environment === 'production' ? 0.2 : 1.0),
    replaysSessionSampleRate: config?.replaysSessionSampleRate ?? 0.1,
    replaysOnErrorSampleRate: config?.replaysOnErrorSampleRate ?? 1.0,
    beforeSend,
    integrations: [
      Sentry.mobileReplayIntegration(),
      Sentry.expoRouterIntegration(),
    ],
  });

  isSentryActive = true;
  isInitialized = true;
}

export function captureException(error: unknown, context?: ObservabilityContext): string | undefined {
  if (isSentryActive) {
    return Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
      fingerprint: context?.fingerprint,
    });
  }

  const eventId = `dev-err-${Date.now()}`;

  if (__DEV__) {
    console.error(`[Observability:Exception] [${eventId}]`, error, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
    });
  }

  return eventId;
}

export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: ObservabilityContext
): string | undefined {
  if (isSentryActive) {
    return Sentry.captureMessage(message, {
      level,
      tags: context?.tags,
      extra: context?.extra,
      fingerprint: context?.fingerprint,
    });
  }

  const eventId = `dev-msg-${Date.now()}`;
  if (__DEV__) {
    const logger = level === 'error' || level === 'fatal' ? console.error : level === 'warning' ? console.warn : console.log;
    logger(`[Observability:${level.toUpperCase()}] [${eventId}] ${message}`, {
      tags: context?.tags,
      extra: context?.extra,
    });
  }
  return eventId;
}

export function setUser(user: ObservabilityUser | null): void {
  if (isSentryActive) {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    const { id, email, username, ...extra } = user;
    Sentry.setUser({
      id,
      email,
      username,
      ...extra,
    });
    return;
  }

  if (__DEV__) {
    console.log('[Observability] User set:', user);
  }
}

export function clearUser(): void {
  if (isSentryActive) {
    Sentry.setUser(null);
    return;
  }

  if (__DEV__) {
    console.log('[Observability] User cleared');
  }
}

export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  if (isSentryActive) {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      category: breadcrumb.category,
      level: breadcrumb.level,
      data: breadcrumb.data,
      type: breadcrumb.type,
      timestamp: breadcrumb.timestamp,
    });
    return;
  }

  if (__DEV__) {
    console.log(
      `[Observability:Breadcrumb] [${breadcrumb.category ?? 'app'}] ${breadcrumb.message}`,
      breadcrumb.data ?? ''
    );
  }
}

export function setTag(key: string, value: string): void {
  if (isSentryActive) {
    Sentry.setTag(key, value);
    return;
  }

  if (__DEV__) {
    console.log(`[Observability:Tag] ${key} = ${value}`);
  }
}

export function setTags(tags: Record<string, string>): void {
  if (isSentryActive) {
    Sentry.setTags(tags);
    return;
  }

  if (__DEV__) {
    console.log('[Observability:Tags]', tags);
  }
}

export function setExtra(key: string, extra: unknown): void {
  if (isSentryActive) {
    Sentry.setExtra(key, extra);
    return;
  }

  if (__DEV__) {
    console.log(`[Observability:Extra] ${key}:`, extra);
  }
}

export function setContext(name: string, context: Record<string, unknown> | null): void {
  if (isSentryActive) {
    Sentry.setContext(name, context);
    return;
  }

  if (__DEV__) {
    console.log(`[Observability:Context] ${name}:`, context);
  }
}

export async function startSpan<T>(
  context: SpanContext,
  callback: (span?: unknown) => T | Promise<T>
): Promise<T> {
  if (isSentryActive) {
    return Sentry.startSpan(
      {
        name: context.name,
        op: context.op,
        attributes: context.data as Record<string, any>,
      },
      callback
    );
  }

  if (__DEV__) {
    console.log(`[Observability:Span:Start] ${context.name} (${context.op ?? 'custom'})`);
  }
  const result = await callback();
  if (__DEV__) {
    console.log(`[Observability:Span:End] ${context.name}`);
  }
  return result;
}

export function appLoaded(): void {
  if (isSentryActive) {
    Sentry.appLoaded();
    return;
  }

  if (__DEV__) {
    console.log('[Observability] Application loaded');
  }
}

export function wrap<P extends Record<string, unknown>>(component: React.ComponentType<P>): React.ComponentType<P> {
  if (isSentryActive) {
    return Sentry.wrap(component);
  }
  return component;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
}) => {
  if (isSentryActive) {
    return (
      <Sentry.ErrorBoundary
        fallback={
          typeof fallback === 'function'
            ? (props) => fallback({ error: props.error as Error, resetError: props.resetError }) as React.ReactElement
            : (fallback as React.ReactElement | undefined)
        }
        onError={(error, componentStack) => {
          onError?.(error as Error, componentStack);
        }}
      >
        {children}
      </Sentry.ErrorBoundary>
    );
  }

  return (
    <DevErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </DevErrorBoundary>
  );
};

export const observability = {
  init,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setTags,
  setExtra,
  setContext,
  startSpan,
  appLoaded,
  wrap,
  ErrorBoundary,
};
