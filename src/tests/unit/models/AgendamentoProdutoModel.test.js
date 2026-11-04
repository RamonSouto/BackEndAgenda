// /src/tests/unit/models/AgendamentoProdutoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../../utils/sqlUtils', () => ({
    montarUpdate: jest.fn(() => ({ set: 'ind_status = ?', valores: ['concluido'] }))
}));

const database = require('../../../config/database');
const { montarUpdate } = require('../../../utils/sqlUtils');
const Model = require('../../../models/agendamento/AgendamentoProdutoModel');

beforeEach(() => jest.clearAllMocks());

describe('buscarPrecoVigente', () => {
    it('usa a connection quando informada', async () => {
        const conn = { execute: jest.fn().mockResolvedValue([[{ val_preco: 50 }]]) };
        await expect(Model.buscarPrecoVigente(4, conn)).resolves.toEqual({ val_preco: 50 });
        expect(conn.execute).toHaveBeenCalledWith(expect.stringContaining('tab_preco_produto_servico'), [4]);
        expect(database.query).not.toHaveBeenCalled();
    });

    it('connection sem resultado → null', async () => {
        const conn = { execute: jest.fn().mockResolvedValue([[]]) };
        await expect(Model.buscarPrecoVigente(4, conn)).resolves.toBeNull();
    });

    it('pool: retorna 1ª linha', async () => {
        database.query.mockResolvedValue([{ val_preco: 30 }]);
        await expect(Model.buscarPrecoVigente(1)).resolves.toEqual({ val_preco: 30 });
    });

    it('pool sem preço cadastrado → null', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model.buscarPrecoVigente(1)).resolves.toBeNull();
    });
});

describe('criar', () => {
    const base = { id_agendamento: 1, id_tipo_agendamento: 2, id_produto_grade: 3, id_produto_servico: 4, val_preco_servico: 50 };

    it('aplica defaults (ajuste null, desconto 0)', async () => {
        database.query.mockResolvedValue({ insertId: 9 });
        await expect(Model.criar(base)).resolves.toBe(9);
        expect(database.query.mock.calls[0][1]).toEqual([1, 2, 3, 4, null, 50, 0]);
    });

    it('usa valores informados', async () => {
        database.query.mockResolvedValue({ insertId: 10 });
        await Model.criar({ ...base, des_ajuste_produto: 'barra', val_desconto_servico: 5 });
        expect(database.query.mock.calls[0][1]).toEqual([1, 2, 3, 4, 'barra', 50, 5]);
    });
});

describe('buscarPorId', () => {
    it('retorna 1ª linha', async () => {
        database.query.mockResolvedValue([{ id: 1 }]);
        await expect(Model.buscarPorId(1)).resolves.toEqual({ id: 1 });
    });
    it('inexistente → null', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model.buscarPorId(1)).resolves.toBeNull();
    });
});

it('listarPorAgendamento repassa id', async () => {
    database.query.mockResolvedValue([{ id: 1 }]);
    await expect(Model.listarPorAgendamento(7)).resolves.toEqual([{ id: 1 }]);
    expect(database.query.mock.calls[0][1]).toEqual([7]);
});

describe('atualizar', () => {
    it.each([[1, true], [0, false]])('affectedRows %i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.atualizar(5, { ind_status: 'concluido' })).resolves.toBe(esperado);
        expect(montarUpdate).toHaveBeenCalledWith({ ind_status: 'concluido' }, expect.arrayContaining(['ind_status']));
        expect(database.query.mock.calls[0]).toEqual([expect.stringContaining('SET ind_status = ?'), ['concluido', 5]]);
    });
});

describe('deletar', () => {
    it.each([[1, true], [0, false]])('affectedRows %i → %s', async (rows, esperado) => {
        database.query.mockResolvedValue({ affectedRows: rows });
        await expect(Model.deletar(1, 3)).resolves.toBe(esperado);
        expect(database.query.mock.calls[0][1]).toEqual([3, 1]);
    });
});
