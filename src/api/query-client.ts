import { AppState, AppStateStatus, Platform } from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

// Synchronize React Query's online status with NetInfo
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected));
  });
});

// Synchronize React Query's window focus with React Native AppState (active/background)
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

AppState.addEventListener('change', onAppStateChange);

/**
 * Global QueryClient instance with production-ready defaults for mobile.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        // Do not retry 401s or 403s — 401 token refresh is already handled
        // by the Axios interceptor. If it fails here, it is unrecoverable.
        const status = error?.response?.status ?? error?.status;
        if (status === 401 || status === 403) {
          return false;
        }

        // Retry other transient failures up to 2 times
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
