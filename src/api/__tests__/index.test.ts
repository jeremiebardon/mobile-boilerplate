import * as Api from '../index';

describe('api barrel exports', () => {
  it('exports apiClient and setupInterceptors', () => {
    expect(Api.apiClient).toBeDefined();
    expect(typeof Api.setupInterceptors).toBe('function');
  });

  it('exports queryClient and QueryProvider', () => {
    expect(Api.queryClient).toBeDefined();
    expect(typeof Api.QueryProvider).toBe('function');
  });
});
