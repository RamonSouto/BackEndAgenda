// /src/tests/unit/controllers/agendamento/AgendamentoProdutoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/agendamento/AgendamentoProdutoService', () => ({
    adicionarItem: jest.fn(), listarPorAgendamento: jest.fn(), buscarPorId: jest.fn(),
    atualizar: jest.fn(), deletarItem: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/agendamento/AgendamentoProdutoService');
const ctrl = require('../../../../controllers/agendamento/AgendamentoProdutoController');

const run = async (fn, req) => { const res = mockRes(); await fn(req, res, jest.fn()); return res; };
const params = { idAgendamento: '1', idItem: '3' };
const usuario = { id: 1, tipo: 'administrador' };

beforeEach(() => jest.clearAllMocks());

it('adicionarItem: id da rota sobrescreve o do body', async () => {
    const res = await run(ctrl.adicionarItem, mockReq({ params, body: { id_agendamento: 999, id_produto_grade: 2 } }));
    expect(S.adicionarItem).toHaveBeenCalledWith({ id_agendamento: '1', id_produto_grade: 2 }, usuario);
    expect(res.status).toHaveBeenCalledWith(201);
});

it('listarPorAgendamento devolve total', async () => {
    S.listarPorAgendamento.mockResolvedValue([{}, {}]);
    const res = await run(ctrl.listarPorAgendamento, mockReq({ params }));
    expect(res.json.mock.calls[0][0].total).toBe(2);
});

it('buscarPorId, atualizar e deletar usam os dois ids', async () => {
    await run(ctrl.buscarPorId, mockReq({ params }));
    await run(ctrl.atualizar, mockReq({ params, body: { ind_status: 'producao' } }));
    await run(ctrl.deletar, mockReq({ params }));
    expect(S.buscarPorId).toHaveBeenCalledWith('1', '3', usuario);
    expect(S.atualizar).toHaveBeenCalledWith('1', '3', { ind_status: 'producao' }, usuario);
    expect(S.deletarItem).toHaveBeenCalledWith('1', '3', usuario);
});
