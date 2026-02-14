const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../config/env')
const { faker } = require('@faker-js/faker')

class TestHelpers {

    /**
     * Gerar um token JWT para testes
     */
    static generateToken(payload) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });
    }


    /**
     *  Gerar Tokens para diferentes tipos de usuarios
     */
    static generateTokens() {
        return {
            admin: this.generateToken({
                id: 1,
                cpf: '00000000000',
                tipo: 'administrador'
            }),
            secretaria: this.generateToken({
                id: 2,
                cpf: '11111111111',
                tipo: 'secretaria'
            }),
            costureira: this.generateToken({
                id: 3,
                cpf: '22222222222',
                tipo: 'costureira'
            }),
            medico: this.generateToken({
                id: 4,
                cpf: '33333333333',
                tipo: 'medico'
            }),
            paciente: this.generateToken({
                id: 5,
                cpf: '44444444444',
                tipo: 'paciente'
            })
        }
    }

    /**
     * Gerar um token inválido
     */
    static generateInvalidToken() {
        return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';
    }

    /**
     * Gera um token expirado
     */
    static generateExpiredToken() {
        return jwt.sign(
            { id: 1, cpf: '00000000000', tipo: 'administrador' },
            config.jwt.secret,
            { exiresIn: '-1h' }
        )
    }

    /**
     * Gerar dados de pessoa válidos
     */
    static generatePessoaData(tipo = 'paciente') {
        const pessoa = {
            id_cidad: 1,
            ind_tipo_pessoa: tipo,
            nom_completo: faker.person.fullName,
            num_cpf: this.generateCPF(),
            num_rg: faker.string.numeric(7),
            dta_nascimento: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString().split('T')[0],
            des_logradouro: faker.location.street(),
            num_endereco: faker.location.buildingNumber(),
            des_complemento: faker.location.secondaryAddress(),
            num_cep: faker.string.numeric(8),
            nom_bairro: faker.location.county(),
            num_celular_1: '62' + faker.string.numeric(9),
            ind_whatsapp_1: true,
            des_email_1: faker.internet.email()
        };

        // Adicionar senha para tipos que precisam
        if (['secretaria', 'costureira', 'medico', 'administrador'].includes(tipo)) {
            pessoa.des_senha = 'senha123';
        }

        return pessoa;
    }

    /**
     * Gera dados de agendamento válidos
     */
    static generateAgendamentoData() {
        const dataFutura = new Date();
        dataFutura.setDate(dataFutura.getDate() + 7);

        return {
            id_paciente: 5,
            id_costureira: 3,
            id_secretaria: 2,
            dta_agendamento: dataFutura.toISOString(),
            des_observacoes_geral: faker.lorem.sentence(),
            produtos: [
                {
                    id_produto_grade: 1,
                    des_ajuste_produto: faker.lorem.sentence()
                }
            ]
        };
    }

    /**
     * Gera um CPF válido (formato sem pontuação)
     */
    static generateCPF() {
        const n1 = Math.floor(Math.random() * 10);
        const n2 = Math.floor(Math.random() * 10);
        const n3 = Math.floor(Math.random() * 10);
        const n4 = Math.floor(Math.random() * 10);
        const n5 = Math.floor(Math.random() * 10);
        const n6 = Math.floor(Math.random() * 10);
        const n7 = Math.floor(Math.random() * 10);
        const n8 = Math.floor(Math.random() * 10);
        const n9 = Math.floor(Math.random() * 10);

        let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
        d1 = 11 - (d1 % 11);
        if (d1 >= 10) d1 = 0;

        let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
        d2 = 11 - (d2 % 11);
        if (d2 >= 10) d2 = 0;

        return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
    }

    /**
     * Gera hash de senha
     */
    static async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    /**
     * Limpa banco de dados de teste
     */
    static async cleanDatabase(database) {
        await database.query('SET FOREIGN_KEY_CHECKS = 0');
        await database.query('TRUNCATE TABLE tab_fotos_ajustes');
        await database.query('TRUNCATE TABLE tab_produto_agendamento');
        await database.query('TRUNCATE TABLE tab_agendamentos');
        await database.query('TRUNCATE TABLE tab_pessoas');
        await database.query('TRUNCATE TABLE tab_logs');
        await database.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    /**
     * Cria dados de teste no banco
     */
    static async seedDatabase(database) {
        // Inserir cidade de teste
        const [cidade] = await database.query(
            'INSERT INTO tab_cidade (nom_cidade, id_estado, cod_municipio_ibge) VALUES (?, ?, ?)',
            ['Goiânia Teste', 1, '5208707']
        );

        const cidadeId = cidade.insertId;

        // Inserir pessoas de teste
        const senhaHash = await this.hashPassword('senha123');

        const pessoas = [
            {
                tipo: 'administrador',
                nome: 'Admin Teste',
                cpf: '00000000000'
            },
            {
                tipo: 'secretaria',
                nome: 'Secretária Teste',
                cpf: '11111111111'
            },
            {
                tipo: 'costureira',
                nome: 'Costureira Teste',
                cpf: '22222222222'
            },
            {
                tipo: 'medico',
                nome: 'Médico Teste',
                cpf: '33333333333'
            },
            {
                tipo: 'paciente',
                nome: 'Paciente Teste',
                cpf: '44444444444'
            }
        ];

        const pessoasIds = {};

        for (const pessoa of pessoas) {
            const [result] = await database.query(
                `INSERT INTO tab_pessoas (
          id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
          dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
          num_celular_1, des_email_1, des_senha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cidadeId, 'ativo', pessoa.tipo, pessoa.nome, pessoa.cpf, '1234567',
                    '1990-01-01', 'Rua Teste', '100', '74000000', 'Centro',
                    '62999999999', `${pessoa.tipo}@teste.com`,
                    pessoa.tipo === 'paciente' ? null : senhaHash
                ]
            );

            pessoasIds[pessoa.tipo] = result.insertId;
        }

        return pessoasIds;
    }

    /**
     * Espera um tempo determinado (para testes assíncronos)
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TestHelpers;