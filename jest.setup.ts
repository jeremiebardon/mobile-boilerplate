import './msw.polyfills';

import { setUpTests } from 'react-native-reanimated';

import { server } from '@/mocks/server';
import { resetTestStorage } from '@/test-utils/mocks';

process.env.EXPO_PUBLIC_STORAGE_PROVIDER = 'mock';

setUpTests();


beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any request handlers and storage entries that we may add during tests,
// so they don't affect other tests.
afterEach(async () => {
  server.resetHandlers();

  await resetTestStorage();
});

// Clean up after the tests are finished.
afterAll(() => {
  server.close();
});

