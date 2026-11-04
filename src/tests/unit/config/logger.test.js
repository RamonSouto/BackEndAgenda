// src/tests/unit/config/logger.test.js
const mockCapturados = [];

jest.mock('winston-daily-rotate-file', () => {
    const Transport = require('winston-transport');
    return class extends Transport {
        constructor(opts) { super(opts); this.nome = opts.filename; }
        log(info, cb) { mockCapturados.push({ nome: this.nome, info }); cb(); }
    };
});
jest.mock('../../../config/env', () => ({
    env: 'production',
    logger: { level: 'debug', directory: './logs', datePattern: 'YYYY-MM-DD', maxSize: '1m', maxFiles: '1d' }
}));
jest.mock('../../../utils/loggerContext', () => ({ getContext: jest.fn(() => ({})) }));

const { getContext } = require('../../../utils/loggerContext');
const logger = require('../../../config/logger');

const ultimoCombined = () => mockCapturados.filter((c) => c.nome.includes('combined')).pop().info;

describe('logger (produção)', () => {
    beforeEach(() => {
        mockCapturados.length = 0;
        getContext.mockImplementation(() => ({}));
    });

    it('não adiciona Console em produção', () => {
        expect(logger.transports.every((t) => t.nome)).toBe(true);
        expect(logger.transports).toHaveLength(2);
    });

    it('mascara campos sensíveis no topo', () => {
        logger.info('login', { senha: '123', Authorization: 'Bearer x', usuario: 'ana' });
        const info = ultimoCombined();
        expect(info.senha).toBe('***');
        expect(info.Authorization).toBe('***');
        expect(info.usuario).toBe('ana');
    });

    it('mascara campos aninhados e em arrays', () => {
        logger.info('x', { dados: { cpf: '111', itens: [{ token: 't', id: 1 }] } });
        const { dados } = ultimoCombined();
        expect(dados.cpf).toBe('***');
        expect(dados.itens[0]).toEqual({ token: '***', id: 1 });
    });

    it('lida com referência circular', () => {
        const obj = { a: 1 }; obj.self = obj;
        expect(() => logger.info('c', { obj })).not.toThrow();
        expect(ultimoCombined().obj.self).toBe('[Circular]');
    });

    it('preserva Date e Error', () => {
        const d = new Date('2026-01-01');
        const e = new Error('falha');
        logger.info('d', { quando: d, causa: e });
        expect(ultimoCombined().quando).toBe(d);
        expect(ultimoCombined().causa).toBe(e);
    });

    it('injeta requestId e userId do contexto', () => {
        getContext.mockImplementation(() => ({ requestId: 'r-1', userId: 9 }));
        logger.info('ctx');
        expect(ultimoCombined()).toMatchObject({ requestId: 'r-1', userId: 9 });
    });

    it('não sobrescreve requestId/userId explícitos', () => {
        getContext.mockImplementation(() => ({ requestId: 'ctx', userId: 1 }));
        logger.info('x', { requestId: 'explicito', userId: 2 });
        expect(ultimoCombined()).toMatchObject({ requestId: 'explicito', userId: 2 });
    });

    it('arquivo de erro recebe apenas level error', () => {
        logger.info('i');
        logger.error('e');
        const erros = mockCapturados.filter((c) => c.nome.includes('error-'));
        expect(erros).toHaveLength(1);
        expect(erros[0].info.message).toBe('e');
    });

    it('defaultMeta inclui service', () => {
        logger.info('m');
        expect(ultimoCombined().service).toBe('agenda-ajuste');
    });

    it('stream.write envia em nível http com trim', () => {
        const spy = jest.spyOn(logger, 'http').mockImplementation(() => { });
        logger.stream.write('GET /x 200\n');
        expect(spy).toHaveBeenCalledWith('GET /x 200');
        spy.mockRestore();
    });
});
