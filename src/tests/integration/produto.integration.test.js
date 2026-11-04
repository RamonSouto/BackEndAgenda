// src/tests/integration/produto.integration.test.js
jest.mock('yamljs', () => ({ load: () => ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {} }) }));
jest.mock('../../config/database', () => ({ query: jest.fn().mockResolvedValue([]), transaction: jest.fn() }));
jest.mock('../../config/logger', () => { const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn(), log: jest.fn() }; l.child = () => l; return l; });
jest.mock('../../services/UploadService', () => ({
    getMulterConfig: () => ({ storage: require('multer').memoryStorage() }),
    validarArquivo: jest.fn(), deletarArquivo: jest.fn().mockResolvedValue(),
    caminhoRelativo: jest.fn(() => 'imagem_produto/x.jpg'),
    formatarTamanhoArquivo: () => '5MB', maxFileSize: 5242880
}));
['CategoriaService', 'CorEstampaService', 'GradeService', 'ImagemService', 'PrecoProdutoServicoService', 'ProdutoService']
    .forEach((s) => jest.mock(`../../services/produto/${s}`));
jest.mock('../../services/agendamento/TipoAgendamentoService');

const request = require('supertest');
const app = require('../../app');
const { token, usuarios } = require('../helpers/factories');
const { NotFoundError } = require('../../utils/ApiError');
const svc = (s) => require(`../../services/produto/${s}`);
const TipoService = require('../../services/agendamento/TipoAgendamentoService');

const auth = (u) => ({ Authorization: `Bearer ${token(u)}` });
const NAO_ADMIN = ['secretaria', 'costureira', 'medico', 'paciente'];

/** [rota GET de listagem, service, método] */
const LISTAGENS = [
    ['/api/produtos/categoria', 'CategoriaService', 'listarCategorias'],
    ['/api/produtos/cor_estampa', 'CorEstampaService', 'listarCoresEstampas'],
    ['/api/produtos/grade_produto', 'GradeService', 'listarGradesProdutos'],
    ['/api/produtos/imagemProduto', 'ImagemService', 'listarImagemProdutos'],
    ['/api/produtos/precoProdutoServico', 'PrecoProdutoServicoService', 'listarPrecoProdutoServico'],
    ['/api/produtos/produto', 'ProdutoService', 'listarProdutos']
];

describe.each(LISTAGENS)('GET %s', (rota, s, fn) => {
    it('401 sem token', async () => {
        expect((await request(app).get(rota)).status).toBe(401);
    });

    it.each(NAO_ADMIN)('403 para %s', async (p) => {
        expect((await request(app).get(rota).set(auth(usuarios[p]))).status).toBe(403);
        expect(svc(s)[fn]).not.toHaveBeenCalled();
    });

    it('200 para admin com total', async () => {
        svc(s)[fn].mockResolvedValue([{ id: 1 }]);
        const r = await request(app).get(rota).set(auth(usuarios.admin));
        expect(r.status).toBe(200);
        expect(r.body).toEqual({ sucesso: true, total: 1, dados: [{ id: 1 }] });
    });
});

describe('Escritas de produto', () => {
    it.each([
        ['/api/produtos/categoria'], ['/api/produtos/grade_produto'], ['/api/produtos/precoProdutoServico']
    ])('POST %s com body vazio → 400', async (rota) => {
        expect((await request(app).post(rota).set(auth(usuarios.admin)).send({})).status).toBe(400);
    });

    it('POST /produto com secretária → 403', async () => {
        expect((await request(app).post('/api/produtos/produto').set(auth(usuarios.secretaria)).send({ nom_produto: 'x' })).status).toBe(403);
    });

    it('404 do Service é propagado', async () => {
        svc('CategoriaService').atualizarCategoria.mockRejectedValue(new NotFoundError('Categoria não encontrada'));
        const r = await request(app).put('/api/produtos/categoria/9').set(auth(usuarios.admin)).send({ nom_categoria: 'Nova' });
        expect(r.status).toBe(404);
        expect(r.body.mensagem).toBe('Categoria não encontrada');
    });

    it('FK em uso ao deletar → 400 amigável', async () => {
        svc('CategoriaService').deletarCategoria.mockRejectedValue({ code: 'ER_ROW_IS_REFERENCED_2', sqlMessage: 'fk' });
        const r = await request(app).delete('/api/produtos/categoria/1').set(auth(usuarios.admin));
        expect(r.status).toBe(400);
        expect(r.body.mensagem).toMatch(/registros relacionados/);
    });

    it('ref_produto duplicado → 409', async () => {
        svc('ProdutoService').adicionarProduto.mockRejectedValue({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'ref_produto'" });
        const r = await request(app).post('/api/produtos/produto').set(auth(usuarios.admin)).send({ nom_produto: 'x' });
        expect(r.status).toBe(409);
        expect(r.body.mensagem).toBe('Registro duplicado');
    });

    // Inconsistência #1: sem validarIdMiddleware nas rotas de produto.
    it.failing('GET /categoria/abc → 400 (id inválido barrado antes do Service)', async () => {
        expect((await request(app).get('/api/produtos/categoria/abc').set(auth(usuarios.admin))).status).toBe(400);
    });
});

describe('Upload de imagem de produto', () => {
    it('POST /imagemProduto sem arquivo → 400', async () => {
        const r = await request(app).post('/api/produtos/imagemProduto').set(auth(usuarios.admin)).field('id_produto', '1');
        expect(r.status).toBe(400);
        expect(r.body.mensagem).toBe('Nenhum arquivo foi enviado');
    });

    it('POST /imagemProduto com arquivo → 201', async () => {
        svc('ImagemService').adicionarImagemProduto.mockResolvedValue(11);
        const r = await request(app).post('/api/produtos/imagemProduto').set(auth(usuarios.admin))
            .field('id_produto', '1').field('ind_principal', 'true')
            .attach('foto', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), 'a.jpg');
        expect(r.status).toBe(201);
        expect(r.body.dados).toEqual({ id: 11 });
    });

    it('campo de arquivo inesperado → 400 (MulterError)', async () => {
        const r = await request(app).post('/api/produtos/imagemProduto').set(auth(usuarios.admin))
            .attach('outro', Buffer.from([1]), 'a.jpg');
        expect(r.status).toBe(400);
    });

    it('cor_estampa sem foto (opcional) → 201', async () => {
        svc('CorEstampaService').adicionarCorEstampa.mockResolvedValue(4);
        const r = await request(app).post('/api/produtos/cor_estampa').set(auth(usuarios.admin))
            .field('nom_cor_estampa', 'Azul').field('ind_tipo', 'cor');
        expect(r.status).toBe(201);
    });
});

describe('/api/agendamentos/tipo', () => {
    it.each(['admin', 'secretaria', 'costureira', 'medico'])('GET lista para %s (não capturado por /:id)', async (p) => {
        TipoService.listar.mockResolvedValue([{ id: 1 }]);
        const r = await request(app).get('/api/agendamentos/tipo').set(auth(usuarios[p]));
        expect(r.status).toBe(200);
        expect(r.body.total).toBe(1);
    });

    it.each(['0', 'abc', '-1'])('GET /tipo/%s → 400', async (id) => {
        expect((await request(app).get(`/api/agendamentos/tipo/${id}`).set(auth(usuarios.admin))).status).toBe(400);
    });

    it.each([
        ['post', '/api/agendamentos/tipo'], ['put', '/api/agendamentos/tipo/1'], ['delete', '/api/agendamentos/tipo/1']
    ])('%s %s → 403 para secretária', async (m, rota) => {
        expect((await request(app)[m](rota).set(auth(usuarios.secretaria)).send({ des_tipo_agendamento: 'x' })).status).toBe(403);
    });

    it('POST admin → 201 repassando usuário', async () => {
        TipoService.criar.mockResolvedValue({ id: 2 });
        const r = await request(app).post('/api/agendamentos/tipo').set(auth(usuarios.admin)).send({ des_tipo_agendamento: 'Retorno' });
        expect(r.status).toBe(201);
        expect(TipoService.criar).toHaveBeenCalledWith({ des_tipo_agendamento: 'Retorno' }, 1);
    });
});
