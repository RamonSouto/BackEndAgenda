// /src/tests/unit/models/TamanhoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/TamanhoModel');

beforeEach(() => database.query.mockReset());

describe('TamanhoModel', () => {
    it('criarTamanhoProduto → insertId e ordem dos valores', async () => {
        database.query.mockResolvedValue({ insertId: 3 });
        await expect(Model.criarTamanhoProduto({ cod_tamanho: 'M', des_tamanho: 'Médio', des_categoria_tamanho: 'vestuario', num_ordem_exibicao: 2 })).resolves.toBe(3);
        expect(database.query.mock.calls[0][1]).toEqual(['M', 'Médio', 'vestuario', 2]);
    });

    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('buscarTamanhoPorId %j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarTamanhoPorId(1)).resolves.toEqual(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });

    it('listarTamanhos', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarTamanhos()).resolves.toEqual([{ id: 1 }]);
    });

    it.failing('listarTamanhos ignora deletados', async () => {
        database.query.mockResolvedValue([]);
        await Model.listarTamanhos();
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });

    it.each([[1, true], [0, false]])('atualizarTamanho affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarTamanho(4, { des_tamanho: 'G' })).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][1]).toEqual(['G', 4]);
    });

    it.each([[1, true], [0, false]])('deletarTamanho (soft) affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarTamanho(1)).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at = CURRENT_TIMESTAMP/);
    });
});
