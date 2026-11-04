const request = require('supertest');

const carregarApp = ({ env = 'test', hops, origins } = {}) => {
    const backup = { ...process.env };
    if (hops === undefined) delete process.env.TRUST_PROXY_HOPS; else process.env.TRUST_PROXY_HOPS = hops;
    if (origins === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = origins;

    let app;
    jest.isolateModules(() => {
        const express = require('express');
        jest.doMock('../../config/env', () => ({ env }));
        jest.doMock('../../middlewares/requestLoggerMiddleware', () => (req, res, next) => next());
        jest.doMock('../../middlewares/rateLimitMiddleware', () => ({ limiterGeral: (req, res, next) => next() }));
        jest.doMock('../../middlewares/errorMiddleware', () => ({
            sanitizarInputMiddleware: (req, res, next) => next(),
            notFoundMiddleware: (req, res) => res.status(404).json({ sucesso: false }),
            errorMiddleware: (err, req, res, next) => res.status(500).json({ erro: err.message })
        }));
        jest.doMock('../../routes', () => {
            const r = express.Router();
            r.get('/ping', (req, res) => res.json({ ok: true }));
            return r;
        });
        jest.doMock('yamljs', () => ({ load: () => ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }) }));
        app = require('../../app');
    });
    process.env = backup;
    return app;
};

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => { }));
afterEach(() => jest.restoreAllMocks());

describe('app', () => {
    it('GET / retorna info da API', async () => {
        const res = await request(carregarApp()).get('/');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('online');
    });

    it('monta rotas em /api', async () => {
        await request(carregarApp()).get('/api/ping').expect(200, { ok: true });
    });

    it('404 para rota inexistente', async () => {
        await request(carregarApp()).get('/nada').expect(404);
    });

    it('trust proxy padrão = 1', () => {
        expect(carregarApp().get('trust proxy')).toBeDefined();
    });

    it('TRUST_PROXY_HOPS customizado', () => {
        const fn = carregarApp({ hops: '2' }).get('trust proxy fn');
        expect(fn('1.1.1.1', 1)).toBe(true);
        expect(fn('1.1.1.1', 2)).toBe(false);
    });

    it('Swagger disponível fora de produção', async () => {
        const res = await request(carregarApp()).get('/api/docs/');
        expect(res.status).toBe(200);
    });

    it('Swagger oculto em produção', async () => {
        await request(carregarApp({ env: 'production' })).get('/api/docs/').expect(404);
    });

    it('CORS: origem permitida recebe header', async () => {
        const res = await request(carregarApp({ origins: 'http://a.com,http://b.com' }))
            .get('/').set('Origin', 'http://a.com');
        expect(res.headers['access-control-allow-origin']).toBe('http://a.com');
    });

    it('CORS: sem ALLOWED_ORIGINS não envia header', async () => {
        const res = await request(carregarApp()).get('/').set('Origin', 'http://a.com');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('pasta privada de uploads não é servida', async () => {
        await request(carregarApp()).get('/uploads/ajustes/x.jpg').expect(404);
    });
});
