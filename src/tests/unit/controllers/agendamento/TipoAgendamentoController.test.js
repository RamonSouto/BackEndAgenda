// /src/tests/unit/controllers/agendamento/TipoAgendamentoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/agendamento/TipoAgendamentoService', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarPorId: jest.fn(), atualizar: jest.fn(), deletar: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/agendamento/TipoAgendamentoService');
const ctrl = require('../../../../controllers/agendamento/TipoAgendamentoController');

const run = async (fn, req) => { const res = mockRes(); await fn(req, res, jest.fn()); return res; };

beforeEach(() => jest.clearAllMocks());

it('criar → 201', async () => {
    const res = await run(ctrl.criar, mockReq({ body: { des_tipo_agendamento: 'Prova' } }));
    expect(S.criar).toHaveBeenCalledWith({ des_tipo_agendamento: 'Prova' }, 1);
    expect(res.status).toHaveBeenCalledWith(201);
});

it('listar devolve total', async () => {
    S.listar.mockResolvedValue([{}, {}, {}]);
    const res = await run(ctrl.listar, mockReq());
    expect(res.json.mock.calls[0][0].total).toBe(3);
});

// BUG: JSDoc documenta ?apenasAtivos=true, mas a query é ignorada
it.failing('listar repassa apenasAtivos', async () => {
    S.listar.mockResolvedValue([]);
    await run(ctrl.listar, mockReq({ query: { apenasAtivos: 'true' } }));
    expect(S.listar.mock.calls[0]).toContainEqual(expect.objectContaining({ apenasAtivos: 'true' }));
});

it('buscarPorId, atualizar e deletar', async () => {
    await run(ctrl.buscarPorId, mockReq({ params: { id: '2' } }));
    await run(ctrl.atualizar, mockReq({ params: { id: '2' }, body: { ind_ativo: false } }));
    await run(ctrl.deletar, mockReq({ params: { id: '2' } }));
    expect(S.buscarPorId).toHaveBeenCalledWith('2', 1);
    expect(S.atualizar).toHaveBeenCalledWith('2', { ind_ativo: false }, 1);
    expect(S.deletar).toHaveBeenCalledWith('2', 1);
});
