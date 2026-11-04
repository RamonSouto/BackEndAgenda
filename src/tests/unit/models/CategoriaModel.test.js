// /src/tests/unit/models/CategoriaModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/CategoriaModel');

beforeEach(() => database.query.mockReset());

describe('CategoriaModel', () => {
    it('criarCategoriaProduto → retorna insertId', async () => {
        database.query.mockResolvedValue({ insertId: 5 });
        await expect(Model.criarCategoriaProduto({ nom_categoria: 'A', id_pai: 1 })).resolves.toBe(5);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO tab_categorias_produtos/), ['A', 1]);
    });

    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('buscarCategoriaPorId %j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarCategoriaPorId(1)).resolves.toEqual(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });

    it('listarCategorias ignora deletadas', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarCategorias()).resolves.toEqual([{ id: 1 }]);
        expect(database.query.mock.calls[0][0]).toMatch(/WHERE deleted_at IS NULL/);
    });

    it.each([[1, true], [0, false]])('atualizarCategoria affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarCategoria(3, { nom_categoria: 'B' })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_categorias_produtos SET .+ WHERE id = \? AND deleted_at IS NULL$/);
        expect(valores).toEqual(['B', 3]);
    });

    it('atualizarCategoria ignora campos não permitidos (whitelist)', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizarCategoria(3, { nom_categoria: 'B', deleted_at: 'x' });
        expect(database.query.mock.calls[0][0]).not.toMatch(/deleted_at =/);
    });

    it('buscarCategoriaFilho filtra por id_pai', async () => {
        database.query.mockResolvedValue([{ id: 2 }]);
        await expect(Model.buscarCategoriaFilho(1)).resolves.toEqual([{ id: 2 }]);
        expect(database.query.mock.calls[0][0]).toMatch(/id_pai = \?/);
    });

    it.each([[1, true], [0, false]])('deletarCategoria (soft) affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarCategoria(1)).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/SET deleted_at = CURRENT_TIMESTAMP/);
    });

    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.listarCategorias()).rejects.toThrow('db down');
    });
});
