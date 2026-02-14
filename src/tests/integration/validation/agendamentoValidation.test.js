const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Agendamento Validation - Testes de Validação', () => {
    let adminToken;
    let pessoasIds = {};
    let produtoGradeId;

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
        pessoasIds = await TestHelpers.seedDatabase(database);

        // Criar produto
        const [produto] = await database.query(
            `INSERT INTO tab_produto (nom_produto, ref_produto, ind_status) 
       VALUES ('Produto Teste', 'PROD-001', 'ativo')`
        );

        const [grade] = await database.query(
            `INSERT INTO tab_produto_grade (id_produto, cod_tamanho, nom_cor_estampa, num_sku, ind_status)
       VALUES (?, 'G', 'Verde', 'PROD-001-G-VD', 'ativo')`,
            [produto.insertId]
        );

        produtoGradeId = grade.insertId;

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
        it('deve rejeitar quando falta id_paciente', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('id_paciente');
        });

        it('deve rejeitar quando falta id_costureira', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('id_costureira');
        });

        it('deve rejeitar quando falta id_secretaria', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('id_secretaria');
        });

        it('deve rejeitar quando falta dta_agendamento', async () => {
            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('dta_agendamento');
        });

        it('deve rejeitar quando falta produtos', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString()
                })
                .expect(400);

            expect(response.body.erro).toContain('produto');
        });

        it('deve rejeitar quando produtos é array vazio', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: []
                })
                .expect(400);

            expect(response.body.erro).toContain('produto');
        });
    });

    describe('Validação de Tipos de Dados', () => {
        it('deve rejeitar id_paciente não numérico', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: 'abc',
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('número');
        });

        it('deve rejeitar dta_agendamento em formato inválido', async () => {
            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: '31/12/2024 14:00',
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('data');
        });

        it('deve rejeitar produtos não sendo array', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: 'produto1'
                })
                .expect(400);

            expect(response.body.erro).toContain('array');
        });
    });

    describe('Validação de Data e Hora', () => {
        it('deve rejeitar data no passado', async () => {
            const dataPassada = new Date();
            dataPassada.setDate(dataPassada.getDate() - 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataPassada.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('futura');
        });

        it('deve rejeitar data de hoje mas hora passada', async () => {
            const horaPassada = new Date();
            horaPassada.setHours(horaPassada.getHours() - 2);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: horaPassada.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('futura');
        });

        it('deve aceitar data futura', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 30);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(201);

            expect(response.body.sucesso).toBe(true);

            // Liberar costureira para próximos testes
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                ['concluido', response.body.dados.id]
            );
        });
    });

    describe('Validação de Produtos do Agendamento', () => {
        it('deve rejeitar produto sem id_produto_grade', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            des_ajuste_produto: 'Ajuste sem produto'
                        }
                    ]
                })
                .expect(400);

            expect(response.body.erro).toContain('id_produto_grade');
        });

        it('deve aceitar produto sem descrição de ajuste', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 60);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
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
                })
                .expect(201);

            expect(response.body.sucesso).toBe(true);

            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                ['concluido', response.body.dados.id]
            );
        });

        it('deve aceitar múltiplos produtos', async () => {
            // Criar mais produtos
            const [produto2] = await database.query(
                `INSERT INTO tab_produto (nom_produto, ref_produto, ind_status) 
         VALUES ('Produto 2', 'PROD-002', 'ativo')`
            );

            const [grade2] = await database.query(
                `INSERT INTO tab_produto_grade (id_produto, cod_tamanho, nom_cor_estampa, num_sku, ind_status)
         VALUES (?, 'M', 'Amarelo', 'PROD-002-M-AM', 'ativo')`,
                [produto2.insertId]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 90);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: produtoGradeId,
                            des_ajuste_produto: 'Ajuste 1'
                        },
                        {
                            id_produto_grade: grade2.insertId,
                            des_ajuste_produto: 'Ajuste 2'
                        }
                    ]
                })
                .expect(201);

            expect(response.body.sucesso).toBe(true);
            expect(response.body.dados.produtos).toHaveLength(2);

            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                ['concluido', response.body.dados.id]
            );
        });

        it('deve rejeitar id_produto_grade inválido', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: 99999
                        }
                    ]
                })
                .expect(404);

            expect(response.body.mensagem).toContain('Produto não encontrado');
        });

        it('deve validar tamanho da descrição de ajuste', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 120);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: produtoGradeId,
                            des_ajuste_produto: 'a'.repeat(1001) // Muito grande
                        }
                    ]
                })
                .expect(400);

            expect(response.body.erro).toContain('tamanho');
        });
    });

    describe('Validação de Regras de Negócio', () => {
        it('deve rejeitar quando costureira já tem agendamento ativo', async () => {
            const dataFutura1 = new Date();
            dataFutura1.setDate(dataFutura1.getDate() + 150);

            // Criar primeiro agendamento
            await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura1.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(201);

            // Tentar criar segundo agendamento para mesma costureira
            const dataFutura2 = new Date();
            dataFutura2.setDate(dataFutura2.getDate() + 180);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura2.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.mensagem).toContain('já possui um agendamento ativo');
        });

        it('deve rejeitar quando ID de paciente não existe', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: 99999,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve rejeitar quando ID de costureira não é costureira', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.secretaria, // Passando secretária como costureira
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('não é uma costureira');
        });

        it('deve rejeitar quando pessoa está inativa', async () => {
            // Desativar paciente
            await database.query(
                'UPDATE tab_pessoas SET ind_status = ? WHERE id = ?',
                ['inativo', pessoasIds.paciente]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('inativo');

            // Reativar paciente
            await database.query(
                'UPDATE tab_pessoas SET ind_status = ? WHERE id = ?',
                ['ativo', pessoasIds.paciente]
            );
        });
    });

    describe('Validação de Comparecimento', () => {
        let agendamentoId;

        beforeAll(async () => {
            // Liberar costureira primeiro
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id_costureira = ?',
                ['concluido', pessoasIds.costureira]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 210);

            const agendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            agendamentoId = agendamento.body.dados.id;
        });

        it('deve rejeitar quando falta ind_paciente_compareceu', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoId}/comparecimento`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    des_observacoes_costureira: 'Teste'
                })
                .expect(400);

            expect(response.body.erro).toContain('ind_paciente_compareceu');
        });

        it('deve rejeitar ind_paciente_compareceu não booleano', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoId}/comparecimento`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ind_paciente_compareceu: 'sim',
                    des_observacoes_costureira: 'Teste'
                })
                .expect(400);

            expect(response.body.erro).toContain('boolean');
        });

        it('deve aceitar comparecimento sem observações', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoId}/comparecimento`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ind_paciente_compareceu: true
                })
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });

        it('deve validar tamanho das observações da costureira', async () => {
            // Criar novo agendamento
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                ['concluido', agendamentoId]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 240);

            const novoAgendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .post(`/api/agendamentos/${novoAgendamento.body.dados.id}/comparecimento`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ind_paciente_compareceu: true,
                    des_observacoes_costureira: 'a'.repeat(2001) // Muito grande
                })
                .expect(400);

            expect(response.body.erro).toContain('tamanho');
        });
    });

    describe('Validação de Status de Agendamento', () => {
        it('deve validar status ao atualizar', async () => {
            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id_costureira = ?',
                ['concluido', pessoasIds.costureira]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 270);

            const agendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .put(`/api/agendamentos/${agendamento.body.dados.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    ind_status: 'status_invalido'
                })
                .expect(400);

            expect(response.body.erro).toContain('status');
            expect(response.body.erro).toMatch(/agendado|confirmado|concluido|cancelado|falta/);
        });

        it('deve aceitar status válido', async () => {
            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id_costureira = ?',
                ['concluido', pessoasIds.costureira]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 300);

            const agendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            const response = await request(app)
                .patch(`/api/agendamentos/${agendamento.body.dados.id}/confirmar`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Validação de Limites de Observações', () => {
        it('deve validar tamanho de observações gerais', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 7);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    des_observacoes_geral: 'a'.repeat(2001),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(400);

            expect(response.body.erro).toContain('observações');
        });

        it('deve aceitar observações gerais de tamanho válido', async () => {
            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id_costureira = ?',
                ['concluido', pessoasIds.costureira]
            );

            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 330);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    des_observacoes_geral: 'a'.repeat(500),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                })
                .expect(201);

            expect(response.body.sucesso).toBe(true);
        });
    });
});
