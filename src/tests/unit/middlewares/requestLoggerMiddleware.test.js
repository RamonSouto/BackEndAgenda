// src/tests/unit/middlewares/requestLoggerMiddleware.test.js
jest.mock('../../../config/logger', () => {
    const l = { log: jest.fn() };
    l.child = jest.fn(() => l);
    return l;
});

const EventEmitter = require('events');
const middleware = require('../../../middlewares/requestLoggerMiddleware');

const executar = (idCliente) => {
    const req = { headers: { 'x-request-id': idCliente }, get: () => 'jest', method: 'GET', originalUrl: '/' };
    const res = Object.assign(new EventEmitter(), { setHeader: jest.fn(), statusCode: 200 });
    const next = jest.fn();
    middleware(req, res, next);
    return { req, res, next };
};

describe('requestLoggerMiddleware', () => {
    it.each(['x\nmal', 'abc12345\r\nSet-Cookie: x', 'abc12345\u0000'])(
        'descarta ID com caractere de controle %p',
        (id) => {
            const { req, res, next } = executar(id);
            expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
            expect(next).toHaveBeenCalled();
        }
    );

    it('mantém ID válido', () => {
        expect(executar('abc-12345678').req.id).toBe('abc-12345678');
    });

    it('gera ID quando ausente', () => {
        expect(executar(undefined).req.id).toMatch(/^[0-9a-f-]{36}$/);
    });
});
