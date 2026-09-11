import type { ErrorEvent, EventHint } from '@sentry/core';

/**
 * Status codes that represent expected client-side or business flow conditions,
 * NOT unexpected application errors or server failures.
 */
const IGNORED_HTTP_STATUSES = new Set([
  400, // Bad Request / Client validation
  401, // Unauthorized / Session expired (handled by 401 interceptor or login flow)
  403, // Forbidden / Access control
  404, // Not Found
  422, // Unprocessable Entity / Form validation
]);

/**
 * Known error names and codes that correspond to intentional user cancellations or query aborts.
 */
const IGNORED_ERROR_NAMES = new Set([
  'AbortError',
  'CanceledError',
]);

const IGNORED_ERROR_CODES = new Set([
  'ERR_CANCELED',
  'ECONNABORTED',
  'a0.session.user_cancelled',
  'USER_CANCELED',
  'BIOMETRIC_CANCELLED',
]);

const SENSITIVE_KEY_PATTERN = /(authorization|token|refreshtoken|accesstoken|password|secret|apikey|client_secret)/i;

/**
 * Extracts HTTP status code from an error or exception object if available.
 */
export function extractHttpStatus(error: any): number | undefined {
  if (!error) return undefined;

  // Axios error structure
  if (typeof error.response?.status === 'number') {
    return error.response.status;
  }

  // Generic status or statusCode property
  if (typeof error.status === 'number') {
    return error.status;
  }
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  return undefined;
}

/**
 * Determines whether an error/event should be reported to Sentry.
 * Returns true if the error should be sent, false if it should be dropped.
 */
export function shouldSendToSentry(
  event: ErrorEvent,
  hint?: EventHint
): boolean {
  const originalError = hint?.originalException as any;

  if (originalError) {
    // 1. Check HTTP status
    const status = extractHttpStatus(originalError);
    if (status && IGNORED_HTTP_STATUSES.has(status)) {
      return false;
    }

    // 2. Check error name
    if (originalError.name && IGNORED_ERROR_NAMES.has(originalError.name)) {
      return false;
    }

    // 3. Check error code
    const code = originalError.code || originalError.name;
    if (code && IGNORED_ERROR_CODES.has(code)) {
      return false;
    }

    // 4. Check message for cancellations or normal auth cancellations
    const message = (originalError.message || '').toLowerCase();
    if (
      message.includes('canceled') ||
      message.includes('cancelled') ||
      message.includes('aborted') ||
      message.includes('user cancelled') ||
      message.includes('user canceled') ||
      message.includes('biometric authentication was cancelled')
    ) {
      return false;
    }
  }

  // 5. Inspect event level or message if available
  if (event.message) {
    const lowerMessage = event.message.toLowerCase();
    if (
      lowerMessage.includes('request aborted') ||
      lowerMessage.includes('user cancelled')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes sensitive data (tokens, passwords, secrets) from breadcrumbs and event data.
 */
export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  // 1. Sanitize breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      if (!breadcrumb.data) return breadcrumb;

      const sanitizedData = { ...breadcrumb.data };
      for (const key of Object.keys(sanitizedData)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          sanitizedData[key] = '[REDACTED]';
        } else if (
          typeof sanitizedData[key] === 'string' &&
          sanitizedData[key].toLowerCase().startsWith('bearer ')
        ) {
          sanitizedData[key] = 'Bearer [REDACTED]';
        }
      }

      return {
        ...breadcrumb,
        data: sanitizedData,
      };
    });
  }

  // 2. Sanitize request headers / query params if present
  if (event.request?.headers) {
    const headers = { ...event.request.headers };
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        headers[key] = '[REDACTED]';
      }
    }
    event.request.headers = headers;
  }

  return event;
}

/**
 * Sentry beforeSend callback: Filters out unwanted errors and sanitizes sensitive data.
 */
export function beforeSend(
  event: ErrorEvent,
  hint: EventHint
): ErrorEvent | null {
  if (!shouldSendToSentry(event, hint)) {
    return null; // Dropped from Sentry
  }

  return sanitizeSentryEvent(event);
}
