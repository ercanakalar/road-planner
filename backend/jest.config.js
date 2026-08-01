module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/type/*.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
};
