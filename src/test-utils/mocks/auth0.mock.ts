export const mockAuth0Client = {
  webAuth: {
    authorize: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
    }),
    clearSession: jest.fn().mockResolvedValue(undefined),
  },
  auth: {
    userInfo: jest.fn().mockResolvedValue({
      sub: 'auth0|123',
      name: 'Test User',
      email: 'test@example.com',
    }),
    refreshToken: jest.fn().mockResolvedValue({
      accessToken: 'new-mock-access-token',
      idToken: 'new-mock-id-token',
    }),
  },
};

export const mockUseAuth0 = jest.fn(() => ({
  authorize: jest.fn(),
  clearSession: jest.fn(),
  user: null,
  error: null,
  isLoading: false,
}));

jest.mock('react-native-auth0', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockAuth0Client),
  useAuth0: mockUseAuth0,
}));
