// /src/tests/unit/controllers/sistema/EmpresaController.test.js

jest.mock('../../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../../services/sistema/EmpresaService', () => ({
    criar: jest.fn(), listar: jest.fn(), buscarEmpresaPorId: jest.fn(),
    atualizar: jest.fn(), deletar: jest.fn()
}));

const { mockReq, mockRes } = require('../../../helpers/http');
const S = require('../../../../services/sistema/EmpresaService');
const { MENSAGENS } = require('../../../../utils/constants');
const ctrl = require('../../../../controllers/sistema/EmpresaController');

const run = async (fn, req) => {
    const res = mockRes(); const next = jest.fn();
    await fn(req, res, next);
    return { res, next, body: res.json.mock.calls[0]?.[0] };
};

beforeEach(() => jest.clearAllMocks());

describe('criar', () => {
    it('sem arquivos repassa body intacto', async () => {
        S.criar.mockResolvedValue({ id: 1 });
        const { res, body } = await run(ctrl.criar, mockReq({ body: { nom_fantasia: 'X' } }));
        expect(S.criar).toHaveBeenCalledWith({ nom_fantasia: 'X' }, 1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(body.mensagem).toBe(MENSAGENS.SUCESSO.CRIADO);
    });

    it('substitui campos de logo pelo file.path', async () => {
        const files = {
            des_url_logo_vertical: [{ path: 'uploads/v.png' }],
            des_url_logo_horizontal_negativa: [{ path: 'uploads/hn.png' }],
            des_url_logo_horizontal: [], // vazio → ignorado
            campo_estranho: [{ path: 'uploads/hack.png' }] // fora da whitelist
        };
        await run(ctrl.criar, mockReq({ body: { des_url_logo_horizontal: 'manter' }, files }));
        const dados = S.criar.mock.calls[0][0];
        expect(dados).toEqual({
            des_url_logo_vertical: 'uploads/v.png',
            des_url_logo_horizontal_negativa: 'uploads/hn.png',
            des_url_logo_horizontal: 'manter'
        });
    });

    it('não muta req.body', async () => {
        const body = { a: 1 };
        await run(ctrl.criar, mockReq({ body, files: { des_url_logo_vertical: [{ path: 'p' }] } }));
        expect(body).toEqual({ a: 1 });
    });
});

it('listarEmpresa', async () => {
    S.listar.mockResolvedValue([{}, {}]);
    const { body } = await run(ctrl.listarEmpresa, mockReq());
    expect(S.listar).toHaveBeenCalledWith(1);
    expect(body.dados).toHaveLength(2);
});

// BUG: "mensagem" recebe número (length), não string
it.failing('listarEmpresa: mensagem deve ser string', async () => {
    S.listar.mockResolvedValue([{}]);
    const { body } = await run(ctrl.listarEmpresa, mockReq());
    expect(typeof body.mensagem).toBe('string');
});

it('buscarEmpresaPorId, atualizar e deletar', async () => {
    S.buscarEmpresaPorId.mockResolvedValue({ id: 3 });
    await run(ctrl.buscarEmpresaPorId, mockReq({ params: { id: '3' } }));
    await run(ctrl.atualizar, mockReq({ params: { id: '3' }, body: { nom_fantasia: 'N' } }));
    const { body } = await run(ctrl.deletar, mockReq({ params: { id: '3' } }));
    expect(S.buscarEmpresaPorId).toHaveBeenCalledWith('3', 1);
    expect(S.atualizar).toHaveBeenCalledWith('3', { nom_fantasia: 'N' }, 1);
    expect(S.deletar).toHaveBeenCalledWith('3', 1);
    expect(body.mensagem).toBe(MENSAGENS.SUCESSO.DELETADO);
});

it('erro de criação vai para next', async () => {
    const erro = new Error('CNPJ duplicado');
    S.criar.mockRejectedValue(erro);
    const { next } = await run(ctrl.criar, mockReq());
    expect(next).toHaveBeenCalledWith(erro);
});
