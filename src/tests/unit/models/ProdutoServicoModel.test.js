// /src/tests/unit/models/ProdutoServicoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/ProdutoServicoModel');

beforeEach(() => database.query.mockReset());

describe('ProdutoServicoModel.criarProdutoTipoServico', () => {
    it('retorna insertId e envia valores na ordem', async () => {
        database.query.mockResolvedValue({ insertId: 4 });
        await expect(Model.criarProdutoTipoServico({ id_produto: 1, id_tipo_servico: 2, ind_ativo: true })).resolves.toBe(4);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO tab_produto_servico/);
        expect(valores).toEqual([1, 2, true]);
    });
});

describe('ProdutoServicoModel.buscarProdutoServicoPorId', () => {
    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('%j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarProdutoServicoPorId(1)).resolves.toEqual(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id\s*= \? AND deleted_at IS NULL/), [1]);
    });
});

describe('ProdutoServicoModel.buscarServicoPorIdEIdGrade', () => {
    it.each([[[{ id_produto_servico: 3, val_preco: 10 }], { id_produto_servico: 3, val_preco: 10 }], [[], null]])('%j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarServicoPorIdEIdGrade(3, 4)).resolves.toEqual(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/WHERE tps\.id = \?/);
        expect(sql).toMatch(/tpg\.id = \?/);
        expect(sql).toMatch(/SELECT MAX\(tpps2\.dta_inicio\)/);
        expect(valores).toEqual([3, 4]);
    });
});

describe('ProdutoServicoModel.listarProdutoServico', () => {
    it('retorna resultado do banco', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarProdutoServico()).resolves.toEqual([{ id: 1 }]);
    });
    it.failing('deve ignorar registros deletados', async () => {
        database.query.mockResolvedValue([]);
        await Model.listarProdutoServico();
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });
});

describe('ProdutoServicoModel.atualizarProdutoServico', () => {
    it.each([[1, true], [0, false]])('affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarProdutoServico(5, { id_produto: 1, id_tipo_servico: 2, ind_ativo: 0 })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_produto_servico SET .+ WHERE id = \? AND deleted_at IS NULL$/);
        expect(valores).toEqual([1, 2, 0, 5]);
    });
    it('ignora campos fora da whitelist', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizarProdutoServico(5, { ind_ativo: 1, deleted_at: null });
        expect(database.query.mock.calls[0][1]).toEqual([1, 5]);
    });
});

describe('ProdutoServicoModel.deletarProdutoServico', () => {
    it.each([[1, true], [0, false]])('soft delete affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarProdutoServico(1)).resolves.toBe(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/SET deleted_at = CURRENT_TIMESTAMP/), [1]);
    });
});

describe('ProdutoServicoModel – erros', () => {
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.buscarServicoPorIdEIdGrade(1, 1)).rejects.toThrow('db down');
    });
});
