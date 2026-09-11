import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './query-client';

export interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * React Query Provider component wrapping the application tree.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
