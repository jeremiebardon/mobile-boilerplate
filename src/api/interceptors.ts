import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { sessionCoordinator } from '@/services/session';

export interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Configure request and response interceptors on the Axios instance using SessionCoordinator.
 */
export function setupInterceptors(client: AxiosInstance): void {
  // Request Interceptor: Attach a valid bearer token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const accessToken = await sessionCoordinator.getValidToken();

      if (accessToken && !config.headers.get?.('Authorization') && !config.headers.Authorization) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Reactively handle 401 Unauthorized via SessionCoordinator
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomRequestConfig | undefined;

      // Only handle 401 errors that have not already been retried
      if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const freshToken = await sessionCoordinator.handleUnauthorized();
      if (!freshToken) {
        return Promise.reject(error);
      }

      if (typeof originalRequest.headers.set === 'function') {
        originalRequest.headers.set('Authorization', `Bearer ${freshToken}`);
      } else {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
      }

      return client(originalRequest);
    }
  );
}
