// /src/tests/unit/controllers/PessoaController.test.js

jest.mock('../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../services/PessoaService', () => ({
    criar: jest.fn(), buscarPorId: jest.fn(), buscarPorCPF: jest.fn(), listar: jest.fn(),
    listarPorPapel: jest.fn(), atualizar: jest.fn(), deletar: jest.fn(),
    ativarDesativar: jest.fn(), listarCostureirasDisponiveis: jest.fn()
}));

const { mockReq, mockRes } = require('../../helpers/http');
const S = require('../../../services/PessoaService');
const ctrl = require('../../../controllers/PessoaController');

const run = async (fn, req) => { const res = mockRes(); await fn(req, res, jest.fn()); return res; };

beforeEach(() => jest.clearAllMocks());

it('criar → 201', async () => {
    S.criar.mockResolvedValue({ id: 5 });
    const res = await run(ctrl.criar, mockReq({ body: { nom_completo: 'A' } }));
    expect(S.criar).toHaveBeenCalledWith({ nom_completo: 'A' }, 1);
    expect(res.status).toHaveBeenCalledWith(201);
});

it.each([
    ['buscarPorId', { id: '3' }, '3'],
    ['buscarPorCPF', { cpf: '111' }, '111']
])('%s repassa parâmetro e usuário', async (m, params, esperado) => {
    await run(ctrl[m], mockReq({ params }));
    expect(S[m]).toHaveBeenCalledWith(esperado, 1);
});

it('listar mapeia query status → ind_status', async () => {
    S.listar.mockResolvedValue([{}, {}]);
    const res = await run(ctrl.listar, mockReq({ query: { papel: 'medico', status: 'ativo', busca: 'jo' } }));
    expect(S.listar).toHaveBeenCalledWith({ papel: 'medico', ind_status: 'ativo', busca: 'jo' }, 1);
    expect(res.json.mock.calls[0][0].total).toBe(2);
});

describe('listarPorPapel', () => {
    it('400 para papel inválido', async () => {
        const res = await run(ctrl.listarPorPapel, mockReq({ params: { papel: 'hacker' } }));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(S.listarPorPapel).not.toHaveBeenCalled();
    });

    it('papel válido', async () => {
        S.listarPorPapel.mockResolvedValue([]);
        await run(ctrl.listarPorPapel, mockReq({ params: { papel: 'costureira' } }));
        expect(S.listarPorPapel).toHaveBeenCalledWith('costureira', 1);
    });
});

it.each([['ativar', 'ativo'], ['desativar', 'inativo']])('%s → %s', async (m, status) => {
    await run(ctrl[m], mockReq({ params: { id: '2' } }));
    expect(S.ativarDesativar).toHaveBeenCalledWith('2', status, 1);
});

it('atualizar e deletar', async () => {
    await run(ctrl.atualizar, mockReq({ params: { id: '2' }, body: { a: 1 } }));
    await run(ctrl.deletar, mockReq({ params: { id: '2' } }));
    expect(S.atualizar).toHaveBeenCalledWith('2', { a: 1 }, 1);
    expect(S.deletar).toHaveBeenCalledWith('2', 1);
});

it('listarCostureirasDisponiveis conta disponíveis', async () => {
    S.listarCostureirasDisponiveis.mockResolvedValue([{ disponivel: true }, { disponivel: false }]);
    const res = await run(ctrl.listarCostureirasDisponiveis, mockReq());
    expect(res.json.mock.calls[0][0]).toMatchObject({ total: 2, disponiveis: 1 });
});

it.each([
    ['listarPacientes', 'paciente'],
    ['listarSecretarias', 'secretaria'],
    ['listarCostureiras', 'costureira']
])('%s usa papel %s', async (m, papel) => {
    S.listarPorPapel.mockResolvedValue([]);
    await run(ctrl[m], mockReq());
    expect(S.listarPorPapel).toHaveBeenCalledWith(papel, 1);
});
