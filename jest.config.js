// jest.config.js (raiz)
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests'],
    setupFiles: ['<rootDir>/src/tests/setup/env.js'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: ['src/**/*.js', '!src/tests/**', '!src/workers/**'],
    coverageThreshold: { global: { statements: 100, branches: 100, functions: 100, lines: 100 } }
};
