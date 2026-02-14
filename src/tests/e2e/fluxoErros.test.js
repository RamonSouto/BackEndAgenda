const request = require('supertest');
const app = require('../../app');
const database = require('../../config/database');
const TestHelpers = require('../helpers/testHelpers');

describe('Fluxo E2E - Tratamento de Erros', () => {
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

    describe('Cenário de Erro 1: Autenticação e Autorização', () => {
        it('1.1 - Acesso sem token retorna 401', async () => {
            await request(app)
                .get('/api/pessoas')
                .expect(401);
        });

        it('1.2 - Token inválido retorna 401', async () => {
            await request(app)
                .get('/api/pessoas')
                .set('Authorization', 'Bearer token-invalido')
                .expect(401);
        });

        it('1.3 - Acesso negado por falta de permissão retorna 403', async () => {
            const secretariaLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '11111111111',
                    des_senha: 'senha123'
                });

            await request(app)
                .get('/api/pessoas/secretarias')
                .set('Authorization', `Bearer ${secretariaLogin.body.dados.token}`)
                .expect(403);
        });

        it('1.4 - Login com credenciais erradas retorna 401', async () => {
            await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senhaErrada'
                })
                .expect(401);
        });
    });

    describe('Cenário de Erro 2: Validação de Dados', () => {
        it('2.1 - Criar pessoa sem dados obrigatórios retorna 400', async () => {
            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom_completo: 'Apenas Nome'
                })
                .expect(400);
        });

        it('2.2 - CPF inválido retorna 400', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '12345678901';

            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);
        });

        it('2.3 - Email inválido retorna 400', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'email-invalido';

            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(400);
        });

        it('2.4 - Data no passado para agendamento retorna 400', async () => {
            const dataPassada = new Date();
            dataPassada.setDate(dataPassada.getDate() - 1);

            await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataPassada.toISOString(),
                    produtos: [{ id_produto_grade: 1 }]
                })
                .expect(400);
        });
    });

    describe('Cenário de Erro 3: Recursos Não Encontrados', () => {
        it('3.1 - Buscar pessoa inexistente retorna 404', async () => {
            await request(app)
                .get('/api/pessoas/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });

        it('3.2 - Buscar agendamento inexistente retorna 404', async () => {
            await request(app)
                .get('/api/agendamentos/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });

        it('3.3 - Atualizar recurso inexistente retorna 404', async () => {
            await request(app)
                .put('/api/pessoas/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom_completo: 'Teste'
                })
                .expect(404);
        });

        it('3.4 - Deletar recurso inexistente retorna 404', async () => {
            await request(app)
                .delete('/api/pessoas/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
        });
    });

    describe('Cenário de Erro 4: Conflitos de Negócio', () => {
        it('4.1 - CPF duplicado retorna 409', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');

            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(201);

            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosPessoa)
                .expect(409);
        });

        it('4.2 - Costureira ocupada retorna 400', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            // Criar primeiro agendamento
            await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: 1 }]
                })
                .expect(201);

            // Tentar criar segundo
            const dataFutura2 = new Date();
            dataFutura2.setDate(dataFutura2.getDate() + 14);

            await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura2.toISOString(),
                    produtos: [{ id_produto_grade: 1 }]
                })
                .expect(400);
        });
    });

    describe('Cenário de Erro 5: Tratamento de Exceções', () => {
        it('5.1 - Dados malformados retornam 400', async () => {
            await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send('dados-invalidos')
                .expect(400);
        });

        it('5.2 - Parâmetros de query inválidos retornam 400', async () => {
            await request(app)
                .get('/api/pessoas?tipo=tipo_invalido')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);
        });
    });
});
