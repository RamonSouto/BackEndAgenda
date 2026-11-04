// /src/tests/unit/controllers/agendamento/AgendamentoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/agendamento/AgendamentoService', () => ({
    criar: jest.fn(), listarAgendamentos: jest.fn(), buscarAgendamentoCompleto: jest.fn(),
    atualizar: jest.fn(), trocarCostureira: jest.fn(), alterarStatus: jest.fn(),
    deletarAgendamento: jest.fn(), verificarDisponibilidade: jest.fn(),
    criarAgendamentoPublico: jest.fn(), buscarPorUuidPublico: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/agendamento/AgendamentoService');
const ctrl = require('../../../../controllers/agendamento/AgendamentoController');

const run = async (fn, req) => { const res = mockRes(); await fn(req, res, jest.fn()); return res; };
const usuario = { id: 1, tipo: 'administrador' };

beforeEach(() => jest.clearAllMocks());

it('criar → 201 com id do usuário', async () => {
    const res = await run(ctrl.criar, mockReq({ body: { a: 1 } }));
    expect(S.criar).toHaveBeenCalledWith({ a: 1 }, 1);
    expect(res.status).toHaveBeenCalledWith(201);
});

it('listar devolve total real do service', async () => {
    S.listarAgendamentos.mockResolvedValue({ dados: [{}], total: 42 });
    const res = await run(ctrl.listar, mockReq({ query: { pagina: '2' } }));
    expect(S.listarAgendamentos).toHaveBeenCalledWith({ pagina: '2' }, usuario);
    expect(res.json.mock.calls[0][0].total).toBe(42);
});

it('buscarPorId, atualizar e deletar', async () => {
    await run(ctrl.buscarPorId, mockReq({ params: { id: '10' } }));
    await run(ctrl.atualizar, mockReq({ params: { id: '10' }, body: { x: 1 } }));
    await run(ctrl.deletar, mockReq({ params: { id: '10' } }));
    expect(S.buscarAgendamentoCompleto).toHaveBeenCalledWith('10', usuario);
    expect(S.atualizar).toHaveBeenCalledWith('10', { x: 1 }, 1);
    expect(S.deletarAgendamento).toHaveBeenCalledWith('10', 1);
});

it('trocarCostureira e atualizarStatus repassam usuário completo', async () => {
    await run(ctrl.trocarCostureira, mockReq({ params: { id: '10' }, body: { id_costureira: 3, des_motivo: 'm' } }));
    await run(ctrl.atualizarStatus, mockReq({ params: { id: '10' }, body: { status: 'confirmado' } }));
    expect(S.trocarCostureira).toHaveBeenCalledWith('10', 3, 'm', usuario);
    expect(S.alterarStatus).toHaveBeenCalledWith('10', 'confirmado', usuario);
});

describe('verificarDisponibilidade', () => {
    it.each([
        [{ data: '2026-11-20 14:00:00' }],
        [{ id_costureira: 'abc', data: 'x' }],
        [{ id_costureira: '-1', data: 'x' }],
        [{ id_costureira: '3', data: ['a', 'b'] }]
    ])('400 para %p', async (query) => {
        const res = await run(ctrl.verificarDisponibilidade, mockReq({ query }));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(S.verificarDisponibilidade).not.toHaveBeenCalled();
    });

    it('converte id para número', async () => {
        await run(ctrl.verificarDisponibilidade, mockReq({ query: { id_costureira: '3', data: '2026-11-20 14:00:00' } }));
        expect(S.verificarDisponibilidade).toHaveBeenCalledWith(3, '2026-11-20 14:00:00');
    });

    it('alias público é a mesma função', () => {
        expect(ctrl.verificarDisponibilidadePublica).toBe(ctrl.verificarDisponibilidade);
    });
});

it('fluxo público não depende de req.usuario', async () => {
    const req = mockReq({ body: { num_cpf: '111' }, params: { uuid: 'u' }, usuario: undefined });
    const res = await run(ctrl.criarPublico, req);
    await run(ctrl.buscarPorUuidPublico, req);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(S.criarAgendamentoPublico).toHaveBeenCalledWith({ num_cpf: '111' });
    expect(S.buscarPorUuidPublico).toHaveBeenCalledWith('u');
});
