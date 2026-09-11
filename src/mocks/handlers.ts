import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health check endpoint
  http.get('https://api.example.com/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Sample user endpoint
  http.get('https://api.example.com/users/me', () => {
    return HttpResponse.json({
      id: 'usr_123',
      name: 'Test User',
      email: 'user@example.com',
    });
  }),
];
