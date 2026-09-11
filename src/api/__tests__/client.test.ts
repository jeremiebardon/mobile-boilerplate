import { http, HttpResponse } from 'msw';

import { server } from '@/mocks/server';

import { apiClient } from '../client';


describe('apiClient with MSW', () => {
  it('intercepts and returns mock health response', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok' });
  });

  it('intercepts user endpoint data', async () => {
    const response = await apiClient.get('/users/me');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      id: 'usr_123',
      name: 'Test User',
      email: 'user@example.com',
    });
  });

  it('allows overriding response handlers per test and resets afterwards', async () => {
    server.use(
      http.get('https://api.example.com/users/me', () => {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      })
    );

    await expect(apiClient.get('/users/me')).rejects.toThrow();
  });
});
