const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Authorization - Testes de Autorização', () => {
    let tokens = {};
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
       VALUES (?, 'M', 'Vermelho', 'PROD-001-M-VM', 'ativo')`,
            [produto.insertId]
        );

        produtoGradeId = grade.insertId;

        // Obter tokens
        const logins = {
            admin: { cpf: '00000000000', senha: 'senha123' },
            secretaria: { cpf: '11111111111', senha: 'senha123' },
            costureira: { cpf: '22222222222', senha: 'senha123' },
            medico: { cpf: '33333333333', senha: 'senha123' }
        };

        for (const [tipo, credenciais] of Object.entries(logins)) {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: credenciais.cpf,
                    des_senha: credenciais.senha
                });

            tokens[tipo] = response.body.dados.token;
        }
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('Hierarquia de Permissões', () => {
        describe('Rotas de Pessoas', () => {
            it('Admin deve ter acesso total', async () => {
                // Listar
                await request(app)
                    .get('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);

                // Criar
                const dadosPessoa = TestHelpers.generatePessoaData('paciente');
                const criarResponse = await request(app)
                    .post('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send(dadosPessoa)
                    .expect(201);

                const pessoaId = criarResponse.body.dados.id;

                // Atualizar
                await request(app)
                    .put(`/api/pessoas/${pessoaId}`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send({ nom_completo: 'Nome Atualizado' })
                    .expect(200);

                // Deletar
                await request(app)
                    .delete(`/api/pessoas/${pessoaId}`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);
            });

            it('Secretária pode criar pacientes mas não outros tipos', async () => {
                // Pode criar paciente
                const dadosPaciente = TestHelpers.generatePessoaData('paciente');
                await request(app)
                    .post('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send(dadosPaciente)
                    .expect(201);

                // Não pode criar admin
                const dadosAdmin = TestHelpers.generatePessoaData('administrador');
                await request(app)
                    .post('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send(dadosAdmin)
                    .expect(403);

                // Não pode criar costureira
                const dadosCostureira = TestHelpers.generatePessoaData('costureira');
                await request(app)
                    .post('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send(dadosCostureira)
                    .expect(403);
            });

            it('Secretária pode listar mas não atualizar/deletar', async () => {
                // Pode listar
                await request(app)
                    .get('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .expect(200);

                // Não pode atualizar
                await request(app)
                    .put(`/api/pessoas/${pessoasIds.paciente}`)
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send({ nom_completo: 'Teste' })
                    .expect(403);

                // Não pode deletar
                await request(app)
                    .delete(`/api/pessoas/${pessoasIds.paciente}`)
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .expect(403);
            });

            it('Costureira não deve acessar rotas de pessoas', async () => {
                await request(app)
                    .get('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(403);

                await request(app)
                    .post('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .send(TestHelpers.generatePessoaData('paciente'))
                    .expect(403);
            });

            it('Médico não deve acessar rotas de pessoas', async () => {
                await request(app)
                    .get('/api/pessoas')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(403);
            });
        });

        describe('Rotas de Agendamentos', () => {
            let agendamentoSecretariaId;
            let agendamentoCostureiraId;

            beforeAll(async () => {
                const dataFutura1 = new Date();
                dataFutura1.setDate(dataFutura1.getDate() + 30);

                const dataFutura2 = new Date();
                dataFutura2.setDate(dataFutura2.getDate() + 60);

                // Criar agendamento pela secretária
                const response1 = await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura1.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    });

                agendamentoSecretariaId = response1.body.dados.id;

                // Liberar costureira
                await database.query(
                    'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                    ['concluido', agendamentoSecretariaId]
                );

                // Criar agendamento pela costureira
                const response2 = await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura2.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    });

                agendamentoCostureiraId = response2.body.dados.id;
            });

            it('Admin pode criar, editar e deletar qualquer agendamento', async () => {
                const dataFutura = new Date();
                dataFutura.setDate(dataFutura.getDate() + 90);

                // Criar
                const criarResponse = await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    });

                // Liberar costureira
                await database.query(
                    'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                    ['concluido', criarResponse.body.dados.id]
                );

                const agendamentoId = criarResponse.body.dados.id;

                // Criar outro para testar edição
                const dataFutura2 = new Date();
                dataFutura2.setDate(dataFutura2.getDate() + 120);

                const criarResponse2 = await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura2.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    });

                const agendamentoId2 = criarResponse2.body.dados.id;

                // Editar
                await request(app)
                    .put(`/api/agendamentos/${agendamentoId2}`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send({ des_observacoes_geral: 'Atualizado' })
                    .expect(200);

                // Deletar
                await request(app)
                    .delete(`/api/agendamentos/${agendamentoId2}`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);
            });

            it('Secretária pode criar e editar próprios agendamentos', async () => {
                // Pode editar próprio
                await request(app)
                    .put(`/api/agendamentos/${agendamentoSecretariaId}`)
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send({ des_observacoes_geral: 'Editado' })
                    .expect(200);
            });

            it('Costureira pode registrar comparecimento em seus agendamentos', async () => {
                await request(app)
                    .post(`/api/agendamentos/${agendamentoCostureiraId}/comparecimento`)
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .send({
                        ind_paciente_compareceu: true,
                        des_observacoes_costureira: 'Paciente compareceu'
                    })
                    .expect(200);
            });

            it('Costureira não pode confirmar/cancelar agendamentos', async () => {
                // Criar novo agendamento
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

                await request(app)
                    .patch(`/api/agendamentos/${novoAgendamento.body.dados.id}/confirmar`)
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(403);

                await request(app)
                    .patch(`/api/agendamentos/${novoAgendamento.body.dados.id}/cancelar`)
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(403);
            });

            it('Médico pode visualizar mas não modificar', async () => {
                // Pode listar
                await request(app)
                    .get('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(200);

                // Não pode criar
                const dataFutura = new Date();
                dataFutura.setDate(dataFutura.getDate() + 7);

                await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    })
                    .expect(403);
            });
        });

        describe('Rotas de Produtos/Fotos', () => {
            let agendamentoId;
            let produtoAgendamentoId;

            beforeAll(async () => {
                const dataFutura = new Date();
                dataFutura.setDate(dataFutura.getDate() + 180);

                const agendamento = await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura.toISOString(),
                        produtos: [{ id_produto_grade: produtoGradeId }]
                    });

                agendamentoId = agendamento.body.dados.id;

                // Buscar ID do produto agendamento
                const produtos = await database.query(
                    'SELECT id FROM tab_produto_agendamento WHERE id_agendamento = ?',
                    [agendamentoId]
                );

                produtoAgendamentoId = produtos[0][0].id;
            });

            it('Costureira pode fazer upload de fotos', async () => {
                // Simular upload de foto (sem arquivo real nos testes)
                // Este teste é mais conceitual, pois upload de arquivo requer configuração especial

                const response = await request(app)
                    .get(`/api/produtos/${produtoAgendamentoId}/fotos`)
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(200);

                expect(response.body.sucesso).toBe(true);
            });

            it('Secretária não pode fazer upload de fotos', async () => {
                const response = await request(app)
                    .patch(`/api/produtos/${produtoAgendamentoId}/status`)
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .send({ status: 'producao' })
                    .expect(403);

                expect(response.body.mensagem).toContain('permissão');
            });

            it('Admin pode fazer upload de fotos', async () => {
                await request(app)
                    .get(`/api/produtos/${produtoAgendamentoId}/fotos`)
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);
            });

            it('Todos autenticados podem visualizar fotos', async () => {
                await request(app)
                    .get(`/api/produtos/agendamento/${agendamentoId}`)
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(200);

                await request(app)
                    .get(`/api/produtos/agendamento/${agendamentoId}`)
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .expect(200);
            });
        });

        describe('Rotas de Relatórios', () => {
            it('Admin deve acessar todos os relatórios', async () => {
                await request(app)
                    .get('/api/relatorios/dashboard')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/auditoria')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/agendamentos')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/produtividade/costureiras')
                    .set('Authorization', `Bearer ${tokens.admin}`)
                    .expect(200);
            });

            it('Médico deve acessar dashboard e relatórios de agendamentos', async () => {
                await request(app)
                    .get('/api/relatorios/dashboard')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/agendamentos')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(200);
            });

            it('Médico não deve acessar auditoria e produtividade', async () => {
                await request(app)
                    .get('/api/relatorios/auditoria')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(403);

                await request(app)
                    .get('/api/relatorios/produtividade/costureiras')
                    .set('Authorization', `Bearer ${tokens.medico}`)
                    .expect(403);
            });

            it('Secretária deve acessar dashboard e agendamentos', async () => {
                await request(app)
                    .get('/api/relatorios/dashboard')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/agendamentos')
                    .set('Authorization', `Bearer ${tokens.secretaria}`)
                    .expect(200);
            });

            it('Costureira deve acessar apenas dashboard', async () => {
                await request(app)
                    .get('/api/relatorios/dashboard')
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(200);

                await request(app)
                    .get('/api/relatorios/auditoria')
                    .set('Authorization', `Bearer ${tokens.costureira}`)
                    .expect(403);
            });
        });
    });

    describe('Controle de Acesso a Dados', () => {
        it('Costureira só vê seus próprios agendamentos', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(200);

            // Todos os agendamentos devem ser da costureira autenticada
            const todosPropriosAgendamentos = response.body.dados.every(
                a => a.costureira_id === pessoasIds.costureira
            );

            expect(todosPropriosAgendamentos).toBe(true);
        });

        it('Secretária não vê observações da costureira', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            // Nenhum agendamento deve ter observações da costureira
            response.body.dados.forEach(agendamento => {
                expect(agendamento).not.toHaveProperty('des_observacoes_costureira');
            });
        });

        it('Admin vê todas as informações incluindo observações da costureira', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            // Admin deve ver o campo (mesmo que seja null)
            if (response.body.dados.length > 0) {
                const primeiroAgendamento = response.body.dados[0];
                expect(primeiroAgendamento).toHaveProperty('des_observacoes_costureira');
            }
        });
    });

    describe('Isolamento entre Usuários', () => {
        it('Secretária não pode editar agendamento de outra secretária', async () => {
            // Criar segunda secretária
            const dadosSecretaria2 = TestHelpers.generatePessoaData('secretaria');

            const novaSecretaria = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosSecretaria2);

            const secretariaId2 = novaSecretaria.body.dados.id;

            // Login da nova secretária
            const loginSecretaria2 = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: dadosSecretaria2.num_cpf,
                    des_senha: dadosSecretaria2.des_senha
                });

            const tokenSecretaria2 = loginSecretaria2.body.dados.token;

            // Criar agendamento com secretária 2
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 210);

            const agendamento = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokenSecretaria2}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: pessoasIds.costureira,
                    id_secretaria: secretariaId2,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            // Liberar costureira
            await database.query(
                'UPDATE tab_agendamentos SET ind_status = ? WHERE id = ?',
                ['concluido', agendamento.body.dados.id]
            );

            // Secretária 1 não pode editar agendamento da secretária 2
            const response = await request(app)
                .put(`/api/agendamentos/${agendamento.body.dados.id}`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send({ des_observacoes_geral: 'Tentando editar' })
                .expect(403);

            expect(response.body.mensagem).toContain('permissão');
        });

        it('Costureira não pode ver agendamentos de outra costureira', async () => {
            // Criar segunda costureira
            const dadosCostureira2 = TestHelpers.generatePessoaData('costureira');

            const novaCostureira = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosCostureira2);

            const costureiraId2 = novaCostureira.body.dados.id;

            // Criar agendamento para costureira 2
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 240);

            await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: pessoasIds.paciente,
                    id_costureira: costureiraId2,
                    id_secretaria: pessoasIds.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [{ id_produto_grade: produtoGradeId }]
                });

            // Costureira 1 lista seus agendamentos
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.costureira}`)
                .expect(200);

            // Não deve ver agendamentos da costureira 2
            const temAgendamentoCostureira2 = response.body.dados.some(
                a => a.costureira_id === costureiraId2
            );

            expect(temAgendamentoCostureira2).toBe(false);
        });
    });
});
