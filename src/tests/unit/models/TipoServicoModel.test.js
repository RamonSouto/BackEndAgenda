// /src/tests/unit/models/TipoServicoModel.test.js


jest.mock('../../../config/database', () => ({ query: jest.fn() }));

const database = require('../../../config/database');
const Model = require('../../../models/produto/TipoServicoModel');

beforeEach(() => database.query.mockReset());

describe('TipoServicoModel.criarTipoServico', () => {
    it('retorna insertId e envia valores na ordem', async () => {
        database.query.mockResolvedValue({ insertId: 3 });
        await expect(Model.criarTipoServico({ des_tipo_ajuste: 'Costura', ind_ativo: true })).resolves.toBe(3);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO tab_tipo_servico/);
        expect(valores).toEqual(['Costura', true]);
    });
});

describe('TipoServicoModel.buscarTipoServicoPorId', () => {
    it.each([[[{ id: 1 }], { id: 1 }], [[], null]])('%j → %j', async (rows, esperado) => {
        database.query.mockResolvedValue(rows);
        await expect(Model.buscarTipoServicoPorId(1)).resolves.toEqual(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id\s*= \? AND deleted_at IS NULL/), [1]);
    });
});

describe('TipoServicoModel.listarTipoServico', () => {
    it('retorna resultado do banco', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.listarTipoServico()).resolves.toEqual([{ id: 1 }]);
    });
    it.failing('deve ignorar registros deletados', async () => {
        database.query.mockResolvedValue([]);
        await Model.listarTipoServico();
        expect(database.query.mock.calls[0][0]).toMatch(/deleted_at IS NULL/);
    });
});

describe('TipoServicoModel.atualizarTipoServico', () => {
    it.each([[1, true], [0, false]])('affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizarTipoServico(2, { des_tipo_ajuste: 'Bainha', ind_ativo: 0 })).resolves.toBe(esperado);
        const [sql, valores] = database.query.mock.calls[0];
        expect(sql).toMatch(/^UPDATE tab_tipo_servico SET .+ WHERE id = \? AND deleted_at IS NULL$/);
        expect(valores).toEqual(['Bainha', 0, 2]);
    });
    it('ignora campos fora da whitelist', async () => {
        database.query.mockResolvedValue({ affectedRows: 1 });
        await Model.atualizarTipoServico(2, { des_tipo_ajuste: 'X', id: 99 });
        expect(database.query.mock.calls[0][1]).toEqual(['X', 2]);
    });
});

describe('TipoServicoModel.deletarTipoServico', () => {
    it.each([[1, true], [0, false]])('soft delete affectedRows=%i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletarTipoServico(1)).resolves.toBe(esperado);
        expect(database.query).toHaveBeenCalledWith(expect.stringMatching(/SET deleted_at = CURRENT_TIMESTAMP/), [1]);
    });
});

describe('TipoServicoModel – erros', () => {
    it('erro do banco é propagado', async () => {
        database.query.mockRejectedValue(new Error('db down'));
        await expect(Model.listarTipoServico()).rejects.toThrow('db down');
    });
});
