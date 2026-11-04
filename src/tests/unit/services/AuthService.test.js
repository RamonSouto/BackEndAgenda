// /src/tests/unit/services/AuthService.test.js

jest.mock('../../../models/PessoaModel', () => ({
    buscarPorCPF: jest.fn(), buscarPorId: jest.fn(), atualizar: jest.fn(), verificarBloqueio: jest.fn(),
    incrementarTentativasLogin: jest.fn(), bloquearLogin: jest.fn(), resetarTentativasLogin: jest.fn()
}));
jest.mock('../../../services/LogService', () => ({ registrar: jest.fn() }));
jest.mock('../../../config/env', () => ({
    auth: { lockTime: 30, maxLoginAttempts: 3 },
    jwt: { secret: 'segredo-teste', expiresIn: '1h' }
}));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async (s) => `hash:${s}`), compare: jest.fn() }));

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
const { UnauthorizedError } = require('../../../utils/ApiError');
const Service = require('../../../services/AuthService');

const CPF = '11144477735';
const MIN = 60 * 1000;
const usuario = (extra = {}) => ({
    id: 1, ind_status: 'ativo', ind_secretaria: 1, des_senha: 'h',
    nom_completo: 'Ana', num_cpf: CPF, des_email_1: 'ana@x.com', ...extra
});

beforeEach(() => {
    jest.clearAllMocks();
    PessoaModel.buscarPorCPF.mockResolvedValue(usuario());
    PessoaModel.verificarBloqueio.mockResolvedValue({ num_tentativas_login: 0, dta_bloqueio_login: null });
    bcrypt.compare.mockResolvedValue(true);
});

describe('AuthService – papéis e permissões', () => {
    it('extrairPapeis / possuiAlgumPapel', () => {
        expect(Service.extrairPapeis({ ind_costureira: 1, ind_paciente: 1 })).toEqual(['costureira', 'paciente']);
        expect(Service.possuiAlgumPapel({ ind_paciente: 1 }, ['medico'])).toBe(false);
        expect(Service.possuiAlgumPapel({ ind_medico: 1 }, ['medico'])).toBe(true);
    });
    it('administrador → ["*"]', () => {
        expect(Service.obterPermissoesUsuario({ ind_administrador: 1 })).toEqual(['*']);
    });
    it('sem papéis → []', () => {
        expect(Service.obterPermissoesUsuario({})).toEqual([]);
    });
    it('secretaria deveria ter permissões (forEach usa variável errada)', () => {
        expect(Service.obterPermissoesUsuario({ ind_secretaria: 1 })).toContain('agendamento:criar');
    });
    it('verificarPermissao: inexistente → false; admin → true', async () => {
        PessoaModel.buscarPorId.mockResolvedValueOnce(null).mockResolvedValueOnce({ ind_administrador: 1 });
        await expect(Service.verificarPermissao(1, 'x')).resolves.toBe(false);
        await expect(Service.verificarPermissao(1, 'x')).resolves.toBe(true);
    });
    it('verificarPermissao de médico deveria funcionar', async () => {
        PessoaModel.buscarPorId.mockResolvedValue({ ind_medico: 1 });
        await expect(Service.verificarPermissao(1, 'relatorio:visualizar')).resolves.toBe(true);
    });
    it('possuiAlgumPapel sem lista → false (default [])', () => {
        expect(Service.possuiAlgumPapel({ ind_medico: 1 })).toBe(false);
    });

    it('papel sem entrada em PERMISSOES → [] (fallback)', () => {
        const { PERMISSOES } = require('../../../utils/constants');
        const original = PERMISSOES.paciente;
        delete PERMISSOES.paciente;
        try {
            expect(Service.obterPermissoesUsuario({ ind_paciente: 1 })).toEqual([]);
        } finally {
            if (original !== undefined) PERMISSOES.paciente = original;
        }
    });
});

describe('AuthService.login – falhas', () => {
    it('CPF não encontrado → UnauthorizedError e log sem id_usuario', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(null);
        await expect(Service.login(CPF, 'x', 'ip', 'ua')).rejects.toBeInstanceOf(UnauthorizedError);
        expect(LogService.registrar.mock.calls[0][0]).not.toHaveProperty('id_usuario');
    });
    it.each([
        [{ ind_status: 'inativo' }, 'Usuário inativo'],
        [{ ind_secretaria: 0, ind_paciente: 1 }, 'Usuário sem permissão de acesso']
    ])('%j', async (extra, msg) => {
        PessoaModel.buscarPorCPF.mockResolvedValue(usuario(extra));
        await expect(Service.login(CPF, 'x')).rejects.toThrow(msg);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    it('conta bloqueada recentemente', async () => {
        PessoaModel.verificarBloqueio.mockResolvedValue({ num_tentativas_login: 3, dta_bloqueio_login: new Date(Date.now() - 10 * MIN) });
        await expect(Service.login(CPF, 'x')).rejects.toThrow(/Tente novamente em 20 minutos/);
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    it('senha inválida incrementa e informa restantes', async () => {
        bcrypt.compare.mockResolvedValue(false);
        await expect(Service.login(CPF, 'x')).rejects.toThrow('Credenciais inválidas. 2 tentativas restantes.');
        expect(PessoaModel.incrementarTentativasLogin).toHaveBeenCalledWith(1);
        expect(PessoaModel.bloquearLogin).not.toHaveBeenCalled();
    });
    it('atingir o máximo bloqueia', async () => {
        bcrypt.compare.mockResolvedValue(false);
        PessoaModel.verificarBloqueio.mockResolvedValue({ num_tentativas_login: 2, dta_bloqueio_login: null });
        await expect(Service.login(CPF, 'x')).rejects.toThrow('Conta bloqueada por excesso de tentativas');
        expect(PessoaModel.bloquearLogin).toHaveBeenCalledWith(1);
    });
    it.failing('após desbloqueio automático, 1 erro NÃO deveria rebloquear (contador obsoleto)', async () => {
        PessoaModel.verificarBloqueio.mockResolvedValue({ num_tentativas_login: 3, dta_bloqueio_login: new Date(Date.now() - 60 * MIN) });
        bcrypt.compare.mockResolvedValue(false);
        await expect(Service.login(CPF, 'x')).rejects.toThrow(/2 tentativas restantes/);
        expect(PessoaModel.bloquearLogin).not.toHaveBeenCalled();
    });
    it.failing('usuário inativo deveria ser 401', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(usuario({ ind_status: 'inativo' }));
        await expect(Service.login(CPF, 'x')).rejects.toMatchObject({ statusCode: 401 });
    });
    it.failing('CPF com máscara deveria ser limpo antes da busca', async () => {
        await Service.login('111.444.777-35', 'x');
        expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith(CPF);
    });
    it.failing('usuário sem senha cadastrada deveria dar credenciais inválidas', async () => {
        const real = jest.requireActual('bcryptjs');
        bcrypt.compare.mockImplementation(real.compare);
        PessoaModel.buscarPorCPF.mockResolvedValue(usuario({ des_senha: null }));
        await expect(Service.login(CPF, 'x')).rejects.toThrow(/Credenciais inválidas/);
    });
});

describe('AuthService.login – sucesso', () => {
    it('reseta tentativas, gera token, loga e oculta CPF', async () => {
        const r = await Service.login(CPF, 'senha', 'ip', 'ua');
        expect(PessoaModel.resetarTentativasLogin).toHaveBeenCalledWith(1);
        expect(jwt.verify(r.token, 'segredo-teste')).toMatchObject({ id: 1, papeis: ['secretaria'] });
        expect(r.usuario).toMatchObject({ id: 1, nome: 'Ana', email: 'ana@x.com', indicadores: { ind_secretaria: true, ind_medico: false } });
        expect(r.usuario).not.toHaveProperty('cpf');
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_detalhes: { sucesso: true, papeis: ['secretaria'] } }));
    });
    it('bloqueio expirado desbloqueia e prossegue', async () => {
        PessoaModel.verificarBloqueio.mockResolvedValue({ num_tentativas_login: 3, dta_bloqueio_login: new Date(Date.now() - 31 * MIN) });
        await expect(Service.login(CPF, 'senha')).resolves.toHaveProperty('token');
        expect(PessoaModel.resetarTentativasLogin).toHaveBeenCalledTimes(2);
    });
    it.failing('token deveria conter e-mail (usa usuario.email, inexistente)', async () => {
        const r = await Service.login(CPF, 'senha');
        expect(jwt.decode(r.token).email).toBe('ana@x.com');
    });
});

describe('AuthService – demais operações', () => {
    it('logout registra log', async () => {
        await Service.logout(1, 'ip', 'ua');
        expect(LogService.registrar).toHaveBeenCalledWith(expect.objectContaining({ des_acao: 'logout', id_usuario: 1 }));
    });
    it('alterarSenha', async () => {
        PessoaModel.buscarPorId.mockResolvedValue(usuario());
        await expect(Service.alterarSenha(1, 'atual', 'nova')).resolves.toBe(true);
        expect(PessoaModel.atualizar).toHaveBeenCalledWith(1, { des_senha: 'hash:nova' });
    });
    it('alterarSenha – erros', async () => {
        PessoaModel.buscarPorId.mockResolvedValueOnce(null).mockResolvedValueOnce(usuario());
        bcrypt.compare.mockResolvedValue(false);
        await expect(Service.alterarSenha(1, 'a', 'b')).rejects.toThrow('Usuário não encontrado');
        await expect(Service.alterarSenha(1, 'a', 'b')).rejects.toThrow('Senha atual incorreta');
        expect(PessoaModel.atualizar).not.toHaveBeenCalled();
    });
    it('resetarSenha zera tentativas e bloqueio', async () => {
        await expect(Service.resetarSenha(CPF, 'nova', 99)).resolves.toBe(true);
        expect(PessoaModel.atualizar).toHaveBeenCalledWith(1, { des_senha: 'hash:nova', num_tentativas_login: 0, dta_bloqueio_login: null });
        expect(LogService.registrar.mock.calls[0][0].id_usuario).toBe(99);
    });
    it('resetarSenha – usuário inexistente', async () => {
        PessoaModel.buscarPorCPF.mockResolvedValue(null);
        await expect(Service.resetarSenha(CPF, 'n', 1)).rejects.toThrow('Usuário não encontrado');
    });
    it('verificarToken', () => {
        const token = jwt.sign({ id: 1 }, 'segredo-teste');
        expect(Service.verificarToken(token)).toMatchObject({ id: 1 });
        expect(() => Service.verificarToken('lixo')).toThrow('Token inválido ou expirado');
    });
});
