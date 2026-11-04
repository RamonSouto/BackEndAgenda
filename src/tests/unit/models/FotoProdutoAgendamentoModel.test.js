// src/tests/unit/models/agendamento/FotoProdutoAgendamentoModel.test.js
jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({ executar: jest.fn() }));

const database = require('../../../config/database');
const { executar } = require('../../../utils/sqlUtils');
const Model = require('../../../models/agendamento/FotoProdutoAgendamentoModel');

const conn = (rows) => ({ execute: jest.fn().mockResolvedValue([rows]) });

beforeEach(() => jest.clearAllMocks());

describe('buscarContextoItem', () => {
    it('pool, sem lock, retorna 1ª linha', async () => {
        database.query.mockResolvedValue([{ id_item: 3 }]);
        await expect(Model.buscarContextoItem(3)).resolves.toEqual({ id_item: 3 });
        expect(database.query.mock.calls[0][0]).not.toMatch(/FOR UPDATE/);
    });
    it('connection + lock; vazio → null', async () => {
        const c = conn([]);
        await expect(Model.buscarContextoItem(3, c, true)).resolves.toBeNull();
        expect(c.execute.mock.calls[0][0]).toMatch(/FOR UPDATE/);
    });
});

describe('contarPorItem', () => {
    it.each([[null, 'pool'], ['conn', 'connection']])('converte total para número (%s)', async (tipo) => {
        const c = tipo ? conn([{ total: '4' }]) : null;
        if (!c) database.query.mockResolvedValue([{ total: '4' }]);
        await expect(Model.contarPorItem(3, c)).resolves.toBe(4);
    });
});

describe('criar', () => {
    const dados = { id_produto_agendamento: 3, des_caminho_arquivo: 'ajustes/a.jpg', nom_original: 'a.jpg', num_tamanho_bytes: 10, ind_tipo_foto: 'antes' };
    it('pool', async () => {
        database.query.mockResolvedValue({ insertId: 11 });
        await expect(Model.criar(dados)).resolves.toBe(11);
        expect(database.query.mock.calls[0][1]).toEqual([3, 'ajustes/a.jpg', 'a.jpg', 10, 'antes']);
    });
    it('connection', async () => {
        const c = conn({ insertId: 12 });
        await expect(Model.criar(dados, c)).resolves.toBe(12);
        expect(database.query).not.toHaveBeenCalled();
    });
});

it('listarPorItem filtra ativos e ordena', async () => {
    database.query.mockResolvedValue([{ id: 1 }]);
    await expect(Model.listarPorItem(3)).resolves.toEqual([{ id: 1 }]);
    expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL[\s\S]*ORDER BY ind_tipo_foto/);
});

describe('buscarPorId', () => {
    it('sem lock retorna 1ª linha', async () => {
        executar.mockResolvedValue([{ id: 10 }]);
        await expect(Model.buscarPorId(10)).resolves.toEqual({ id: 10 });
        expect(executar).toHaveBeenCalledWith(expect.not.stringMatching(/FOR UPDATE/), [10], null);
    });
    it('com lock e connection; vazio → null', async () => {
        executar.mockResolvedValue([]);
        const c = {};
        await expect(Model.buscarPorId(10, c, true)).resolves.toBeNull();
        expect(executar).toHaveBeenCalledWith(expect.stringMatching(/FOR UPDATE/), [10], c);
    });
});

describe('deletar', () => {
    it('pool: affectedRows > 0 → true', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await expect(Model.deletar(10, 'deletados/a.jpg')).resolves.toBe(true);
        expect(database.query.mock.calls[0][1]).toEqual(['deletados/a.jpg', 10]);
    });
    it('connection: nada afetado → false', async () => {
        await expect(Model.deletar(10, null, conn({ affectedRows: 0 }))).resolves.toBe(false);
    });
});
