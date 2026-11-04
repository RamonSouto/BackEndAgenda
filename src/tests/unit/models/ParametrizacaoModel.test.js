// /src/tests/unit/models/ParametrizacaoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({ montarUpdate: jest.fn(() => ({ set: 'hra_inicio = ?', valores: ['08:00:00'] })) }));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
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
    it.failing('buscarTipoDesativadoMaisRecente não deveria lançar quando vazio', async () => {
        database.query.mockResolvedValue([]);
        await expect(model.buscarTipoDesativadoMaisRecente('UTIL', 1)).resolves.toBeNull();
    });
});

// NOVO
describe('ParametrizacaoModel – CRUD e demais ramos', () => {
    it('criar retorna insertId com valores na ordem', async () => {
        database.query.mockResolvedValue({ insertId: 10 });
        const dados = { des_tipo_dia: 'UTIL', hra_inicio: '08:00:00', hra_fim: '18:00:00', qtd_minutos_intervalo: 60, ind_ativo: true };
        await expect(model.criar(dados)).resolves.toBe(10);
        expect(database.query.mock.calls[0][1]).toEqual(['UTIL', '08:00:00', '18:00:00', 60, true]);
    });
    it('listar retorna linhas', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(model.listar()).resolves.toEqual([{ id: 1 }]);
    });
    it('buscarParametrizacaoPorId encontrado/null', async () => {
        database.query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
        await expect(model.buscarParametrizacaoPorId(1)).resolves.toEqual({ id: 1 });
        await expect(model.buscarParametrizacaoPorId(2)).resolves.toBeNull();
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });
    it.each(['contarAtivosPorTipo', 'contarDesativadoPorTipo'])('%s com idExcluir', async (m) => {
        database.query.mockResolvedValue([{ total: 2 }]);
        await expect(model[m]('UTIL', 5)).resolves.toBe(2);
        const [sql, p] = database.query.mock.calls[0];
        expect(sql).toMatch(/AND id != \?/);
        expect(p).toEqual(['UTIL', 5]);
    });
    it('buscarTipoDesativadoMaisRecente retorna id', async () => {
        database.query.mockResolvedValue([{ id: 7 }]);
        await expect(model.buscarTipoDesativadoMaisRecente('UTIL', 1)).resolves.toBe(7);
        expect(database.query.mock.calls[0][1]).toEqual(['UTIL', 'UTIL', 1]);
    });
    it('desativarPorTipo com linhas afetadas → true', async () => {
        database.query.mockResolvedValue({ affectedRows: 3 });
        await expect(model.desativarPorTipo('UTIL')).resolves.toBe(true);
    });
    // linha 264
    it.each([
        ['desativarParametrizacao', /SET ind_ativo = FALSE/],
        ['ativarParametrizacao', /SET ind_ativo = TRUE/],
        ['deletar', /deleted_at = CURRENT_TIMESTAMP/]
    ])('%s true/false', async (m, regex) => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(model[m](1)).resolves.toBe(true);
        await expect(model[m](1)).resolves.toBe(false);
        expect(database.query.mock.calls[0][0]).toMatch(regex);
        expect(database.query.mock.calls[0][1]).toEqual([1]);
    });
    it('atualizar usa montarUpdate com campos permitidos', async () => {
        database.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce({ affectedRows: 0 });
        await expect(model.atualizar(1, { hra_inicio: '08:00:00' })).resolves.toBe(true);
        expect(montarUpdate).toHaveBeenCalledWith({ hra_inicio: '08:00:00' },
            ['des_tipo_dia', 'hra_inicio', 'hra_fim', 'qtd_minutos_intervalo', 'ind_ativo']);
        expect(database.query.mock.calls[0]).toEqual([
            'UPDATE tab_parametrizacao SET hra_inicio = ? WHERE id = ? AND deleted_at IS NULL', ['08:00:00', 1]
        ]);
        await expect(model.atualizar(1, { hra_inicio: '08:00:00' })).resolves.toBe(false);
    });
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db'));
        await expect(model.criar({})).rejects.toThrow('db');
    });
});
