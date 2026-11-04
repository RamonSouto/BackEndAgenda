// /src/tests/unit/controllers/sistema/ParametrizacaoController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/sistema/ParametrizacaoService', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarParametrizacaoPorId: jest.fn(),
    atualizar: jest.fn(), deletar: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/sistema/ParametrizacaoService');
const { MENSAGENS } = require('../../../../utils/constants');
const ctrl = require('../../../../controllers/sistema/ParametrizacaoController');

const run = async (fn, req) => {
    const res = mockRes(); await fn(req, res, jest.fn());
    return { res, body: res.json.mock.calls[0][0] };
};

const body = { des_tipo_dia: 'UTIL', hra_inicio: '08:00:00', hra_fim: '18:00:00', qtd_minutos_intervalo: 60, ind_ativo: true };

beforeEach(() => jest.clearAllMocks());

it('criar → 201', async () => {
    S.criar.mockResolvedValue({ id: 1, ...body });
    const { res, body: b } = await run(ctrl.criar, mockReq({ body }));
    expect(S.criar).toHaveBeenCalledWith(body, 1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(b.mensagem).toBe(MENSAGENS.SUCESSO.CRIADO);
});

it('listarParametrizacao conta registros', async () => {
    S.listar.mockResolvedValue([{}, {}]);
    const { body: b } = await run(ctrl.listarParametrizacao, mockReq());
    expect(S.listar).toHaveBeenCalledWith(1);
    expect(b.parametro).toBe(2);
});

it('buscarParametrizacaoPorId e atualizar repassam id', async () => {
    S.buscarParametrizacaoPorId.mockResolvedValue({ id: 1 });
    S.atualizar.mockResolvedValue({ id: 1 });
    await run(ctrl.buscarParametrizacaoPorId, mockReq({ params: { id: '1' } }));
    await run(ctrl.atualizar, mockReq({ params: { id: '1' }, body: { qtd_minutos_intervalo: 90 } }));
    expect(S.buscarParametrizacaoPorId).toHaveBeenCalledWith('1', 1);
    expect(S.atualizar).toHaveBeenCalledWith('1', { qtd_minutos_intervalo: 90 }, 1);
});

// BUG: atualizar devolve objeto; "parametro: .length" fica undefined e não traz mensagem
it.failing('atualizar responde com mensagem ATUALIZADO', async () => {
    S.atualizar.mockResolvedValue({ id: 1 });
    const { body: b } = await run(ctrl.atualizar, mockReq({ params: { id: '1' } }));
    expect(b.mensagem).toBe(MENSAGENS.SUCESSO.ATUALIZADO);
});

it('deletar', async () => {
    const { body: b } = await run(ctrl.deletar, mockReq({ params: { id: '1' } }));
    expect(S.deletar).toHaveBeenCalledWith('1', 1);
    expect(b.mensagem).toBe(MENSAGENS.SUCESSO.DELETADO);
});
