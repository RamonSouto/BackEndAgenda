// /src/tests/unit/controllers/sistema/EstadoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/sistema/EstadoService', () => ({
    listarEstados: jest.fn(), buscarEstadoId: jest.fn(),
    buscarEstadoNome: jest.fn(), buscarEstadoSgl: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/sistema/EstadoService');
const ctrl = require('../../../../controllers/sistema/EstadoController');

const run = async (fn, req) => {
    const res = mockRes(); await fn(req, res, jest.fn());
    return res.json.mock.calls[0][0];
};

beforeEach(() => jest.clearAllMocks());

it('listarEstados', async () => {
    S.listarEstados.mockResolvedValue([{}, {}, {}]);
    const body = await run(ctrl.listarEstados, mockReq());
    expect(S.listarEstados).toHaveBeenCalledWith(1);
    expect(body.estados).toBe(3);
});

it.each([
    ['buscarEstadoId', { id: '1' }, '1'],
    ['buscarEstadoNome', { nome: 'São Paulo' }, 'São Paulo'],
    ['buscarEstadoSgl', { sgl: 'SP' }, 'SP']
])('%s repassa parâmetro e usuário', async (m, params, esperado) => {
    S[m].mockResolvedValue([{ sgl: 'SP' }]);
    const body = await run(ctrl[m], mockReq({ params }));
    expect(S[m]).toHaveBeenCalledWith(esperado, 1);
    expect(body.estados).toBe(1);
});

// BUG: buscarEstadoId usa estado.length; com objeto único, a contagem some
it.failing('buscarEstadoId com objeto único informa contagem', async () => {
    S.buscarEstadoId.mockResolvedValue({ id: 1 });
    const body = await run(ctrl.buscarEstadoId, mockReq({ params: { id: '1' } }));
    expect(body.estados).toBe(1);
});
