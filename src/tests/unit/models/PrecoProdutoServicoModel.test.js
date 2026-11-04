// /src/tests/unit/models/PrecoProdutoServicoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/PrecoProdutoServicoModel');

beforeEach(() => database.query.mockReset());

describe('PrecoProdutoServicoModel.criarPrecoProdutoServico', () => {
    it('retorna insertId e envia valores na ordem', async () => {
        database.query.mockResolvedValue({ insertId: 8 });
        await expect(Model.criarPrecoProdutoServico({ id_produto_servico: 1, val_preco: 49.9, dta_inicio: '2026-01-01' })).resolves.toBe(8);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO tab_preco_produto_servico/);
        expect(valores).toEqual([1, 49.9, '2026-01-01']);
    });
});

describe('PrecoProdutoServicoModel.buscarPrecoProdutoServicoPorId', () => {
    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('%j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarPrecoProdutoServicoPorId(1)).resolves.toEqual(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id\s*= \? AND deleted_at IS NULL/), [1]);
    });
});

describe('PrecoProdutoServicoModel.listarPrecoProdutoServico', () => {
    it('ignora deletados e ordena pela vigência mais recente', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarPrecoProdutoServico()).resolves.toEqual([{ id: 1 }]);
        const [sql] = database.query.mock.calls[0];
        expect(sql).toMatch(/WHERE deleted_at IS NULL/);
        expect(sql).toMatch(/ORDER BY id_produto_servico, dta_inicio DESC/);
    });
});

describe('PrecoProdutoServicoModel.atualizarPrecoProdutoServico', () => {
    it.each([[1, true], [0, false]])('affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarPrecoProdutoServico(2, { val_preco: 59.9, dta_inicio: '2026-02-01' })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_preco_produto_servico SET .+ WHERE id = \? AND deleted_at IS NULL$/);
        expect(valores).toEqual([59.9, '2026-02-01', 2]);
    });
    it('ignora id_produto_servico (fora da whitelist)', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizarPrecoProdutoServico(2, { val_preco: 10, id_produto_servico: 9 });
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).not.toMatch(/id_produto_servico/);
        expect(valores).toEqual([10, 2]);
    });
});

describe('PrecoProdutoServicoModel.deletarPrecoProdutoServico', () => {
    it.each([[1, true], [0, false]])('soft delete affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarPrecoProdutoServico(1)).resolves.toBe(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/SET deleted_at = CURRENT_TIMESTAMP/), [1]);
    });
});

describe('PrecoProdutoServicoModel – erros', () => {
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.listarPrecoProdutoServico()).rejects.toThrow('db down');
    });
});
