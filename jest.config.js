module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  resolver: 'react-native-worklets/jest/resolver.js',
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo.*|@expo.*|react-navigation|@react-navigation.*|@sentry.*|react-native-svg|@shopify/flash-list|@mswjs|msw|rettime|until-async|@open-draft|headers-polyfill|strict-event-emitter|outvariant|standard-navigation))',
  ],
  transform: {
    '^.+\\.[cm]?[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test-utils/mocks/style-mock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.types.{ts,tsx}',
    '!src/**/*.type.{ts,tsx}',
    '!src/**/*.interface.{ts,tsx}',
    '!src/**/types/**',
    '!src/mocks/**',
    '!src/test-utils/**',
  ],
  clearMocks: true,
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
