import type React from 'react';

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
  type?: string;
  timestamp?: number;
}

export interface ObservabilityUser {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

export interface ObservabilityContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: SeverityLevel;
  fingerprint?: string[];
}

export interface SpanContext {
  name: string;
  op?: string;
  data?: Record<string, unknown>;
}

export interface ObservabilityConfig {
  dsn?: string;
  environment?: string;
  debug?: boolean;
  enabled?: boolean;
  sampleRate?: number;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error; resetError: () => void }) => React.ReactNode);
  onError?: (error: Error, componentStack: string) => void;
}
