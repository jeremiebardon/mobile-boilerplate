export const mockSentry = {
  init: jest.fn(),
  wrap: jest.fn((component: any) => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setTags: jest.fn(),
  setExtra: jest.fn(),
  setContext: jest.fn(),
  startSpan: jest.fn(async (_ctx: any, cb: any) => cb()),
  appLoaded: jest.fn(),
  mobileReplayIntegration: jest.fn(),
  expoRouterIntegration: jest.fn(),
  ErrorBoundary: jest.fn(({ children, fallback, onError }: any) => {
    if (typeof fallback === 'function') {
      fallback({ error: new Error('mock error'), resetError: jest.fn() });
    }
    if (typeof onError === 'function') {
      onError(new Error('mock error'), 'mock stack');
    }
    return children;
  }),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
};

jest.mock('@sentry/react-native', () => mockSentry);
