jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const model = require('../../../models/sistema/ParametrizacaoModel');

beforeEach(() => jest.clearAllMocks());

describe('ParametrizacaoModel – branches', () => {
    it('listar retorna null quando query retorna undefined', async () => {
        database.query.mockResolvedValue(undefined);
        await expect(model.listar()).resolves.toBeNull();
    });

    it('buscarParametrizacaoPorTipoAtivo → null quando vazio', async () => {
        database.query.mockResolvedValue([]);
        await expect(model.buscarParametrizacaoPorTipoAtivo('UTIL')).resolves.toBeNull();
    });

    it('buscarParametrizacaoPorTipoAtivo retorna OBJETO (não array)', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(model.buscarParametrizacaoPorTipoAtivo('UTIL')).resolves.toEqual({ id: 1 });
    });

    it.each([
        [5, ['UTIL', 5], true],
        [null, ['UTIL'], false]
    ])('desativarPorTipo idExcluir=%s', async (idExcluir, params, comFiltro) => {
        database.query.mockResolvedValue({ affectedRows: 0 });
        await expect(model.desativarPorTipo('UTIL', idExcluir)).resolves.toBe(false);
        const [sql, p] = database.query.mock.calls[0];
        expect(sql.includes('AND id != ?')).toBe(comFiltro);
        expect(p).toEqual(params);
    });

    it.each(['contarAtivosPorTipo', 'contarDesativadoPorTipo'])('%s → 0 quando sem linhas', async (m) => {
        database.query.mockResolvedValue([]);
        await expect(model[m]('UTIL')).resolves.toBe(0);
    });

    // BUG documentado: resultado vazio quebra
    it.failing('buscarTipoDesativadoMaisRecente não deveria lançar quando vazio', async () => {
        database.query.mockResolvedValue([]);
        await expect(model.buscarTipoDesativadoMaisRecente('UTIL', 1)).resolves.toBeNull();
    });
});
