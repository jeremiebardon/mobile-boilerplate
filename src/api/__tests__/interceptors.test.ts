import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, create } from 'axios';

import { sessionCoordinator } from '@/services/session';

import { CustomRequestConfig, setupInterceptors } from '../interceptors';

describe('setupInterceptors', () => {
  let client: AxiosInstance;
  let requestInterceptorSuccess: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>;
  let requestInterceptorError: (error: any) => Promise<any>;
  let responseInterceptorSuccess: (response: any) => any;
  let responseInterceptorError: (error: AxiosError) => Promise<any>;

  beforeEach(() => {
    client = create();
    const requestUseSpy = jest.spyOn(client.interceptors.request, 'use');
    const responseUseSpy = jest.spyOn(client.interceptors.response, 'use');

    setupInterceptors(client);

    requestInterceptorSuccess = requestUseSpy.mock.calls[0][0] as any;
    requestInterceptorError = requestUseSpy.mock.calls[0][1] as any;
    responseInterceptorSuccess = responseUseSpy.mock.calls[0][0] as any;
    responseInterceptorError = responseUseSpy.mock.calls[0][1] as any;
  });

  describe('request interceptor', () => {
    it('attaches bearer token using headers.set when available', async () => {
      jest.spyOn(sessionCoordinator, 'getValidToken').mockResolvedValueOnce('mock_token_123');
      const setMock = jest.fn();
      const config = {
        headers: {
          get: jest.fn().mockReturnValue(undefined),
          set: setMock,
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = await requestInterceptorSuccess(config);

      expect(setMock).toHaveBeenCalledWith('Authorization', 'Bearer mock_token_123');
      expect(result).toBe(config);
    });

    it('attaches bearer token directly when headers.set is not a function', async () => {
      jest.spyOn(sessionCoordinator, 'getValidToken').mockResolvedValueOnce('mock_token_456');
      const config = {
        headers: {},
      } as unknown as InternalAxiosRequestConfig;

      const result = await requestInterceptorSuccess(config);

      expect(result.headers.Authorization).toBe('Bearer mock_token_456');
    });

    it('does not overwrite existing authorization header via headers.get', async () => {
      jest.spyOn(sessionCoordinator, 'getValidToken').mockResolvedValueOnce('mock_token_123');
      const config = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer existing'),
          set: jest.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      await requestInterceptorSuccess(config);

      expect(config.headers.set).not.toHaveBeenCalled();
    });

    it('does not overwrite existing authorization header property directly', async () => {
      jest.spyOn(sessionCoordinator, 'getValidToken').mockResolvedValueOnce('mock_token_123');
      const config = {
        headers: {
          Authorization: 'Bearer existing',
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = await requestInterceptorSuccess(config);

      expect(result.headers.Authorization).toBe('Bearer existing');
    });

    it('skips authorization header when getValidToken returns null', async () => {
      jest.spyOn(sessionCoordinator, 'getValidToken').mockResolvedValueOnce(null);
      const setMock = jest.fn();
      const config = {
        headers: {
          set: setMock,
        },
      } as unknown as InternalAxiosRequestConfig;

      await requestInterceptorSuccess(config);

      expect(setMock).not.toHaveBeenCalled();
    });

    it('rejects with error in request error interceptor', async () => {
      const err = new Error('Request configuration error');
      await expect(requestInterceptorError(err)).rejects.toThrow(err);
    });
  });

  describe('response interceptor', () => {
    it('passes through successful responses unchanged', () => {
      const response = { status: 200, data: { success: true } };
      expect(responseInterceptorSuccess(response)).toBe(response);
    });

    it('rejects immediately if error has no config', async () => {
      const error = {
        response: { status: 401 },
      } as unknown as AxiosError;

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('rejects immediately if error status is not 401', async () => {
      const error = {
        config: { headers: {} },
        response: { status: 500 },
      } as unknown as AxiosError;

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('rejects immediately if request has already been retried', async () => {
      const error = {
        config: { _retry: true, headers: {} } as CustomRequestConfig,
        response: { status: 401 },
      } as unknown as AxiosError;

      await expect(responseInterceptorError(error)).rejects.toBe(error);
    });

    it('rejects if handleUnauthorized returns null', async () => {
      jest.spyOn(sessionCoordinator, 'handleUnauthorized').mockResolvedValueOnce(null);
      const error = {
        config: { _retry: false, headers: {} } as CustomRequestConfig,
        response: { status: 401 },
      } as unknown as AxiosError;

      await expect(responseInterceptorError(error)).rejects.toBe(error);
      expect((error.config as CustomRequestConfig | undefined)?._retry).toBe(true);
    });

    it('retries request using headers.set when fresh token is acquired', async () => {
      jest.spyOn(sessionCoordinator, 'handleUnauthorized').mockResolvedValueOnce('new_access_token');
      const retryResponse = { status: 200, data: { refreshed: true } };
      const setMock = jest.fn();

      const originalRequest: CustomRequestConfig = {
        url: 'https://api.example.com/test',
        headers: {
          set: setMock,
        } as any,
      } as unknown as CustomRequestConfig;

      const error = {
        config: originalRequest,
        response: { status: 401 },
      } as unknown as AxiosError;

      const mockClientInstance = jest.fn().mockResolvedValueOnce(retryResponse) as unknown as AxiosInstance;
      mockClientInstance.interceptors = {
        request: { use: jest.fn() } as any,
        response: { use: jest.fn() } as any,
      };
      setupInterceptors(mockClientInstance);
      const respError = ((mockClientInstance.interceptors.response.use as jest.Mock).mock.calls[0][1] as any);

      const result = await respError(error);

      expect(setMock).toHaveBeenCalledWith('Authorization', 'Bearer new_access_token');
      expect(originalRequest._retry).toBe(true);
      expect(mockClientInstance).toHaveBeenCalledWith(originalRequest);
      expect(result).toBe(retryResponse);
    });

    it('retries request directly modifying headers.Authorization when set is not a function', async () => {
      jest.spyOn(sessionCoordinator, 'handleUnauthorized').mockResolvedValueOnce('new_access_token_direct');
      const retryResponse = { status: 200, data: { ok: true } };

      const originalRequest: CustomRequestConfig = {
        url: 'https://api.example.com/test',
        headers: {} as any,
      } as unknown as CustomRequestConfig;

      const error = {
        config: originalRequest,
        response: { status: 401 },
      } as unknown as AxiosError;

      const mockClientInstance = jest.fn().mockResolvedValueOnce(retryResponse) as unknown as AxiosInstance;
      mockClientInstance.interceptors = {
        request: { use: jest.fn() } as any,
        response: { use: jest.fn() } as any,
      };
      setupInterceptors(mockClientInstance);
      const respError = ((mockClientInstance.interceptors.response.use as jest.Mock).mock.calls[0][1] as any);

      const result = await respError(error);

      expect(originalRequest.headers.Authorization).toBe('Bearer new_access_token_direct');
      expect(originalRequest._retry).toBe(true);
      expect(mockClientInstance).toHaveBeenCalledWith(originalRequest);
      expect(result).toBe(retryResponse);
    });
  });
});
