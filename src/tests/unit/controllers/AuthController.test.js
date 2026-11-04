// /src/tests/unit/controllers/AuthController.test.js

jest.mock('../../../middlewares/errorMiddleware', () => ({
    asyncHandler: require('../../helpers/http').asyncHandlerMock
}));
jest.mock('../../../services/AuthService', () => ({
    login: jest.fn(), logout: jest.fn(), alterarSenha: jest.fn(), resetarSenha: jest.fn()
}));
jest.mock('../../../services/PessoaService', () => ({ buscarPorId: jest.fn() }));

const { mockReq, mockRes } = require('../../helpers/http');
const AuthService = require('../../../services/AuthService');
const PessoaService = require('../../../services/PessoaService');
const ctrl = require('../../../controllers/AuthController');

const run = async (fn, req) => {
    const res = mockRes(); const next = jest.fn();
    await fn(req, res, next);
    return { res, next };
};

beforeEach(() => jest.clearAllMocks());

describe('login', () => {
    it('400 sem credenciais', async () => {
        const { res } = await run(ctrl.login, mockReq({ body: { user: 'x' } }));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(AuthService.login).not.toHaveBeenCalled();
    });

    it('prioriza ipAddress e repassa user-agent', async () => {
        AuthService.login.mockResolvedValue({ token: 't' });
        const { res } = await run(ctrl.login, mockReq({ body: { user: 'u', senha: 's' }, ipAddress: '2.2.2.2' }));
        expect(AuthService.login).toHaveBeenCalledWith('u', 's', '2.2.2.2', 'jest-agent');
        expect(res.json.mock.calls[0][0]).toMatchObject({ sucesso: true, dados: { token: 't' } });
    });

    it('erro do service vai para next', async () => {
        const erro = new Error('x');
        AuthService.login.mockRejectedValue(erro);
        const { next } = await run(ctrl.login, mockReq({ body: { user: 'u', senha: 's' } }));
        expect(next).toHaveBeenCalledWith(erro);
    });
});

it('logout usa req.ip como fallback', async () => {
    await run(ctrl.logout, mockReq());
    expect(AuthService.logout).toHaveBeenCalledWith(1, '1.1.1.1', 'jest-agent');
});

it('verificarToken devolve req.usuario', async () => {
    const { res } = await run(ctrl.verificarToken, mockReq());
    expect(res.json.mock.calls[0][0].dados.usuario).toEqual({ id: 1, tipo: 'administrador' });
});

describe('alterarSenha', () => {
    const body = (b) => mockReq({ body: b });

    it.each([
        [{ senha_atual: 'a' }, 'Todos os campos são obrigatórios'],
        [{ senha_atual: 'a', nova_senha: '123456', confirmar_senha: '654321' }, 'Nova senha e confirmação não coincidem'],
        [{ senha_atual: 'a', nova_senha: '123', confirmar_senha: '123' }, 'Nova senha deve ter no mínimo 6 caracteres']
    ])('400: %p', async (b, erro) => {
        const { res } = await run(ctrl.alterarSenha, body(b));
        expect(res.json.mock.calls[0][0].erro).toBe(erro);
        expect(AuthService.alterarSenha).not.toHaveBeenCalled();
    });

    it('sucesso', async () => {
        await run(ctrl.alterarSenha, body({ senha_atual: 'a', nova_senha: '123456', confirmar_senha: '123456' }));
        expect(AuthService.alterarSenha).toHaveBeenCalledWith(1, 'a', '123456');
    });

    // BUG: número não tem .length → validação de tamanho é ignorada
    it.failing('rejeita nova_senha não-string', async () => {
        const { res } = await run(ctrl.alterarSenha, body({ senha_atual: 'a', nova_senha: 1, confirmar_senha: 1 }));
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('resetarSenha', () => {
    it('400 sem campos', async () => {
        const { res } = await run(ctrl.resetarSenha, mockReq({ body: {} }));
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('repassa id do admin para auditoria', async () => {
        await run(ctrl.resetarSenha, mockReq({ body: { num_cpf: '111', nova_senha: '123456' } }));
        expect(AuthService.resetarSenha).toHaveBeenCalledWith('111', '123456', 1);
    });

    it('400 com senha curta', async () => {
        const { res } = await run(ctrl.resetarSenha, mockReq({ body: { num_cpf: '111', nova_senha: '123' } }));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(AuthService.resetarSenha).not.toHaveBeenCalled();
    });
});

it('obterPerfil busca o próprio usuário', async () => {
    PessoaService.buscarPorId.mockResolvedValue({ id: 1 });
    const { res } = await run(ctrl.obterPerfil, mockReq());
    expect(PessoaService.buscarPorId).toHaveBeenCalledWith(1, 1);
    expect(res.json.mock.calls[0][0].dados).toEqual({ id: 1 });
});
