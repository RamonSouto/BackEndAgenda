const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Pessoas Routes - Testes de Integração', () => {
    let tokens = {};
    let pessoasIds = {};
    let pacienteIdCriado;

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
        pessoasIds = await TestHelpers.seedDatabase(database);

        // Obter tokens para diferentes tipos de usuário
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({ num_cpf: '00000000000', des_senha: 'senha123' });
        tokens.admin = adminLogin.body.dados.token;

        const secretariaLogin = await request(app)
            .post('/api/auth/login')
            .send({ num_cpf: '11111111111', des_senha: 'senha123' });
        tokens.secretaria = secretariaLogin.body.dados.token;

        const costureiraLogin = await request(app)
            .post('/api/auth/login')
            .send({ num_cpf: '22222222222', des_senha: 'senha123' });
        tokens.costureira = costureiraLogin.body.dados.token;
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('POST /api/pessoas', () => {
        it('deve criar paciente como secretária', async () => {
            const dadosPaciente = TestHelpers.generatePessoaData('paciente');

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosPaciente)
                .expect(201);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toContain('criado com sucesso');
            expect(response.body.dados).toHaveProperty('id');
            expect(response.body.dados.nom_completo).toBe(dadosPaciente.nom_completo);
            expect(response.body.dados).not.toHaveProperty('des_senha');

            pacienteIdCriado = response.body.dados.id;
        });

        it('deve criar secretária como admin', async () => {
            const dadosSecretaria = TestHelpers.generatePessoaData('secretaria');

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosSecretaria)
                .expect(201);

            expect(response.body.dados.ind_tipo_pessoa).toBe('secretaria');
        });

        it('deve criar costureira como admin', async () => {
            const dadosCostureira = TestHelpers.generatePessoaData('costureira');

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosCostureira)
                .expect(201);

            expect(response.body.dados.ind_tipo_pessoa).toBe('costureira');
        });

        it('deve retornar 400 quando dados obrigatórios estão faltando', async () => {
            const dadosIncompletos = {
                nom_completo: 'Apenas Nome'
                // Faltando campos obrigatórios
            };

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosIncompletos)
                .expect(400);

            expect(response.body).toHaveProperty('sucesso', false);
        });

        it('deve retornar 400 quando CPF é inválido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '12345678901'; // CPF inválido

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('CPF inválido');
        });

        it('deve retornar 409 quando CPF já existe', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.num_cpf = '44444444444'; // CPF já existente

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosPessoa)
                .expect(409);

            expect(response.body.mensagem).toContain('CPF já cadastrado');
        });

        it('deve retornar 400 quando email é inválido', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            dadosPessoa.des_email_1 = 'email-invalido';

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('email');
        });

        it('deve retornar 400 quando idade é menor que 18 anos', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');
            const dataRecente = new Date();
            dataRecente.setFullYear(dataRecente.getFullYear() - 10); // 10 anos atrás
            dadosPessoa.dta_nascimento = dataRecente.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosPessoa)
                .expect(400);

            expect(response.body.erro).toContain('18 anos');
        });

        it('deve retornar 401 sem autenticação', async () => {
            const dadosPessoa = TestHelpers.generatePessoaData('paciente');

            await request(app)
                .post('/api/pessoas')
                .send(dadosPessoa)
                .expect(401);
        });

        it('deve retornar 403 quando secretária tenta criar admin', async () => {
            const dadosAdmin = TestHelpers.generatePessoaData('administrador');

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAdmin)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });
    });

    describe('GET /api/pessoas', () => {
        it('deve listar todas as pessoas como admin', async () => {
            const response = await request(app)
                .get('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('dados');
            expect(Array.isArray(response.body.dados)).toBe(true);
            expect(response.body.dados.length).toBeGreaterThan(0);
        });

        it('deve filtrar por tipo de pessoa', async () => {
            const response = await request(app)
                .get('/api/pessoas?tipo=paciente')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'paciente')).toBe(true);
        });

        it('deve filtrar por status', async () => {
            const response = await request(app)
                .get('/api/pessoas?status=ativo')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_status === 'ativo')).toBe(true);
        });

        it('deve buscar por nome ou CPF', async () => {
            const response = await request(app)
                .get('/api/pessoas?busca=Teste')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.length).toBeGreaterThan(0);
        });

        it('deve retornar array vazio quando não encontra resultados', async () => {
            const response = await request(app)
                .get('/api/pessoas?busca=NomeQueNaoExiste12345')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toEqual([]);
            expect(response.body.total).toBe(0);
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .get('/api/pessoas')
                .expect(401);
        });

        it('deve retornar 403 quando costureira tenta listar', async () => {
            const response = await request(app)
                .get('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });
    });

    describe('GET /api/pessoas/:id', () => {
        it('deve buscar pessoa por ID', async () => {
            const response = await request(app)
                .get(`/api/pessoas/${pessoasIds.paciente}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.dados).toHaveProperty('id', pessoasIds.paciente);
            expect(response.body.dados).not.toHaveProperty('des_senha');
        });

        it('deve retornar 404 quando pessoa não existe', async () => {
            const response = await request(app)
                .get('/api/pessoas/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 400 quando ID é inválido', async () => {
            const response = await request(app)
                .get('/api/pessoas/abc')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(400);

            expect(response.body.erro).toContain('número inteiro');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .get(`/api/pessoas/${pessoasIds.paciente}`)
                .expect(401);
        });
    });

    describe('GET /api/pessoas/cpf/:cpf', () => {
        it('deve buscar pessoa por CPF', async () => {
            const response = await request(app)
                .get('/api/pessoas/cpf/44444444444')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toHaveProperty('num_cpf', '44444444444');
        });

        it('deve retornar 404 quando CPF não existe', async () => {
            const cpfNaoExistente = TestHelpers.generateCPF();

            const response = await request(app)
                .get(`/api/pessoas/cpf/${cpfNaoExistente}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 400 quando CPF tem formato inválido', async () => {
            const response = await request(app)
                .get('/api/pessoas/cpf/123')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(400);

            expect(response.body.erro).toContain('CPF');
        });
    });

    describe('GET /api/pessoas/tipo/:tipo', () => {
        it('deve listar pessoas por tipo - pacientes', async () => {
            const response = await request(app)
                .get('/api/pessoas/tipo/paciente')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'paciente')).toBe(true);
        });

        it('deve listar pessoas por tipo - secretárias', async () => {
            const response = await request(app)
                .get('/api/pessoas/tipo/secretaria')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'secretaria')).toBe(true);
        });

        it('deve retornar 400 quando tipo é inválido', async () => {
            const response = await request(app)
                .get('/api/pessoas/tipo/tipoInvalido')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(400);

            expect(response.body.erro).toContain('Tipo inválido');
        });
    });

    describe('PUT /api/pessoas/:id', () => {
        it('deve atualizar pessoa como admin', async () => {
            const dadosAtualizacao = {
                nom_completo: 'Nome Atualizado Teste',
                des_email_1: 'atualizado@teste.com'
            };

            const response = await request(app)
                .put(`/api/pessoas/${pacienteIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosAtualizacao)
                .expect(200);

            expect(response.body.mensagem).toContain('atualizado');
            expect(response.body.dados.nom_completo).toBe(dadosAtualizacao.nom_completo);
            expect(response.body.dados.des_email_1).toBe(dadosAtualizacao.des_email_1);
        });

        it('deve retornar 400 ao tentar alterar CPF', async () => {
            const response = await request(app)
                .put(`/api/pessoas/${pacienteIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    num_cpf: '99999999999'
                })
                .expect(400);

            expect(response.body.erro).toContain('CPF');
        });

        it('deve retornar 404 quando pessoa não existe', async () => {
            const response = await request(app)
                .put('/api/pessoas/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    nom_completo: 'Teste'
                })
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 403 quando não é admin', async () => {
            const response = await request(app)
                .put(`/api/pessoas/${pacienteIdCriado}`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send({
                    nom_completo: 'Teste'
                })
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .put(`/api/pessoas/${pacienteIdCriado}`)
                .send({
                    nom_completo: 'Teste'
                })
                .expect(401);
        });
    });

    describe('PATCH /api/pessoas/:id/ativar', () => {
        it('deve ativar pessoa como admin', async () => {
            const response = await request(app)
                .patch(`/api/pessoas/${pacienteIdCriado}/ativar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('ativada');
        });

        it('deve retornar 403 quando não é admin', async () => {
            await request(app)
                .patch(`/api/pessoas/${pacienteIdCriado}/ativar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(403);
        });
    });

    describe('PATCH /api/pessoas/:id/desativar', () => {
        it('deve desativar pessoa como admin', async () => {
            const response = await request(app)
                .patch(`/api/pessoas/${pacienteIdCriado}/desativar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('desativada');
        });

        it('deve retornar 403 quando não é admin', async () => {
            await request(app)
                .patch(`/api/pessoas/${pacienteIdCriado}/desativar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(403);
        });
    });

    describe('DELETE /api/pessoas/:id', () => {
        it('deve deletar (soft delete) pessoa como admin', async () => {
            const response = await request(app)
                .delete(`/api/pessoas/${pacienteIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('deletado');

            // Verificar que a pessoa não aparece mais na listagem
            const listResponse = await request(app)
                .get('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`);

            const pessoaDeletada = listResponse.body.dados.find(p => p.id === pacienteIdCriado);
            expect(pessoaDeletada).toBeUndefined();
        });

        it('deve retornar 404 quando pessoa não existe', async () => {
            await request(app)
                .delete('/api/pessoas/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(404);
        });

        it('deve retornar 403 quando não é admin', async () => {
            await request(app)
                .delete(`/api/pessoas/${pessoasIds.paciente}`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(403);
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .delete(`/api/pessoas/${pessoasIds.paciente}`)
                .expect(401);
        });
    });

    describe('GET /api/pessoas/costureiras/disponiveis', () => {
        it('deve listar costureiras com disponibilidade', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('disponiveis');
            expect(response.body.dados).toBeInstanceOf(Array);

            response.body.dados.forEach(costureira => {
                expect(costureira).toHaveProperty('disponivel');
                expect(costureira.ind_tipo_pessoa).toBe('costureira');
            });
        });

        it('deve retornar 403 quando costureira tenta acessar', async () => {
            await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(403);
        });
    });

    describe('GET /api/pessoas/pacientes', () => {
        it('deve listar apenas pacientes', async () => {
            const response = await request(app)
                .get('/api/pessoas/pacientes')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'paciente')).toBe(true);
        });
    });

    describe('GET /api/pessoas/secretarias', () => {
        it('deve listar apenas secretárias como admin', async () => {
            const response = await request(app)
                .get('/api/pessoas/secretarias')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'secretaria')).toBe(true);
        });

        it('deve retornar 403 quando não é admin', async () => {
            await request(app)
                .get('/api/pessoas/secretarias')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(403);
        });
    });

    describe('GET /api/pessoas/costureiras', () => {
        it('deve listar apenas costureiras', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'costureira')).toBe(true);
        });
    });
});
