const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Agendamentos Routes - Testes de Integração', () => {
    let tokens = {};
    let pessoasIds = {};
    let agendamentoIdCriado;
    let produtoGradeId;

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
        pessoasIds = await TestHelpers.seedDatabase(database);

        // Criar produto de teste
        const [produto] = await database.query(
            `INSERT INTO tab_produto (nom_produto, ref_produto, ind_status) 
       VALUES ('Produto Teste', 'PROD-001', 'ativo')`
        );

        const [grade] = await database.query(
            `INSERT INTO tab_produto_grade (id_produto, cod_tamanho, nom_cor_estampa, num_sku, ind_status)
       VALUES (?, 'P', 'Azul', 'PROD-001-P-AZ', 'ativo')`,
            [produto.insertId]
        );

        produtoGradeId = grade.insertId;

        // Obter tokens
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

        const medicoLogin = await request(app)
            .post('/api/auth/login')
            .send({ num_cpf: '33333333333', des_senha: 'senha123' });
        tokens.medico = medicoLogin.body.dados.token;
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('POST /api/agendamentos', () => {
        it('deve criar agendamento como secretária', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                des_observacoes_geral: 'Agendamento de teste',
                produtos: [
                    {
                        id_produto_grade: produtoGradeId,
                        des_ajuste_produto: 'Ajustar manga direita'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(201);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toContain('criado com sucesso');
            expect(response.body.dados).toHaveProperty('id');
            expect(response.body.dados.ind_status).toBe('agendado');
            expect(response.body.dados.paciente_id).toBe(pessoasIds.paciente);
            expect(response.body.dados.costureira_id).toBe(pessoasIds.costureira);

            agendamentoIdCriado = response.body.dados.id;
        });

        it('deve criar agendamento como costureira', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 14);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                des_observacoes_geral: 'Agendamento criado pela costureira',
                produtos: [
                    {
                        id_produto_grade: produtoGradeId,
                        des_ajuste_produto: 'Ajuste de teste'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .send(dadosAgendamento)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve criar agendamento como admin', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 21);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                des_observacoes_geral: 'Agendamento criado pelo admin',
                produtos: [
                    {
                        id_produto_grade: produtoGradeId,
                        des_ajuste_produto: 'Ajuste urgente'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosAgendamento)
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve retornar 400 quando data é no passado', async () => {
            const dataPassada = new Date();
            dataPassada.setDate(dataPassada.getDate() - 7);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataPassada.toISOString(),
                produtos: [
                    {
                        id_produto_grade: produtoGradeId
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(400);

            expect(response.body.erro).toContain('futura');
        });

        it('deve retornar 400 quando não há produtos', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                produtos: []
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(400);

            expect(response.body.erro).toContain('produto');
        });

        it('deve retornar 400 quando campos obrigatórios estão faltando', async () => {
            const dadosIncompletos = {
                id_paciente: pessoasIds.paciente
                // Faltando outros campos
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosIncompletos)
                .expect(400);

            expect(response.body).toHaveProperty('sucesso', false);
        });

        it('deve retornar 404 quando paciente não existe', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: 99999,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                produtos: [
                    {
                        id_produto_grade: produtoGradeId
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 400 quando costureira já tem agendamento ativo', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 30);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                produtos: [
                    {
                        id_produto_grade: produtoGradeId
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(400);

            expect(response.body.mensagem).toContain('já possui um agendamento ativo');
        });

        it('deve retornar 401 sem autenticação', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                produtos: [
                    {
                        id_produto_grade: produtoGradeId
                    }
                ]
            };

            await request(app)
                .post('/api/agendamentos')
                .send(dadosAgendamento)
                .expect(401);
        });

        it('deve retornar 403 quando médico tenta criar', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: pessoasIds.paciente,
                id_costureira: pessoasIds.costureira,
                id_secretaria: pessoasIds.secretaria,
                dta_agendamento: dataFutura.toISOString(),
                produtos: [
                    {
                        id_produto_grade: produtoGradeId
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.medico}`)
                .send(dadosAgendamento)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });
    });

    describe('GET /api/agendamentos', () => {
        it('deve listar todos os agendamentos como admin', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('dados');
            expect(Array.isArray(response.body.dados)).toBe(true);
            expect(response.body.dados.length).toBeGreaterThan(0);
        });

        it('deve listar agendamentos com filtro de paciente', async () => {
            const response = await request(app)
                .get(`/api/agendamentos?id_paciente=${pessoasIds.paciente}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(a => a.paciente_id === pessoasIds.paciente)).toBe(true);
        });

        it('deve listar agendamentos com filtro de costureira', async () => {
            const response = await request(app)
                .get(`/api/agendamentos?id_costureira=${pessoasIds.costureira}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(a => a.costureira_id === pessoasIds.costureira)).toBe(true);
        });

        it('deve listar agendamentos com filtro de status', async () => {
            const response = await request(app)
                .get('/api/agendamentos?status=agendado')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.every(a => a.ind_status === 'agendado')).toBe(true);
        });

        it('deve listar agendamentos com filtro de data', async () => {
            const dataInicio = new Date();
            const dataFim = new Date();
            dataFim.setDate(dataFim.getDate() + 30);

            const response = await request(app)
                .get(`/api/agendamentos?data_inicio=${dataInicio.toISOString()}&data_fim=${dataFim.toISOString()}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });

        it('costureira deve ver apenas seus agendamentos', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(200);

            expect(response.body.dados.every(a => a.costureira_id === pessoasIds.costureira)).toBe(true);
        });

        it('secretária não deve ver observações da costureira', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            response.body.dados.forEach(agendamento => {
                expect(agendamento).not.toHaveProperty('des_observacoes_costureira');
            });
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .get('/api/agendamentos')
                .expect(401);
        });
    });

    describe('GET /api/agendamentos/:id', () => {
        it('deve buscar agendamento por ID', async () => {
            const response = await request(app)
                .get(`/api/agendamentos/${agendamentoIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.dados).toHaveProperty('id', agendamentoIdCriado);
            expect(response.body.dados).toHaveProperty('produtos');
            expect(Array.isArray(response.body.dados.produtos)).toBe(true);
        });

        it('deve retornar 404 quando agendamento não existe', async () => {
            const response = await request(app)
                .get('/api/agendamentos/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 400 quando ID é inválido', async () => {
            const response = await request(app)
                .get('/api/agendamentos/abc')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(400);

            expect(response.body.erro).toContain('número inteiro');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .get(`/api/agendamentos/${agendamentoIdCriado}`)
                .expect(401);
        });
    });

    describe('PUT /api/agendamentos/:id', () => {
        it('deve atualizar agendamento como secretária (próprio)', async () => {
            const dadosAtualizacao = {
                des_observacoes_geral: 'Observações atualizadas'
            };

            const response = await request(app)
                .put(`/api/agendamentos/${agendamentoIdCriado}`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAtualizacao)
                .expect(200);

            expect(response.body.mensagem).toContain('atualizado');
            expect(response.body.dados.des_observacoes_geral).toBe(dadosAtualizacao.des_observacoes_geral);
        });

        it('deve atualizar agendamento como admin', async () => {
            const dadosAtualizacao = {
                des_observacoes_geral: 'Atualizado pelo admin'
            };

            const response = await request(app)
                .put(`/api/agendamentos/${agendamentoIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosAtualizacao)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve retornar 404 quando agendamento não existe', async () => {
            const response = await request(app)
                .put('/api/agendamentos/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    des_observacoes_geral: 'Teste'
                })
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .put(`/api/agendamentos/${agendamentoIdCriado}`)
                .send({
                    des_observacoes_geral: 'Teste'
                })
                .expect(401);
        });
    });

    describe('PATCH /api/agendamentos/:id/confirmar', () => {
        it('deve confirmar agendamento como secretária', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoIdCriado}/confirmar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.mensagem).toContain('confirmado');

            // Verificar que status foi atualizado
            const agendamentoAtualizado = await request(app)
                .get(`/api/agendamentos/${agendamentoIdCriado}`)
                .set('Authorization', `Bearer ${tokens.admin}`);

            expect(agendamentoAtualizado.body.dados.ind_status).toBe('confirmado');
        });

        it('deve confirmar agendamento como admin', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoIdCriado}/confirmar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve retornar 403 quando costureira tenta confirmar', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoIdCriado}/confirmar`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });

        it('deve retornar 404 quando agendamento não existe', async () => {
            await request(app)
                .patch('/api/agendamentos/99999/confirmar')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(404);
        });
    });

    describe('POST /api/agendamentos/:id/comparecimento', () => {
        it('deve registrar comparecimento como costureira', async () => {
            const dadosComparecimento = {
                ind_paciente_compareceu: true,
                des_observacoes_costureira: 'Paciente compareceu e ajuste foi realizado'
            };

            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoIdCriado}/comparecimento`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .send(dadosComparecimento)
                .expect(200);

            expect(response.body.mensagem).toContain('Comparecimento registrado');
            expect(response.body.dados.ind_paciente_compareceu).toBe(true);
            expect(response.body.dados.ind_status).toBe('concluido');
        });

        it('deve registrar falta como costureira', async () => {
            // Criar outro agendamento para testar falta
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 60);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: produtoGradeId
                        }
                    ]
                });

            const dadosComparecimento = {
                ind_paciente_compareceu: false,
                des_observacoes_costureira: 'Paciente não compareceu'
            };

            const response = await request(app)
                .post(`/api/agendamentos/${novoAgendamento.body.dados.id}/comparecimento`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .send(dadosComparecimento)
                .expect(200);

            expect(response.body.dados.ind_paciente_compareceu).toBe(false);
            expect(response.body.dados.ind_status).toBe('falta');
        });

        it('deve retornar 400 quando campo obrigatório está faltando', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoIdCriado}/comparecimento`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .send({
                    des_observacoes_costureira: 'Teste'
                })
                .expect(400);

            expect(response.body.erro).toContain('obrigatório');
        });

        it('deve retornar 403 quando secretária tenta registrar', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoIdCriado}/comparecimento`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send({
                    ind_paciente_compareceu: true
                })
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });

        it('deve retornar 404 quando agendamento não existe', async () => {
            await request(app)
                .post('/api/agendamentos/99999/comparecimento')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .send({
                    ind_paciente_compareceu: true
                })
                .expect(404);
        });
    });

    describe('PATCH /api/agendamentos/:id/cancelar', () => {
        let agendamentoCancelarId;

        beforeAll(async () => {
            // Criar agendamento para cancelar (data distante para não violar regra de 2h)
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 90);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: produtoGradeId
                        }
                    ]
                });

            agendamentoCancelarId = novoAgendamento.body.dados.id;
        });

        it('deve cancelar agendamento como secretária', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoCancelarId}/cancelar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.mensagem).toContain('cancelado');

            // Verificar status
            const agendamento = await request(app)
                .get(`/api/agendamentos/${agendamentoCancelarId}`)
                .set('Authorization', `Bearer ${tokens.admin}`);

            expect(agendamento.body.dados.ind_status).toBe('cancelado');
        });

        it('deve cancelar agendamento como admin', async () => {
            // Criar outro agendamento
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 120);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .patch(`/api/agendamentos/${novoAgendamento.body.dados.id}/cancelar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve retornar 400 ao tentar cancelar com menos de 2 horas', async () => {
            // Criar agendamento para daqui a 1 hora
            const dataProxima = new Date();
            dataProxima.setHours(dataProxima.getHours() + 1);

            const agendamentoProximo = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataProxima.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoProximo.body.dados.id}/cancelar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(400);

            expect(response.body.erro).toContain('2 horas');
        });

        it('deve retornar 403 quando costureira tenta cancelar', async () => {
            // Criar agendamento
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 150);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .patch(`/api/agendamentos/${novoAgendamento.body.dados.id}/cancelar`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });
    });

    describe('DELETE /api/agendamentos/:id', () => {
        let agendamentoDeletarId;

        beforeAll(async () => {
            // Criar agendamento para deletar
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 180);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            agendamentoDeletarId = novoAgendamento.body.dados.id;
        });

        it('deve deletar agendamento como admin', async () => {
            const response = await request(app)
                .delete(`/api/agendamentos/${agendamentoDeletarId}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('deletado');

            // Verificar que não aparece mais na lista
            const listaAgendamentos = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`);

            const agendamentoDeletado = listaAgendamentos.body.dados.find(
                a => a.id === agendamentoDeletarId
            );
            expect(agendamentoDeletado).toBeUndefined();
        });

        it('deve retornar 404 quando agendamento não existe', async () => {
            await request(app)
                .delete('/api/agendamentos/99999')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(404);
        });

        it('deve retornar 403 quando costureira tenta deletar', async () => {
            // Criar agendamento
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 210);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .delete(`/api/agendamentos/${novoAgendamento.body.dados.id}`)
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .delete(`/api/agendamentos/${agendamentoDeletarId}`)
                .expect(401);
        });
    });

    describe('GET /api/agendamentos/meus', () => {
        it('deve listar agendamentos da costureira autenticada', async () => {
            const response = await request(app)
                .get('/api/agendamentos/meus')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
            expect(response.body.dados.every(a => a.costureira_id === pessoasIds.costureira)).toBe(true);
        });

        it('deve filtrar apenas ativos', async () => {
            const response = await request(app)
                .get('/api/agendamentos/meus?apenas_ativos=true')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(200);

            const statusAtivos = ['agendado', 'confirmado'];
            expect(response.body.dados.every(a => statusAtivos.includes(a.ind_status))).toBe(true);
        });

        it('deve retornar 403 quando não é costureira', async () => {
            const response = await request(app)
                .get('/api/agendamentos/meus')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });
    });

    describe('GET /api/agendamentos/estatisticas', () => {
        it('deve retornar estatísticas de agendamentos', async () => {
            const response = await request(app)
                .get('/api/agendamentos/estatisticas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
            expect(response.body.dados).toHaveProperty('total');
            expect(response.body.dados).toHaveProperty('por_status');
            expect(response.body.dados).toHaveProperty('comparecimentos');
            expect(response.body.dados.comparecimentos).toHaveProperty('taxa_comparecimento');
        });

        it('deve filtrar estatísticas por período', async () => {
            const dataInicio = new Date();
            const dataFim = new Date();
            dataFim.setDate(dataFim.getDate() + 365);

            const response = await request(app)
                .get(`/api/agendamentos/estatisticas?data_inicio=${dataInicio.toISOString()}&data_fim=${dataFim.toISOString()}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });
    });
});
