// /src/tests/unit/models/ProdutoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/ProdutoModel');

const dados = { id_categoria: 2, nom_produto: 'Camisa', num_sku: 'S', des_produto: 'd', ref_produto: 'R', val_preco_base: 50, ind_ativo: 1 };

beforeEach(() => database.query.mockReset());

describe('ProdutoModel', () => {
    it('criarProduto → valores na ordem das colunas', async () => {
        database.query.mockResolvedValue({ insertId: 9 });
        await expect(Model.criarProduto(dados)).resolves.toBe(9);
        expect(database.query.mock.calls[0][1]).toEqual(['2', 'Camisa', 'S', 'd', 'R', 50, 1].map((v, i) => i === 0 ? 2 : v));
    });

    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('buscarProdutoPorId %j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarProdutoPorId(1)).resolves.toEqual(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });

    it('listarProdutos', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarProdutos()).resolves.toEqual([{ id: 1 }]);
    });

    it.each([[1, true], [0, false]])('atualizarProduto affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarProduto(4, { nom_produto: 'N', val_preco_base: 10 })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_produtos SET .+ WHERE id = \?/);
        expect(valores).toEqual(['N', 10, 4]);
    });

    it.each([[1, true], [0, false]])('deletarProduto (soft) affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarProduto(1)).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at = CURRENT_TIMESTAMP/);
    });
});
