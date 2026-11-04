// src/tests/integration/app.integration.test.js
jest.mock('yamljs', () => ({ load: () => ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }) }));
jest.mock('../../config/database', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../../config/logger', () => { const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), log: jest.fn() }; l.child = () => l; return l; });
jest.mock('../../services/UploadService', () => ({ getMulterConfig: () => ({ storage: require('multer').memoryStorage() }), validarArquivo: jest.fn(), deletarArquivo: jest.fn().mockResolvedValue(), formatarTamanhoArquivo: () => '5MB', maxFileSize: 5242880 }));

const request = require('supertest');
const app = require('../../app');

describe('App – infraestrutura HTTP', () => {
    it('GET / → info da API', async () => {
        const r = await request(app).get('/');
        expect(r.status).toBe(200);
        expect(r.body).toMatchObject({ sucesso: true, status: 'online' });
    });

    it('GET /api/health sem token', async () => {
        const r = await request(app).get('/api/health');
        expect(r.status).toBe(200);
        expect(r.body.ambiente).toBe('test');
    });

    it('propaga X-Request-Id válido do cliente', async () => {
        const r = await request(app).get('/api/health').set('X-Request-Id', 'abc-12345678');
        expect(r.headers['x-request-id']).toBe('abc-12345678');
    });

    it.each([
        ['curto demais', 'abc'],
        ['caractere proibido', 'abc 12345678'],
        ['longo demais', 'a'.repeat(65)]
    ])('gera X-Request-Id quando o do cliente é inválido (%s)', async (_, id) => {
        const r = await request(app).get('/api/health').set('X-Request-Id', id);
        expect(r.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
        expect(r.headers['x-request-id']).not.toBe(id);
    });

    it('headers de segurança do helmet', async () => {
        const r = await request(app).get('/');
        expect(r.headers['x-content-type-options']).toBe('nosniff');
    });

    it('rota privada inexistente sem token → 401 (auth antes do 404)', async () => {
        expect((await request(app).get('/api/nada')).status).toBe(401);
    });

    it('rota fora de /api inexistente → 404', async () => {
        expect((await request(app).get('/inexistente')).status).toBe(404);
    });

    it('JSON malformado → 400', async () => {
        const r = await request(app).post('/api/public/agendamentos')
            .set('Content-Type', 'application/json').send('{"a":');
        expect(r.status).toBe(400);
        expect(r.body.mensagem).toBe('JSON inválido');
    });

    it('payload > 1MB → 413', async () => {
        const r = await request(app).post('/api/public/agendamentos').send({ x: 'a'.repeat(1024 * 1024 + 1) });
        expect(r.status).toBe(413);
    });

    it.each(['ajustes', 'deletados'])('uploads/%s NÃO é servido estaticamente (LGPD)', async (pasta) => {
        expect((await request(app).get(`/uploads/${pasta}/qualquer.jpg`)).status).toBe(404);
    });
});
