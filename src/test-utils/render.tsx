import React, { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';

/**
 * Creates a fresh, isolated QueryClient instance configured for unit tests.
 * Retries are disabled to prevent slow test execution on failed requests.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps the component tree with necessary providers
 * (e.g. TanStack QueryClientProvider) configured for an isolated test environment.
 * In RNTL v14 (React 19), render is asynchronous and must be awaited.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  const renderResult = await render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    queryClient,
    ...renderResult,
  };
}

// Re-export testing-library utilities with our custom render as default
export * from '@testing-library/react-native';
export { renderWithProviders as render };
