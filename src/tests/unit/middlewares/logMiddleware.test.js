// /src/tests/unit/middlewares/logMiddleware.test.js

jest.mock('../../../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const EventEmitter = require('events');
const logger = require('../../../config/logger');
const logMiddleware = require('../../../middlewares/logMiddleware');

const montar = (statusCode, usuario) => {
    const req = { method: 'GET', originalUrl: '/api/x', ip: '1.1.1.1', usuario };
    const res = Object.assign(new EventEmitter(), { statusCode });
    const next = jest.fn();
    return { req, res, next };
};

describe('logMiddleware', () => {
    beforeEach(() => jest.clearAllMocks());
    afterEach(() => jest.restoreAllMocks());

    it('chama next imediatamente sem logar antes do finish', () => {
        const { req, res, next } = montar(200);
        logMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
    });

    it.each([[200, 'info'], [404, 'warn'], [500, 'error']])('status %i → nível %s', (status, nivel) => {
        const { req, res, next } = montar(status);
        logMiddleware(req, res, next);
        res.emit('finish');
        expect(logger[nivel]).toHaveBeenCalledWith('Requisição HTTP', expect.objectContaining({ status }));
    });

    it('registra duração, rota e usuarioId', () => {
        jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1250);
        const { req, res, next } = montar(201, { id: 7 });
        logMiddleware(req, res, next);
        res.emit('finish');
        expect(logger.info).toHaveBeenCalledWith('Requisição HTTP', {
            metodo: 'GET', rota: '/api/x', status: 201, duracaoMs: 250, ip: '1.1.1.1', usuarioId: 7
        });
    });

    it('usuarioId null quando não autenticado', () => {
        const { req, res, next } = montar(200);
        logMiddleware(req, res, next);
        res.emit('finish');
        expect(logger.info.mock.calls[0][1].usuarioId).toBeNull();
    });
});
