jest.mock('../../../models/PessoaModel', () => ({
    buscarPorCPF: jest.fn(),
    buscarPorId: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    deletar: jest.fn(),
    listar: jest.fn()
}));

jest.mock('../../../services/LogService', () => ({
    registrar: jest.fn(),
}));

jest.mock('../../../utils/validators', () => ({
    validarCPF: jest.fn(),
    cpfValido: jest.fn(),
    pessoaSchema: {
        validate: jest.fn()
    },
    agendamentoSchema: {
        validate: jest.fn()
    },
    loginSchema: {
        validate: jest.fn()
    },
    comparecimentoSchema: {
        validate: jest.fn()
    }
}));

jest.mock('../../../utils/formatters', () => ({
    limparCPF: jest.fn(cpf => cpf.replace(/\D/g, '')),
    limparCEP: jest.fn(cep => cep.replace(/\D/g, '')),
    limparTelefone: jest.fn(tel => tel.replace(/\D/g, '')),
    ocultarDadosSensiveis: jest.fn(pessoa => {
        if (!pessoa) return pessoa;
        const { des_senha, ...pessoaSemSenha } = pessoa;
        return pessoaSemSenha;
    })
}))

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword123'),
    compare: jest.fn(),
}));

const PessoaService = require('../../../services/PessoaService');
const PessoaModel = require('../../../models/PessoaModel');
const LogService = require('../../../services/LogService');
// const TestHelpers = require('../../helpers/testHelpers');
const validators = require('../../../utils/validators')
const { ocultarDadosSensiveis } = require('../../../utils/formatters');
const bcrypt = require('bcryptjs');

const TestHelpers = {
    generatePessoaData(tipo = 'paciente') {
        const base = {
            id_cidade: 5418,
            ind_tipo_pessoa: tipo,
            ind_status: 'ativo',
            nom_completo: `Teste ${tipo} ${Date.now()}`,
            num_cpf: '12345678909',
            num_rg: '1234567',
            dta_nascimento: '1990-01-15',
            des_logradouro: 'Rua Teste',
            num_endereco: '123',
            num_cep: '74000000',
            nom_bairro: 'Centro',
            num_celular_1: '62999999999',
            ind_whatsapp_1: true,
            des_email_1: `teste.${Date.now()}@email.com`
        };

        if (['secretaria', 'costureira', 'administrador', 'medico'].includes(tipo)) {
            base.des_senha = 'senha123';
        }

        return base;
    }
};

describe('PessoaService - Testes de Unidade', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve criar pessoa com dados válidos', async () => {
            // Arrange
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dadosValidos = { ...dadosPessoa, num_cpf: '12345678909' };

            validators.pessoaSchema.validate.mockReturnValue({
                error: null,
                value: dadosValidos
            });

            // validarCPF.mockReturnValue(true);
            // PessoaModel.buscarPorCPF.mockResolvedValue(null);
            // PessoaModel.criar.mockResolvedValue(1);
            // PessoaModel.buscarPorId.mockResolvedValue({ id: 1, ...dadosPessoa });
            // LogService.registrar.mockResolvedValue(1);

            // Act
            const resultado = await PessoaService.criar(dadosPessoa, 1);

            // Assert
            expect(resultado).toHaveProperty('id');
            expect(validators.pessoaSchema.validate).toHaveBeenCalledWith(dadosPessoa);
            expect(PessoaModel.buscarPorCPF).toHaveBeenCalled();
            expect(PessoaModel.criar).toHaveBeenCalledWith(
                expect.objectContaining({
                    nom_completo: dadosPessoa.nom_completo,
                })
            );
            expect(LogService.registrar).toHaveBeenCalled();
        });

        // it('deve lançar erro quando CPF é inválido', async () => {
        //     // Arrange
        //     const dadosPessoa = TestHelpers.generatePessoaData('paciente');
        //     dadosPessoa.num_cpf = '12345678901';
        //     validarCPF.mockReturnValue(false);

        //     // Act & Assert
        //     await expect(
        //         PessoaService.criar(dadosPessoa, 1)
        //     ).rejects.toThrow('CPF inválido');

        //     expect(PessoaModel.criar).not.toHaveBeenCalled();
        // });

        // it('deve lançar erro quando CPF já existe', async () => {
        //     // Arrange
        //     const dadosPessoa = TestHelpers.generatePessoaData('paciente');
        //     validarCPF.mockReturnValue(true);
        //     PessoaModel.buscarPorCPF.mockResolvedValue({ id: 99, num_cpf: dadosPessoa.num_cpf });

        //     // Act & Assert
        //     await expect(
        //         PessoaService.criar(dadosPessoa, 1)
        //     ).rejects.toThrow('CPF já cadastrado');

        //     expect(PessoaModel.criar).not.toHaveBeenCalled();
        // });

        // it('deve criar hash de senha para tipos que necessitam', async () => {
        //     // Arrange
        //     const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
        //     validarCPF.mockReturnValue(true);
        //     PessoaModel.buscarPorCPF.mockResolvedValue(null);
        //     PessoaModel.criar.mockResolvedValue(1);
        //     PessoaModel.buscarPorId.mockResolvedValue({ id: 1, ...dadosPessoa });
        //     LogService.registrar.mockResolvedValue(1);

        //     // Act
        //     await PessoaService.criar(dadosPessoa, 1);

        //     // Assert
        //     expect(PessoaModel.criar).toHaveBeenCalledWith(
        //         expect.objectContaining({
        //             des_senha: expect.any(String)
        //         })
        //     );

        //     // Verificar que a senha foi hasheada (não é a senha original)
        //     const chamada = PessoaModel.criar.mock.calls[0][0];
        //     expect(chamada.des_senha).not.toBe('senha123');
        // });

        // it('deve validar idade mínima de 18 anos', async () => {
        //     // Arrange
        //     const dadosPessoa = TestHelpers.generatePessoaData('paciente');
        //     dadosPessoa.dta_nascimento = new Date().toISOString().split('T')[0]; // Data de hoje
        //     validarCPF.mockReturnValue(true);
        //     PessoaModel.buscarPorCPF.mockResolvedValue(null);

        //     // Act & Assert
        //     await expect(
        //         PessoaService.criar(dadosPessoa, 1)
        //     ).rejects.toThrow('Idade mínima de 18 anos');
        // });
    });

    // describe('buscarPorId', () => {
    //     it('deve buscar pessoa por ID', async () => {
    //         // Arrange
    //         const pessoaMock = {
    //             id: 1,
    //             nom_completo: 'Teste Usuario',
    //             ind_tipo_pessoa: 'paciente'
    //         };
    //         PessoaModel.buscarPorId.mockResolvedValue(pessoaMock);

    //         // Act
    //         const resultado = await PessoaService.buscarPorId(1, 1);

    //         // Assert
    //         expect(resultado).toEqual(pessoaMock);
    //         expect(PessoaModel.buscarPorId).toHaveBeenCalledWith(1);
    //     });

    //     it('deve lançar erro quando pessoa não existe', async () => {
    //         // Arrange
    //         PessoaModel.buscarPorId.mockResolvedValue(null);

    //         // Act & Assert
    //         await expect(
    //             PessoaService.buscarPorId(999, 1)
    //         ).rejects.toThrow('Pessoa não encontrada');
    //     });

    //     it('deve omitir senha do resultado', async () => {
    //         // Arrange
    //         const pessoaMock = {
    //             id: 1,
    //             nom_completo: 'Teste Usuario',
    //             des_senha: 'hashedPassword'
    //         };
    //         PessoaModel.buscarPorId.mockResolvedValue(pessoaMock);

    //         // Act
    //         const resultado = await PessoaService.buscarPorId(1, 1);

    //         // Assert
    //         expect(resultado).not.toHaveProperty('des_senha');
    //     });
    // });

    // describe('atualizar', () => {
    //     it('deve atualizar pessoa com sucesso', async () => {
    //         // Arrange
    //         const dadosAtualizacao = {
    //             nom_completo: 'Nome Atualizado',
    //             des_email_1: 'novo@email.com'
    //         };
    //         const pessoaExistente = {
    //             id: 1,
    //             num_cpf: '00000000000'
    //         };

    //         PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);
    //         PessoaModel.atualizar.mockResolvedValue(true);
    //         PessoaModel.buscarPorId.mockResolvedValueOnce(pessoaExistente)
    //             .mockResolvedValueOnce({ ...pessoaExistente, ...dadosAtualizacao });
    //         LogService.registrar.mockResolvedValue(1);

    //         // Act
    //         const resultado = await PessoaService.atualizar(1, dadosAtualizacao, 1);

    //         // Assert
    //         expect(resultado.nom_completo).toBe('Nome Atualizado');
    //         expect(PessoaModel.atualizar).toHaveBeenCalled();
    //         expect(LogService.registrar).toHaveBeenCalled();
    //     });

    //     it('deve lançar erro ao tentar alterar CPF', async () => {
    //         // Arrange
    //         const dadosAtualizacao = {
    //             num_cpf: '11111111111'
    //         };
    //         const pessoaExistente = {
    //             id: 1,
    //             num_cpf: '00000000000'
    //         };

    //         PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);

    //         // Act & Assert
    //         await expect(
    //             PessoaService.atualizar(1, dadosAtualizacao, 1)
    //         ).rejects.toThrow('Não é possível alterar o CPF');
    //     });

    //     it('deve lançar erro quando pessoa não existe', async () => {
    //         // Arrange
    //         PessoaModel.buscarPorId.mockResolvedValue(null);

    //         // Act & Assert
    //         await expect(
    //             PessoaService.atualizar(999, { nom_completo: 'Teste' }, 1)
    //         ).rejects.toThrow('Pessoa não encontrada');
    //     });
    // });

    // describe('deletar', () => {
    //     it('deve fazer soft delete com sucesso', async () => {
    //         // Arrange
    //         const pessoaExistente = {
    //             id: 1,
    //             nom_completo: 'Teste Usuario'
    //         };

    //         PessoaModel.buscarPorId.mockResolvedValue(pessoaExistente);
    //         PessoaModel.deletar.mockResolvedValue(true);
    //         LogService.registrar.mockResolvedValue(1);

    //         // Act
    //         await PessoaService.deletar(1, 1);

    //         // Assert
    //         expect(PessoaModel.deletar).toHaveBeenCalledWith(1);
    //         expect(LogService.registrar).toHaveBeenCalled();
    //     });

    //     it('deve lançar erro quando pessoa não existe', async () => {
    //         // Arrange
    //         PessoaModel.buscarPorId.mockResolvedValue(null);

    //         // Act & Assert
    //         await expect(
    //             PessoaService.deletar(999, 1)
    //         ).rejects.toThrow('Pessoa não encontrada');

    //         expect(PessoaModel.deletar).not.toHaveBeenCalled();
    //     });
    // });

    // describe('listar', () => {
    //     it('deve listar pessoas com filtros', async () => {
    //         // Arrange
    //         const pessoasMock = [
    //             { id: 1, nom_completo: 'Pessoa 1' },
    //             { id: 2, nom_completo: 'Pessoa 2' }
    //         ];
    //         const filtros = {
    //             ind_tipo_pessoa: 'paciente',
    //             ind_status: 'ativo'
    //         };

    //         PessoaModel.listar.mockResolvedValue(pessoasMock);

    //         // Act
    //         const resultado = await PessoaService.listar(filtros, 1);

    //         // Assert
    //         expect(resultado).toHaveLength(2);
    //         expect(PessoaModel.listar).toHaveBeenCalledWith(filtros);
    //     });

    //     it('deve omitir senha de todas as pessoas', async () => {
    //         // Arrange
    //         const pessoasMock = [
    //             { id: 1, nom_completo: 'Pessoa 1', des_senha: 'hash1' },
    //             { id: 2, nom_completo: 'Pessoa 2', des_senha: 'hash2' }
    //         ];

    //         PessoaModel.listar.mockResolvedValue(pessoasMock);

    //         // Act
    //         const resultado = await PessoaService.listar({}, 1);

    //         // Assert
    //         resultado.forEach(pessoa => {
    //             expect(pessoa).not.toHaveProperty('des_senha');
    //         });
    //     });
    // });
});
