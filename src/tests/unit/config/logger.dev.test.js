// src/tests/unit/config/logger.dev.test.js
const { MESSAGE, LEVEL } = require('triple-beam');

jest.mock('winston-daily-rotate-file', () => {
    const Transport = require('winston-transport');
    return class extends Transport {
        constructor(opts) { super(opts); this.nome = opts.filename; }
        log(info, cb) { cb(); }
    };
});
jest.mock('../../../config/env', () => ({
    env: 'development',
    logger: { level: 'debug', directory: './logs', datePattern: 'YYYY-MM-DD', maxSize: '1m', maxFiles: '1d' }
}));
jest.mock('../../../utils/loggerContext', () => ({ getContext: jest.fn(() => ({})) }));

const { getContext } = require('../../../utils/loggerContext');
const logger = require('../../../config/logger');

const consoleT = () => logger.transports.find((t) => !t.nome);
const formatar = (info) =>
    consoleT().format.transform({ level: 'info', [LEVEL]: 'info', ...info })[MESSAGE];

describe('logger (desenvolvimento – Console/devFormat)', () => {
    beforeEach(() => getContext.mockImplementation(() => ({})));

    it('adiciona Console fora de produção', () => {
        expect(consoleT()).toBeDefined();
        expect(logger.transports).toHaveLength(3);
    });

    it('devFormat com requestId, meta mascarada e stack', () => {
        getContext.mockImplementation(() => ({ requestId: 'req-1', userId: 9 }));
        const out = formatar({
            message: 'ola', stack: 'STACK', senha: '123', extra: { cpf: '1' }, service: 'x', env: 'dev'
        });
        expect(out).toContain('[req-1]');
        expect(out).toContain('STACK');
        expect(out).toContain('"senha": "***"');
        expect(out).toContain('"cpf": "***"');
        expect(out).toContain('"userId": 9');
        expect(out).not.toContain('"service"');
    });

    it('devFormat sem requestId, meta e stack', () => {
        const out = formatar({ message: 'simples' });
        expect(out).toMatch(/simples/);
        expect(out).not.toContain('↳');
    });
});
