/** Pure-logic tests only. We deliberately don't use jest-expo / the RN
 *  preset because none of our tests render components — they exercise the
 *  transit graph, the card engine, and the multiplayer rules engines. The
 *  RN preset transitively pulls in Flow-typed polyfills that fail to parse
 *  under Jest's default transforms. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          resolveJsonModule: true,
          allowJs: true,
        },
      },
    ],
  },
};
