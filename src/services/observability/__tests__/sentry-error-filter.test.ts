import { beforeSend, extractHttpStatus, sanitizeSentryEvent, shouldSendToSentry } from '../sentry-error-filter';

import type { ErrorEvent, EventHint } from '@sentry/core';

describe('sentry-error-filter', () => {
  describe('extractHttpStatus', () => {
    it('returns undefined for null or undefined error', () => {
      expect(extractHttpStatus(null)).toBeUndefined();
      expect(extractHttpStatus(undefined)).toBeUndefined();
      expect(extractHttpStatus({})).toBeUndefined();
      expect(extractHttpStatus({ response: null })).toBeUndefined();
    });
  });

  describe('shouldSendToSentry', () => {
    it('handles null/undefined originalException and null error gracefully', () => {
      expect(shouldSendToSentry({} as ErrorEvent)).toBe(true);
      expect(shouldSendToSentry({} as ErrorEvent, { originalException: null } as EventHint)).toBe(true);
      expect(shouldSendToSentry({} as ErrorEvent, { originalException: undefined } as EventHint)).toBe(true);
    });

    it('returns false for ignored HTTP status codes', () => {
      const ignoredStatuses = [400, 401, 403, 404, 422];

      for (const status of ignoredStatuses) {
        // Via error.response.status (Axios)
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { response: { status } },
          } as EventHint)
        ).toBe(false);

        // Via error.status
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { status },
          } as EventHint)
        ).toBe(false);

        // Via error.statusCode
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { statusCode: status },
          } as EventHint)
        ).toBe(false);
      }
    });

    it('returns false for ignored error names', () => {
      const ignoredNames = ['AbortError', 'CanceledError'];

      for (const name of ignoredNames) {
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { name },
          } as EventHint)
        ).toBe(false);
      }
    });

    it('returns false for ignored error codes and code fallback to name', () => {
      const ignoredCodes = [
        'ERR_CANCELED',
        'ECONNABORTED',
        'a0.session.user_cancelled',
        'USER_CANCELED',
        'BIOMETRIC_CANCELLED',
      ];

      for (const code of ignoredCodes) {
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { code },
          } as EventHint)
        ).toBe(false);

        // Code fallback to name
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { name: code },
          } as EventHint)
        ).toBe(false);
      }
    });

    it('returns false for cancellation phrases in error message', () => {
      const messages = [
        'Request was canceled by user',
        'Operation cancelled',
        'Fetch request aborted',
        'The user cancelled the operation',
        'User canceled dialog',
        'Biometric authentication was cancelled',
      ];

      for (const message of messages) {
        expect(
          shouldSendToSentry({} as ErrorEvent, {
            originalException: { message },
          } as EventHint)
        ).toBe(false);
      }
    });

    it('returns false for cancellation in event message when hint is absent', () => {
      expect(shouldSendToSentry({ message: 'Request aborted by client' } as ErrorEvent)).toBe(false);
      expect(shouldSendToSentry({ message: 'User cancelled authentication' } as ErrorEvent)).toBe(false);
    });

    it('returns true for legitimate application exceptions', () => {
      const legitimateError = new Error('Database connection failed');
      expect(
        shouldSendToSentry({} as ErrorEvent, {
          originalException: legitimateError,
        } as EventHint)
      ).toBe(true);

      const server500Error = { response: { status: 500 } };
      expect(
        shouldSendToSentry({} as ErrorEvent, {
          originalException: server500Error,
        } as EventHint)
      ).toBe(true);

      expect(shouldSendToSentry({ message: 'Unexpected null pointer' } as ErrorEvent)).toBe(true);
    });
  });

  describe('sanitizeSentryEvent', () => {
    it('redacts sensitive keys and Bearer tokens in breadcrumbs data', () => {
      const event: ErrorEvent = {
        type: undefined,
        breadcrumbs: [
          {
            message: 'API call',
            data: {
              authorization: 'SecretToken123',
              accessToken: 'xyz',
              refreshToken: 'abc',
              password: 'mypassword',
              apiKey: 'key_123',
              customHeader: 'Bearer my_jwt_token',
              safeKey: 'regular_value',
            },
          },
          {
            message: 'Breadcrumb without data',
          },
        ],
      };

      const sanitized = sanitizeSentryEvent(event);
      const data = sanitized.breadcrumbs?.[0].data;

      expect(data?.authorization).toBe('[REDACTED]');
      expect(data?.accessToken).toBe('[REDACTED]');
      expect(data?.refreshToken).toBe('[REDACTED]');
      expect(data?.password).toBe('[REDACTED]');
      expect(data?.apiKey).toBe('[REDACTED]');
      expect(data?.customHeader).toBe('Bearer [REDACTED]');
      expect(data?.safeKey).toBe('regular_value');
    });

    it('redacts sensitive keys in request headers', () => {
      const event: ErrorEvent = {
        type: undefined,
        request: {
          headers: {
            Authorization: 'Bearer super_secret',
            'client_secret': 'shhhh',
            'Content-Type': 'application/json',
          },
        },
      };

      const sanitized = sanitizeSentryEvent(event);
      const headers = sanitized.request?.headers;

      expect(headers?.Authorization).toBe('[REDACTED]');
      expect(headers?.client_secret).toBe('[REDACTED]');
      expect(headers?.['Content-Type']).toBe('application/json');
    });

    it('handles event without breadcrumbs and without request headers gracefully', () => {
      const event: ErrorEvent = { type: undefined };
      const sanitized = sanitizeSentryEvent(event);
      expect(sanitized).toEqual({ type: undefined });
    });
  });

  describe('beforeSend', () => {
    it('drops unwanted event by returning null', () => {
      const result = beforeSend(
        {} as ErrorEvent,
        { originalException: { response: { status: 401 } } } as EventHint
      );
      expect(result).toBeNull();
    });

    it('sanitizes and returns valid event', () => {
      const event: ErrorEvent = {
        type: undefined,
        breadcrumbs: [
          {
            data: { token: 'secret_token' },
          },
        ],
      };

      const result = beforeSend(
        event,
        { originalException: new Error('Critical failure') } as EventHint
      );

      expect(result).not.toBeNull();
      expect(result?.breadcrumbs?.[0].data?.token).toBe('[REDACTED]');
    });
  });
});
