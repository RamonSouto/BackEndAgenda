// /src/tests/unit/controllers/sistema/CidadeController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/sistema/CidadeService', () => ({
    listarCidades: jest.fn(), buscarCidadeId: jest.fn(),
    buscarCidadeNome: jest.fn(), buscarCidadeEstadoId: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/sistema/CidadeService');
const ctrl = require('../../../../controllers/sistema/CidadeController');

const run = async (fn, req) => {
    const res = mockRes(); const next = jest.fn();
    await fn(req, res, next);
    return { res, next, body: res.json.mock.calls[0]?.[0] };
};

beforeEach(() => jest.clearAllMocks());

it('listarCidades devolve contagem', async () => {
    S.listarCidades.mockResolvedValue([{}, {}]);
    const { res, body } = await run(ctrl.listarCidades, mockReq());
    expect(S.listarCidades).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body).toEqual({ sucesso: true, cidades: 2, dados: [{}, {}] });
});

it('buscarCidadeId devolve objeto sem contagem', async () => {
    S.buscarCidadeId.mockResolvedValue({ id: 7 });
    const { body } = await run(ctrl.buscarCidadeId, mockReq({ params: { id: '7' } }));
    expect(S.buscarCidadeId).toHaveBeenCalledWith('7', 1);
    expect(body).toEqual({ sucesso: true, dados: { id: 7 } });
});

it.each([
    ['buscarCidadeNome', { nome: 'Rio' }, 'Rio'],
    ['buscarCidadeEstadoId', { id: '9' }, '9']
])('%s repassa parâmetro e conta', async (m, params, esperado) => {
    S[m].mockResolvedValue([{}]);
    const { body } = await run(ctrl[m], mockReq({ params }));
    expect(S[m]).toHaveBeenCalledWith(esperado, 1);
    expect(body.cidades).toBe(1);
});

it('erro do service vai para next', async () => {
    const erro = new Error('db');
    S.listarCidades.mockRejectedValue(erro);
    const { next } = await run(ctrl.listarCidades, mockReq());
    expect(next).toHaveBeenCalledWith(erro);
});
