// /src/tests/unit/middlewares/rateLimitMiddleware.test.js

jest.mock('express-rate-limit', () => jest.fn((opts) => ({ opts })));
jest.mock('../../../config/logger', () => ({ warn: jest.fn() }));

const ENV_ORIGINAL = { ...process.env };

const carregar = (env = {}) => {
    process.env = { ...ENV_ORIGINAL, ...env };
    let mod;
    jest.isolateModules(() => { mod = require('../../../middlewares/rateLimitMiddleware'); });
    return mod;
};

describe('rateLimitMiddleware', () => {
    afterEach(() => { process.env = { ...ENV_ORIGINAL }; });

    it('aplica os padrões', () => {
        const m = carregar();
        expect(m.limiterGeral.opts).toMatchObject({ windowMs: 900000, max: 10000 });
        expect(m.limiterLogin.opts).toMatchObject({ windowMs: 900000, max: 5, skipSuccessfulRequests: true });
        expect(m.limiterCriacao.opts).toMatchObject({ windowMs: 60000, max: 10 });
        expect(m.limiterUpload.opts).toMatchObject({ windowMs: 60000, max: 5 });
        expect(m.limiterPublicoAgendamento.opts).toMatchObject({ windowMs: 3600000, max: 5 });
    });

    it('limiterGeral lê variáveis de ambiente', () => {
        const m = carregar({ RATE_LIMIT_GERAL_MAX: '50', RATE_LIMIT_GERAL_WINDOW_MS: '1000' });
        expect(m.limiterGeral.opts).toMatchObject({ windowMs: 1000, max: 50 });
    });

    it.each(['0', '-3', 'abc'])('envInt usa fallback para valor inválido "%s"', (v) => {
        expect(carregar({ RATE_LIMIT_GERAL_MAX: v }).limiterGeral.opts.max).toBe(10000);
    });

    // BUG: JSDoc documenta env vars, mas os valores estão fixos no código
    it.failing('limiterLogin lê RATE_LIMIT_LOGIN_MAX', () => {
        expect(carregar({ RATE_LIMIT_LOGIN_MAX: '20' }).limiterLogin.opts.max).toBe(20);
    });

    it.failing('limiterCriacao lê RATE_LIMIT_CRIACAO_MAX', () => {
        expect(carregar({ RATE_LIMIT_CRIACAO_MAX: '30' }).limiterCriacao.opts.max).toBe(30);
    });

    it.failing('limiterUpload lê RATE_LIMIT_UPLOAD_MAX', () => {
        expect(carregar({ RATE_LIMIT_UPLOAD_MAX: '30' }).limiterUpload.opts.max).toBe(30);
    });

    // BUG: parseInt aceita negativo (envInt rejeitaria)
    it.failing('limiterPublico rejeita valor negativo', () => {
        expect(carregar({ RATE_LIMIT_PUBLICO_MAX: '-1' }).limiterPublicoAgendamento.opts.max).toBe(5);
    });

    it('handler público loga e responde 429', () => {
        const logger = require('../../../config/logger');
        const { opts } = carregar().limiterPublicoAgendamento;
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const req = { ip: '9.9.9.9', originalUrl: '/api/publico' };

        opts.handler(req, res, jest.fn(), opts);

        expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { ip: '9.9.9.9', rota: '/api/publico' });
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(opts.message);
        expect(opts.keyGenerator(req)).toBe('9.9.9.9');
    });
});
