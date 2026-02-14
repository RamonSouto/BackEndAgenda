// Configuração global dos testes
require('dotenv').config({ path: '.env.test' });

// Configurar timeout global
jest.setTimeout(30000)

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Limpar mocks após cada teste
afterEach(() => {
    jest.clearAllMocks();
})

// Limpar todos os mocks após todos os testes
afterAll(() => {
    jest.restoreAllMocks();
})

