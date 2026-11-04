// /src/tests/unit/models/agendamento/AgendamentoProdutoModel.test.js

jest.mock('../../../config/database', () => ({ query: jest.fn() }));
const database = require('../../../config/database');
const Model = require('../../../models/agendamento/AgendamentoProdutoModel');

describe('AgendamentoProdutoModel.buscarPrecoVigente', () => {
    it('usa a connection quando informada', async () => {
        const conn = { execute: jest.fn().mockResolvedValue([[{ val_preco: 50 }]]) };
        await expect(Model.buscarPrecoVigente(1, conn)).resolves.toEqual({ val_preco: 50 });
        expect(conn.execute).toHaveBeenCalledWith(expect.any(String), [1]);
        expect(database.query).not.toHaveBeenCalled();
    });

    it('retorna null sem preço cadastrado', async () => {
        database.query.mockResolvedValue([]);
        await expect(Model.buscarPrecoVigente(1)).resolves.toBeNull();
    });
});
