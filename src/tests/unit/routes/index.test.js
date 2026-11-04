const request = require('supertest');
const express = require('express');

const ROTAS = [
    'authRoutes', 'pessoaRoutes', 'relatorioRoutes',
    'agendamento/tipoAgendamentoRoutes', 'agendamento/agendamentoRoutes',
    'agendamento/agendamentoProdutoRoutes', 'agendamento/fotoProdutoAgendamentoRoutes',
    'agendamento/publicAgendamentoRoutes',
    'produto/produtoRoutes', 'produto/categoriaRoutes', 'produto/tamanhoRoutes',
    'produto/corEstampaRoutes', 'produto/gradeRoutes', 'produto/imagemRoutes',
    'produto/tipoServicoRoutes', 'produto/produtoServicoRoutes', 'produto/precoProdutoServicoRoutes',
    'sistema/cidadeRoutes', 'sistema/estadoRoutes', 'sistema/empresaRoutes',
    'sistema/parametrizacaoRoutes', 'sistema/emailRoutes'
];

const authMock = jest.fn((req, res, next) =>
    req.headers.authorization ? next() : res.status(401).json({ erro: 'Token não fornecido' }));

const montar = () => {
    let router;
    jest.isolateModules(() => {
        jest.doMock('../../../middlewares/authMiddleware', () => authMock);
        ROTAS.forEach((r) => jest.doMock(`../../../routes/${r}`, () => {
            const e = require('express');
            const rt = e.Router();
            rt.get(`/__${r.split('/').pop()}`, (req, res) => res.json({ rota: r }));
            return rt;
        }));
        router = require('../../../routes');
    });
    const app = express();
    app.use('/api', router);
    return app;
};

beforeEach(() => authMock.mockClear());

describe('routes/index', () => {
    it('GET /api/health usa NODE_ENV', async () => {
        const old = process.env.NODE_ENV;
        process.env.NODE_ENV = 'staging';
        const res = await request(montar()).get('/api/health');
        process.env.NODE_ENV = old;
        expect(res.body).toEqual(expect.objectContaining({ sucesso: true, ambiente: 'staging' }));
    });

    it('GET /api/health fallback "development"', async () => {
        const old = process.env.NODE_ENV;
        delete process.env.NODE_ENV;
        const res = await request(montar()).get('/api/health');
        process.env.NODE_ENV = old;
        expect(res.body.ambiente).toBe('development');
    });

    it('GET /api lista rotas sem JWT', async () => {
        const res = await request(montar()).get('/api');
        expect(res.status).toBe(200);
        expect(res.body.rotas_disponiveis.agendamentos).toBe('/api/agendamentos');
        expect(authMock).not.toHaveBeenCalled();
    });

    it.each([
        ['/api/auth/__authRoutes'],
        ['/api/public/agendamentos/__publicAgendamentoRoutes']
    ])('%s é público', async (url) => {
        await request(montar()).get(url).expect(200);
        expect(authMock).not.toHaveBeenCalled();
    });

    it.each([
        '/api/pessoas/__pessoaRoutes',
        '/api/agendamentos/__agendamentoRoutes',
        '/api/produtos/__produtoRoutes',
        '/api/sistema/__emailRoutes',
        '/api/relatorios/__relatorioRoutes'
    ])('%s exige JWT', async (url) => {
        const app = montar();
        await request(app).get(url).expect(401);
        await request(app).get(url).set('Authorization', 'Bearer x').expect(200);
    });
});
