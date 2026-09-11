import { AxiosInstance, AxiosRequestConfig, create } from 'axios';

import { setupInterceptors } from './interceptors';

/**
 * Default API configuration
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';
const TIMEOUT_MS = 30000;

export function createApiClient(configOverrides?: AxiosRequestConfig): AxiosInstance {
  const instance = create({
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...configOverrides,
  });

  // Attach mutex and token management interceptors
  setupInterceptors(instance);

  return instance;
}

/**
 * Global singleton API client instance for making HTTP requests.
 */
export const apiClient = createApiClient();
