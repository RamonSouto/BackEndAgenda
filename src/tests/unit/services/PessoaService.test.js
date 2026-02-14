const PessoaService = require('../../../services/PessoaService');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
const TestHelpers = require('../../helpers/testHelpers');
const { validarCPF } = require('../../../utils/validators');

jest.mock('../../../models/PessoaModel');
jest.mock('../../../services/LogService');
jest.mock('../../../utils/validators');

describe('PessoaService - Testes de Unidade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve criar pessoa com dados válidos', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            validarCPF.mockReturnValue(true);
            PessoaModel.buscarPorCPF.mockResolvedValue(null);
            PessoaModel.criar.mockResolvedValue(1);
            PessoaModel.buscarPorId.mockResolvedValue({ id: 1, ...dadosPessoa });
            LogService.registrar.mockResolvedValue(1);

            // Act
            const resultado = await PessoaService.criar(dadosPessoa, 1);

            // Assert
            expect(resultado).toHaveProperty('id');
            expect(PessoaModel.buscarPorCPF).toHaveBeenCalledWith(dadosPessoa.num_cpf);
            expect(PessoaModel.criar).toHaveBeenCalledWith(expect.objectContaining({
                nom_completo: dadosPessoa.nom_completo
            }));
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro quando CPF é inválido', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '12345678901';
            validarCPF.mockReturnValue(false);

            // Act & Assert
            await expect(
                PessoaService.criar(dadosPessoa, 1)
            ).rejects.toThrow('CPF inválido');

            expect(PessoaModel.criar).not.toHaveBeenCalled();
        });

        it('deve lançar erro quando CPF já existe', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            validarCPF.mockReturnValue(true);
            PessoaModel.buscarPorCPF.mockResolvedValue({ id: 99, num_cpf: dadosPessoa.num_cpf });

            // Act & Assert
            await expect(
                PessoaService.criar(dadosPessoa, 1)
            ).rejects.toThrow('CPF já cadastrado');

            expect(PessoaModel.criar).not.toHaveBeenCalled();
        });

        it('deve criar hash de senha para tipos que necessitam', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
            validarCPF.mockReturnValue(true);
            PessoaModel.buscarPorCPF.mockResolvedValue(null);
            PessoaModel.criar.mockResolvedValue(1);
            PessoaModel.buscarPorId.mockResolvedValue({ id: 1, ...dadosPessoa });
            LogService.registrar.mockResolvedValue(1);

            // Act
            await PessoaService.criar(dadosPessoa, 1);

            // Assert
            expect(PessoaModel.criar).toHaveBeenCalledWith(
                expect.objectContaining({
                    des_senha: expect.any(String)
                })
            );

            // Verificar que a senha foi hasheada (não é a senha original)
            const chamada = PessoaModel.criar.mock.calls[0][0];
            expect(chamada.des_senha).not.toBe('senha123');
        });

        it('deve validar idade mínima de 18 anos', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.dta_nascimento = new Date().toISOString().split('T')[0]; // Data de hoje
            validarCPF.mockReturnValue(true);
            PessoaModel.buscarPorCPF.mockResolvedValue(null);

            // Act & Assert
            await expect(
                PessoaService.criar(dadosPessoa, 1)
            ).rejects.toThrow('Idade mínima de 18 anos');
        });
    });

    describe('buscarPorId', () => {
        it('deve buscar pessoa por ID', async () => {
            // Arrange
            const pessoaMock = {
                id: 1,
                nom_completo: 'Teste Usuario',
                ind_tipo_pessoa: 'paciente'
            };
            PessoaModel.buscarPorId.mockResolvedValue(pessoaMock);

            // Act
            const resultado = await PessoaService.buscarPorId(1, 1);

            // Assert
            expect(resultado).toEqual(pessoaMock);
            expect(PessoaModel.buscarPorId).toHaveBeenCalledWith(1);
        });

        it('deve lançar erro quando pessoa não existe', async () => {
            // Arrange
            PessoaModel.buscarPorId.mockResolvedValue(null);

            // Act & Assert
            await expect(
                PessoaService.buscarPorId(999, 1)
            ).rejects.toThrow('Pessoa não encontrada');
        });

        it('deve omitir senha do resultado', async () => {
            // Arrange
            const pessoaMock = {
                id: 1,
                nom_completo: 'Teste Usuario',
                des_senha: 'hashedPassword'
            };
            PessoaModel.buscarPorId.mockResolvedValue(pessoaMock);

            // Act
            const resultado = await PessoaService.buscarPorId(1, 1);

            // Assert
            expect(resultado).not.toHaveProperty('des_senha');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar pessoa com sucesso', async () => {
            // Arrange
            const dadosAtualizacao = {
                nom_completo: 'Nome Atualizado',
                des_email_1: 'novo@email.com'
            };
            const pessoaExistente = {
                id: 1,
                num_cpf: '00000000000'
            };

            PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);
            PessoaModel.atualizar.mockResolvedValue(true);
            PessoaModel.buscarPorId.mockResolvedValueOnce(pessoaExistente)
                .mockResolvedValueOnce({ ...pessoaExistente, ...dadosAtualizacao });
            LogService.registrar.mockResolvedValue(1);

            // Act
            const resultado = await PessoaService.atualizar(1, dadosAtualizacao, 1);

            // Assert
            expect(resultado.nom_completo).toBe('Nome Atualizado');
            expect(PessoaModel.atualizar).toHaveBeenCalled();
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro ao tentar alterar CPF', async () => {
            // Arrange
            const dadosAtualizacao = {
                num_cpf: '11111111111'
            };
            const pessoaExistente = {
                id: 1,
                num_cpf: '00000000000'
            };

            PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);

            // Act & Assert
            await expect(
                PessoaService.atualizar(1, dadosAtualizacao, 1)
            ).rejects.toThrow('Não é possível alterar o CPF');
        });

        it('deve lançar erro quando pessoa não existe', async () => {
            // Arrange
            PessoaModel.buscarPorId.mockResolvedValue(null);

            // Act & Assert
            await expect(
                PessoaService.atualizar(999, { nom_completo: 'Teste' }, 1)
            ).rejects.toThrow('Pessoa não encontrada');
        });
    });

    describe('deletar', () => {
        it('deve fazer soft delete com sucesso', async () => {
            // Arrange
            const pessoaExistente = {
                id: 1,
                nom_completo: 'Teste Usuario'
            };

            PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);
            PessoaModel.deletar.mockResolvedValue(true);
            LogService.registrar.mockResolvedValue(1);

            // Act
            await PessoaService.deletar(1, 1);

            // Assert
            expect(PessoaModel.deletar).toHaveBeenCalledWith(1);
            expect(LogService.registrar).toHaveBeenCalled();
        });

        it('deve lançar erro quando pessoa não existe', async () => {
            // Arrange
            PessoaModel.buscarPorId.mockResolvedValue(null);

            // Act & Assert
            await expect(
                PessoaService.deletar(999, 1)
            ).rejects.toThrow('Pessoa não encontrada');

            expect(PessoaModel.deletar).not.toHaveBeenCalled();
        });
    });

    describe('listar', () => {
        it('deve listar pessoas com filtros', async () => {
            // Arrange
            const pessoasMock = [
                { id: 1, nom_completo: 'Pessoa 1' },
                { id: 2, nom_completo: 'Pessoa 2' }
            ];
            const filtros = {
                ind_tipo_pessoa: 'paciente',
                ind_status: 'ativo'
            };

            PessoaModel.listar.mockResolvedValue(pessoasMock);

            // Act
            const resultado = await PessoaService.listar(filtros, 1);

            // Assert
            expect(resultado).toHaveLength(2);
            expect(PessoaModel.listar).toHaveBeenCalledWith(filtros);
        });

        it('deve omitir senha de todas as pessoas', async () => {
            // Arrange
            const pessoasMock = [
                { id: 1, nom_completo: 'Pessoa 1', des_senha: 'hash1' },
                { id: 2, nom_completo: 'Pessoa 2', des_senha: 'hash2' }
            ];

            PessoaModel.listar.mockResolvedValue(pessoasMock);

            // Act
            const resultado = await PessoaService.listar({}, 1);

            // Assert
            resultado.forEach(pessoa => {
                expect(pessoa).not.toHaveProperty('des_senha');
            });
        });
    });
});
