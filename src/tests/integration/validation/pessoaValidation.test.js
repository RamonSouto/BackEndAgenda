const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Pessoa Validation - Testes de Validação', () => {
    let adminToken;
    let pessoasIds = {};

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
        pessoasIds = await TestHelpers.seedDatabase(database);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                num_cpf: '00000000000',
                des_senha: 'senha123'
            });

        adminToken = loginResponse.body.dados.token;
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('Validação de Campos Obrigatórios', () => {
        it('deve rejeitar quando falta id_cidade', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.id_cidade;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.sucesso).toBe(false);
            expect(response.body.erro).toContain('id_cidade');
            expect(response.body.erro).toContain('obrigatório');
        });

        it('deve rejeitar quando falta ind_tipo_pessoa', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.ind_tipo_pessoa;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('ind_tipo_pessoa');
            expect(response.body.erro).toContain('obrigatório');
        });

        it('deve rejeitar quando falta nom_completo', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.nom_completo;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('nom_completo');
        });

        it('deve rejeitar quando falta num_cpf', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_cpf;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('num_cpf');
        });

        it('deve rejeitar quando falta num_rg', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_rg;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('num_rg');
        });

        it('deve rejeitar quando falta dta_nascimento', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.dta_nascimento;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('dta_nascimento');
        });

        it('deve rejeitar quando falta des_logradouro', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.des_logradouro;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('des_logradouro');
        });

        it('deve rejeitar quando falta num_endereco', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_endereco;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('num_endereco');
        });

        it('deve rejeitar quando falta num_cep', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_cep;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('num_cep');
        });

        it('deve rejeitar quando falta nom_bairro', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.nom_bairro;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('nom_bairro');
        });

        it('deve rejeitar quando falta num_celular_1', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_celular_1;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('num_celular_1');
        });

        it('deve rejeitar quando falta des_email_1', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.des_email_1;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('des_email_1');
        });

        it('deve rejeitar quando falta senha para secretária', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
            delete dadosPessoa.des_senha;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('senha');
        });

        it('deve rejeitar quando falta senha para costureira', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('costureira');
            delete dadosPessoa.des_senha;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('senha');
        });

        it('deve rejeitar quando falta senha para admin', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('administrador');
            delete dadosPessoa.des_senha;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('senha');
        });
    });

    describe('Validação de Tipos de Dados', () => {
        it('deve rejeitar id_cidade não numérico', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.id_cidade = 'abc';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('número');
        });

        it('deve rejeitar ind_tipo_pessoa inválido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.ind_tipo_pessoa = 'tipo_invalido';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('tipo');
            expect(response.body.erro).toMatch(/medico|secretaria|costureira|paciente|administrador/);
        });

        it('deve rejeitar ind_status inválido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.ind_status = 'status_invalido';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('status');
        });

        it('deve rejeitar ind_whatsapp_1 não booleano', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.ind_whatsapp_1 = 'sim';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('boolean');
        });
    });

    describe('Validação de Formato de CPF', () => {
        it('deve rejeitar CPF com menos de 11 dígitos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '123456789';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF');
            expect(response.body.erro).toContain('11');
        });

        it('deve rejeitar CPF com mais de 11 dígitos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '123456789012';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF');
        });

        it('deve rejeitar CPF com caracteres não numéricos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '123.456.789-01';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF');
        });

        it('deve rejeitar CPF com todos os dígitos iguais', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '11111111111';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF inválido');
        });

        it('deve rejeitar CPF com dígitos verificadores inválidos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '12345678901'; // CPF com verificadores errados

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF inválido');
        });

        it('deve aceitar CPF válido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = TestHelpers.generateCPF(); // Gera CPF válido

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de Email', () => {
        it('deve rejeitar email sem @', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'emailinvalido.com';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });

        it('deve rejeitar email sem domínio', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'usuario@';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });

        it('deve rejeitar email sem usuário', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = '@dominio.com';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });

        it('deve rejeitar email com espaços', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'usuario @dominio.com';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });

        it('deve aceitar email válido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'usuario.valido@dominio.com.br';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('des_email_2 deve ser opcional', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.des_email_2;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve validar des_email_2 quando fornecido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_2 = 'email-invalido';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });
    });

    describe('Validação de Data de Nascimento', () => {
        it('deve rejeitar formato de data inválido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.dta_nascimento = '31/12/1990'; // Formato brasileiro

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('data');
        });

        it('deve rejeitar data futura', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dataFutura = new Date();
            dataFutura.setFullYear(dataFutura.getFullYear() + 1);
            dadosPessoa.dta_nascimento = dataFutura.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('data');
        });

        it('deve rejeitar idade menor que 18 anos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dataMenor = new Date();
            dataMenor.setFullYear(dataMenor.getFullYear() - 15);
            dadosPessoa.dta_nascimento = dataMenor.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('18 anos');
        });

        it('deve rejeitar data muito antiga (mais de 120 anos)', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dataAntiga = new Date();
            dataAntiga.setFullYear(dataAntiga.getFullYear() - 130);
            dadosPessoa.dta_nascimento = dataAntiga.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('data');
        });

        it('deve aceitar data válida (18+ anos)', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dataValida = new Date();
            dataValida.setFullYear(dataValida.getFullYear() - 25);
            dadosPessoa.dta_nascimento = dataValida.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de CEP', () => {
        it('deve rejeitar CEP com menos de 8 dígitos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cep = '7400000';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CEP');
            expect(response.body.erro).toContain('8');
        });

        it('deve rejeitar CEP com mais de 8 dígitos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cep = '740000000';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CEP');
        });

        it('deve rejeitar CEP com caracteres não numéricos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cep = '74000-000';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CEP');
        });

        it('deve aceitar CEP válido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cep = '74000000';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de Senha', () => {
        it('deve rejeitar senha com menos de 6 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
            dadosPessoa.des_senha = '12345';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('senha');
            expect(response.body.erro).toContain('6');
        });

        it('deve aceitar senha com 6 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
            dadosPessoa.des_senha = '123456';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve aceitar senha com caracteres especiais', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('secretaria');
            dadosPessoa.des_senha = 'Senh@123!';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de Limites de Tamanho', () => {
        it('deve rejeitar nom_completo maior que 255 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.nom_completo = 'a'.repeat(256);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('255');
        });

        it('deve aceitar nom_completo com 255 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.nom_completo = 'a'.repeat(255);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve rejeitar num_rg maior que 20 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_rg = '1'.repeat(21);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('RG');
        });

        it('deve rejeitar des_complemento maior que 100 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_complemento = 'a'.repeat(101);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('complemento');
        });

        it('deve rejeitar nom_bairro maior que 100 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.nom_bairro = 'a'.repeat(101);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('bairro');
        });

        it('deve rejeitar num_celular_1 maior que 15 caracteres', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_celular_1 = '1'.repeat(16);

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('celular');
        });
    });

    describe('Validação de Campos Opcionais', () => {
        it('des_complemento deve ser opcional', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.des_complemento;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('num_celular_2 deve ser opcional', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.num_celular_2;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('ind_whatsapp_2 deve ser opcional', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.ind_whatsapp_2;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('senha não deve ser obrigatória para paciente', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            delete dadosPessoa.des_senha;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de Unicidade', () => {
        it('deve rejeitar CPF duplicado', async () => {
            const dadosPessoa1 = TestHelpers.generatePessoaData('paciente');

            // Criar primeira pessoa
            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa1)
                .expect(201);

            // Tentar criar com mesmo CPF
            const dadosPessoa2 = TestHelpers.generatePessoaData('paciente');
            dadosPessoa2.num_cpf = dadosPessoa1.num_cpf;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa2)
                .expect(409);

            expect(response.body.mensagem).toContain('CPF já cadastrado');
        });

        it('deve permitir emails duplicados', async () => {
            const email = 'email.duplicado@teste.com';

            const dadosPessoa1 = TestHelpers.generatePessoaData('paciente');
            dadosPessoa1.des_email_1 = email;

            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa1)
                .expect(201);

            const dadosPessoa2 = TestHelpers.generatePessoaData('paciente');
            dadosPessoa2.des_email_1 = email;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa2)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Sanitização de Entrada', () => {
        it('deve remover espaços extras do nome', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.nom_completo = '  João   da  Silva  ';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.dados.nom_completo.trim()).toBe(response.body.dados.nom_completo);
            expect(response.body.dados.nom_completo).not.toContain('  ');
        });

        it('deve converter email para lowercase', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'EMAIL@TESTE.COM';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.dados.des_email_1).toBe('email@teste.com');
        });

        it('deve remover caracteres especiais perigosos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.nom_completo = 'João<script>alert("XSS")</script>Silva';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            expect(response.body.dados.nom_completo).not.toContain('<script>');
            expect(response.body.dados.nom_completo).not.toContain('</script>');
        });
    });
});
