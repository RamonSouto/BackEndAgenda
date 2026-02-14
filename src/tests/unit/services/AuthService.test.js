const AuthService = require('../../../services/AuthService');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const TestHelpers = require('../../helpers/testHelpers');

// Mock dos módulos
jest.mock('../../../models/PessoaModel');
jest.mock('../../../services/LogService');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService - Testes de Unidade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('deve fazer login com credenciais válidas', async () => {
            // Arrange
            const cpf = '00000000000';
            const senha = 'senha123';
            const usuarioMock = {
                id: 1,
                nom_completo: 'Admin Teste',
                num_cpf: cpf,
                ind_tipo_pessoa: 'administrador',
                des_email_1: 'admin@teste.com',
                des_senha: 'hashedPassword'
            };

            PessoaModel.buscarPorCPF.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('fake-jwt-token');
            LogService.registrar.mockResolvedValue(1);

            // Act
            const resultado = await AuthService.login(cpf, senha, '127.0.0.1', 'Jest Test');

            // Assert
            expect(resultado).toHaveProperty('token');
            expect(resultado).toHaveProperty('usuario');
            expect(resultado.usuario.nom_completo).toBe('Admin Teste');
            expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith(cpf);
            expect(bcrypt.compare).toHaveBeenCalledWith(senha, 'hashedPassword');
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro quando usuário não existe', async () => {
            // Arrange
            PessoaModel.buscarPorCPF.mockResolvedValue(null);

            // Act & Assert
            await expect(
                AuthService.login('99999999999', 'senha123', '127.0.0.1', 'Jest Test')
            ).rejects.toThrow('Credenciais inválidas');

            expect(PessoaModel.buscarPorCPF).toHaveBeenCalled();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('deve lançar erro quando senha é incorreta', async () => {
            // Arrange
            const usuarioMock = {
                id: 1,
                num_cpf: '00000000000',
                des_senha: 'hashedPassword'
            };

            PessoaModel.buscarPorCPF.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(
                AuthService.login('00000000000', 'senhaErrada', '127.0.0.1', 'Jest Test')
            ).rejects.toThrow('Credenciais inválidas');

            expect(bcrypt.compare).toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('deve lançar erro quando usuário é inativo', async () => {
            // Arrange
            const usuarioMock = {
                id: 1,
                num_cpf: '00000000000',
                ind_status: 'inativo',
                des_senha: 'hashedPassword'
            };

            PessoaModel.buscarPorCPF.mockResolvedValue(usuarioMock);

            // Act & Assert
            await expect(
                AuthService.login('00000000000', 'senha123', '127.0.0.1', 'Jest Test')
            ).rejects.toThrow('Usuário inativo');
        });

        it('deve lançar erro quando paciente tenta fazer login', async () => {
            // Arrange
            const usuarioMock = {
                id: 1,
                num_cpf: '00000000000',
                ind_tipo_pessoa: 'paciente',
                ind_status: 'ativo'
            };

            PessoaModel.buscarPorCPF.mockResolvedValue(usuarioMock);

            // Act & Assert
            await expect(
                AuthService.login('00000000000', 'senha123', '127.0.0.1', 'Jest Test')
            ).rejects.toThrow('Pacientes não têm acesso ao sistema');
        });
    });

    describe('alterarSenha', () => {
        it('deve alterar senha com sucesso', async () => {
            // Arrange
            const usuarioMock = {
                id: 1,
                des_senha: await bcrypt.hash('senhaAntiga', 10)
            };

            PessoaModel.buscarPorId.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('novaSenhaHash');
            PessoaModel.atualizar.mockResolvedValue(true);
            LogService.registrar.mockResolvedValue(1);

            // Act
            await AuthService.alterarSenha(1, 'senhaAntiga', 'novaSenha');

            // Assert
            expect(PessoaModel.buscarPorId).toHaveBeenCalledWith(1);
            expect(bcrypt.compare).toHaveBeenCalledWith('senhaAntiga', usuarioMock.des_senha);
            expect(PessoaModel.atualizar).toHaveBeenCalled();
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro quando senha atual está incorreta', async () => {
            // Arrange
            const usuarioMock = {
                id: 1,
                des_senha: 'hashedPassword'
            };

            PessoaModel.buscarPorId.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(
                AuthService.alterarSenha(1, 'senhaErrada', 'novaSenha')
            ).rejects.toThrow('Senha atual incorreta');

            expect(PessoaModel.atualizar).not.toHaveBeenCalled();
        });

        it('deve lançar erro quando usuário não existe', async () => {
            // Arrange
            PessoaModel.buscarPorId.mockResolvedValue(null);

            // Act & Assert
            await expect(
                AuthService.alterarSenha(999, 'senhaAntiga', 'novaSenha')
            ).rejects.toThrow('Usuário não encontrado');
        });
    });

    describe('resetarSenha', () => {
        it('deve resetar senha com sucesso (admin)', async () => {
            // Arrange
            const usuarioMock = {
                id: 2,
                num_cpf: '11111111111'
            };

            PessoaModel.buscarPorCPF.mockResolvedValue(usuarioMock);
            bcrypt.hash.mockResolvedValue('novaSenhaHash');
            PessoaModel.atualizar.mockResolvedValue(true);
            LogService.registrar.mockResolvedValue(1);

            // Act
            await AuthService.resetarSenha('11111111111', 'novaSenha', 1);

            // Assert
            expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith('11111111111');
            expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha', 10);
            expect(PessoaModel.atualizar).toHaveBeenCalled();
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro quando CPF não existe', async () => {
            // Arrange
            PessoaModel.buscarPorCPF.mockResolvedValue(null);

            // Act & Assert
            await expect(
                AuthService.resetarSenha('99999999999', 'novaSenha', 1)
            ).rejects.toThrow('Usuário não encontrado');
        });
    });
});