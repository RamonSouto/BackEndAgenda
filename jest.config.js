// jest.config.js (raiz)
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src/tests'],
    setupFiles: ['<rootDir>/src/tests/setup/env.js'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: ['src/**/*.js', '!src/tests/**', '!src/workers/**'],
    coverageThreshold: { global: { statements: 99, branches: 97, functions: 99, lines: 99 } }
    //coverageThreshold: { global: { branches: 50, functions: 34, lines: 37, statements: 50 } }
    //coverageThreshold: { global: { branches: 80, functions: 85, lines: 85, statements: 85 } }
};
