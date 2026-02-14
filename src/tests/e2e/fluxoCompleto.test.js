const request = require('supertest');
const app = require('../../app');
const database = require('../../config/database');
const TestHelpers = require('../helpers/testHelpers');
const path = require('path');
const fs = require('fs');

describe('Fluxo Completo E2E - Sistema de Agendamentos', () => {
    let tokens = {};
    let ids = {
        pessoas: {},
        produtos: {},
        agendamentos: {}
    };

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('Cenário 1: Configuração Inicial do Sistema', () => {
        it('1.1 - Sistema deve estar online', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.sucesso).toBe(true);
            expect(response.body.mensagem).toContain('funcionando');
        });

        it('1.2 - Criar cidade de teste', async () => {
            const [cidade] = await database.query(
                'INSERT INTO tab_cidade (nom_cidade, id_estado, cod_municipio_ibge) VALUES (?, ?, ?)',
                ['Goiânia', 1, '5208707']
            );

            ids.cidade = cidade.insertId;
            expect(ids.cidade).toBeGreaterThan(0);
        });

        it('1.3 - Criar produtos de teste', async () => {
            // Produto 1
            const [produto1] = await database.query(
                'INSERT INTO tab_produto (nom_produto, ref_produto, ind_status) VALUES (?, ?, ?)',
                ['Blusa Cirúrgica', 'BLS-001', 'ativo']
            );

            const [grade1] = await database.query(
                `INSERT INTO tab_produto_grade (id_produto, cod_tamanho, nom_cor_estampa, num_sku, ind_status)
         VALUES (?, ?, ?, ?, ?)`,
                [produto1.insertId, 'P', 'Branco', 'BLS-001-P-BR', 'ativo']
            );

            // Produto 2
            const [produto2] = await database.query(
                'INSERT INTO tab_produto (nom_produto, ref_produto, ind_status) VALUES (?, ?, ?)',
                ['Calça Cirúrgica', 'CLC-001', 'ativo']
            );

            const [grade2] = await database.query(
                `INSERT INTO tab_produto_grade (id_produto, cod_tamanho, nom_cor_estampa, num_sku, ind_status)
         VALUES (?, ?, ?, ?, ?)`,
                [produto2.insertId, 'M', 'Azul', 'CLC-001-M-AZ', 'ativo']
            );

            ids.produtos.blusa = grade1.insertId;
            ids.produtos.calca = grade2.insertId;

            expect(ids.produtos.blusa).toBeGreaterThan(0);
            expect(ids.produtos.calca).toBeGreaterThan(0);
        });
    });

    describe('Cenário 2: Cadastro de Usuários do Sistema', () => {
        it('2.1 - Criar usuário Administrador', async () => {
            const dadosAdmin = {
                id_cidade: ids.cidade,
                ind_tipo_pessoa: 'administrador',
                nom_completo: 'Dr. Admin Sistema',
                num_cpf: '00000000000',
                num_rg: '1234567',
                dta_nascimento: '1980-01-01',
                des_logradouro: 'Rua Principal',
                num_endereco: '100',
                num_cep: '74000000',
                nom_bairro: 'Centro',
                num_celular_1: '62999999999',
                des_email_1: 'admin@sistema.com',
                des_senha: 'admin123'
            };

            const [admin] = await database.query(
                `INSERT INTO tab_pessoas (
          id_cidade, ind_status, ind_tipo_pessoa, nom_completo, num_cpf, num_rg,
          dta_nascimento, des_logradouro, num_endereco, num_cep, nom_bairro,
          num_celular_1, des_email_1, des_senha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    dadosAdmin.id_cidade, 'ativo', dadosAdmin.ind_tipo_pessoa,
                    dadosAdmin.nom_completo, dadosAdmin.num_cpf, dadosAdmin.num_rg,
                    dadosAdmin.dta_nascimento, dadosAdmin.des_logradouro, dadosAdmin.num_endereco,
                    dadosAdmin.num_cep, dadosAdmin.nom_bairro, dadosAdmin.num_celular_1,
                    dadosAdmin.des_email_1, await TestHelpers.hashPassword(dadosAdmin.des_senha)
                ]
            );

            ids.pessoas.admin = admin.insertId;
            expect(ids.pessoas.admin).toBeGreaterThan(0);
        });

        it('2.2 - Admin faz login e obtém token', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'admin123'
                })
                .expect(200);

            tokens.admin = response.body.dados.token;
            expect(tokens.admin).toBeTruthy();
            expect(response.body.dados.usuario.tipo).toBe('administrador');
        });

        it('2.3 - Admin cria Secretária', async () => {
            const dadosSecretaria = TestHelpers.generatePessoaData('secretaria');
            dadosSecretaria.id_cidade = ids.cidade;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosSecretaria)
                .expect(201);

            ids.pessoas.secretaria = response.body.dados.id;
            ids.pessoas.secretariaCpf = dadosSecretaria.num_cpf;
            ids.pessoas.secretariaSenha = dadosSecretaria.des_senha;

            expect(response.body.dados.ind_tipo_pessoa).toBe('secretaria');
        });

        it('2.4 - Secretária faz login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: ids.pessoas.secretariaCpf,
                    des_senha: ids.pessoas.secretariaSenha
                })
                .expect(200);

            tokens.secretaria = response.body.dados.token;
            expect(tokens.secretaria).toBeTruthy();
        });

        it('2.5 - Admin cria Costureiras', async () => {
            // Costureira 1
            const dadosCostureira1 = TestHelpers.generatePessoaData('costureira');
            dadosCostureira1.id_cidade = ids.cidade;

            const response1 = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosCostureira1)
                .expect(201);

            ids.pessoas.costureira1 = response1.body.dados.id;
            ids.pessoas.costureira1Cpf = dadosCostureira1.num_cpf;
            ids.pessoas.costureira1Senha = dadosCostureira1.des_senha;

            // Costureira 2
            const dadosCostureira2 = TestHelpers.generatePessoaData('costureira');
            dadosCostureira2.id_cidade = ids.cidade;

            const response2 = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosCostureira2)
                .expect(201);

            ids.pessoas.costureira2 = response2.body.dados.id;

            expect(response1.body.dados.ind_tipo_pessoa).toBe('costureira');
            expect(response2.body.dados.ind_tipo_pessoa).toBe('costureira');
        });

        it('2.6 - Costureira 1 faz login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: ids.pessoas.costureira1Cpf,
                    des_senha: ids.pessoas.costureira1Senha
                })
                .expect(200);

            tokens.costureira1 = response.body.dados.token;
            expect(tokens.costureira1).toBeTruthy();
        });

        it('2.7 - Admin cria Médico', async () => {
            const dadosMedico = TestHelpers.generatePessoaData('medico');
            dadosMedico.id_cidade = ids.cidade;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(dadosMedico)
                .expect(201);

            ids.pessoas.medico = response.body.dados.id;
            ids.pessoas.medicoCpf = dadosMedico.num_cpf;
            ids.pessoas.medicoSenha = dadosMedico.des_senha;

            expect(response.body.dados.ind_tipo_pessoa).toBe('medico');
        });

        it('2.8 - Médico faz login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: ids.pessoas.medicoCpf,
                    des_senha: ids.pessoas.medicoSenha
                })
                .expect(200);

            tokens.medico = response.body.dados.token;
            expect(tokens.medico).toBeTruthy();
        });
    });

    describe('Cenário 3: Cadastro de Pacientes', () => {
        it('3.1 - Secretária cadastra Paciente 1', async () => {
            const dadosPaciente1 = TestHelpers.generatePessoaData('paciente');
            dadosPaciente1.id_cidade = ids.cidade;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosPaciente1)
                .expect(201);

            ids.pessoas.paciente1 = response.body.dados.id;
            expect(response.body.dados.ind_tipo_pessoa).toBe('paciente');
        });

        it('3.2 - Secretária cadastra Paciente 2', async () => {
            const dadosPaciente2 = TestHelpers.generatePessoaData('paciente');
            dadosPaciente2.id_cidade = ids.cidade;

            const response = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosPaciente2)
                .expect(201);

            ids.pessoas.paciente2 = response.body.dados.id;
            expect(response.body.dados.ind_tipo_pessoa).toBe('paciente');
        });

        it('3.3 - Secretária lista pacientes cadastrados', async () => {
            const response = await request(app)
                .get('/api/pessoas/pacientes')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.dados.length).toBeGreaterThanOrEqual(2);
            expect(response.body.dados.every(p => p.ind_tipo_pessoa === 'paciente')).toBe(true);
        });
    });

    describe('Cenário 4: Criação de Agendamentos', () => {
        it('4.1 - Secretária verifica costureiras disponíveis', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.dados.length).toBeGreaterThanOrEqual(2);
            expect(response.body.dados.every(c => c.disponivel === true)).toBe(true);
        });

        it('4.2 - Secretária cria agendamento para Paciente 1 com Costureira 1', async () => {
            const dataAgendamento = new Date();
            dataAgendamento.setDate(dataAgendamento.getDate() + 7);

            const dadosAgendamento = {
                id_paciente: ids.pessoas.paciente1,
                id_costureira: ids.pessoas.costureira1,
                id_secretaria: ids.pessoas.secretaria,
                dta_agendamento: dataAgendamento.toISOString(),
                des_observacoes_geral: 'Primeira consulta pós-cirúrgica',
                produtos: [
                    {
                        id_produto_grade: ids.produtos.blusa,
                        des_ajuste_produto: 'Ajustar manga direita - 2cm'
                    },
                    {
                        id_produto_grade: ids.produtos.calca,
                        des_ajuste_produto: 'Barra da calça - 3cm'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(201);

            ids.agendamentos.agendamento1 = response.body.dados.id;

            expect(response.body.dados.ind_status).toBe('agendado');
            expect(response.body.dados.produtos).toHaveLength(2);
            expect(response.body.dados.paciente_id).toBe(ids.pessoas.paciente1);
            expect(response.body.dados.costureira_id).toBe(ids.pessoas.costureira1);
        });

        it('4.3 - Verificar que Costureira 1 agora está ocupada', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            const costureira1 = response.body.dados.find(c => c.id === ids.pessoas.costureira1);
            expect(costureira1.disponivel).toBe(false);
            expect(costureira1).toHaveProperty('agendamento_ativo');
        });

        it('4.4 - Secretária cria agendamento para Paciente 2 com Costureira 2', async () => {
            const dataAgendamento = new Date();
            dataAgendamento.setDate(dataAgendamento.getDate() + 14);

            const dadosAgendamento = {
                id_paciente: ids.pessoas.paciente2,
                id_costureira: ids.pessoas.costureira2,
                id_secretaria: ids.pessoas.secretaria,
                dta_agendamento: dataAgendamento.toISOString(),
                des_observacoes_geral: 'Ajuste urgente',
                produtos: [
                    {
                        id_produto_grade: ids.produtos.blusa,
                        des_ajuste_produto: 'Ajustar decote'
                    }
                ]
            };

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send(dadosAgendamento)
                .expect(201);

            ids.agendamentos.agendamento2 = response.body.dados.id;
            expect(response.body.dados.ind_status).toBe('agendado');
        });

        it('4.5 - Secretária confirma agendamento 1', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${ids.agendamentos.agendamento1}/confirmar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.mensagem).toContain('confirmado');

            // Verificar status
            const agendamento = await request(app)
                .get(`/api/agendamentos/${ids.agendamentos.agendamento1}`)
                .set('Authorization', `Bearer ${tokens.secretaria}`);

            expect(agendamento.body.dados.ind_status).toBe('confirmado');
        });
    });

    describe('Cenário 5: Atendimento pela Costureira', () => {
        it('5.1 - Costureira 1 lista seus agendamentos', async () => {
            const response = await request(app)
                .get('/api/agendamentos/meus')
                .set('Authorization', `Bearer ${tokens.costureira1}`)
                .expect(200);

            expect(response.body.dados.length).toBeGreaterThanOrEqual(1);
            expect(response.body.dados.every(a => a.costureira_id === ids.pessoas.costureira1)).toBe(true);
        });

        it('5.2 - Costureira 1 visualiza detalhes do agendamento', async () => {
            const response = await request(app)
                .get(`/api/agendamentos/${ids.agendamentos.agendamento1}`)
                .set('Authorization', `Bearer ${tokens.costureira1}`)
                .expect(200);

            expect(response.body.dados.id).toBe(ids.agendamentos.agendamento1);
            expect(response.body.dados.produtos).toHaveLength(2);
            expect(response.body.dados.ind_status).toBe('confirmado');
        });

        it('5.3 - Costureira 1 registra comparecimento do paciente', async () => {
            const response = await request(app)
                .post(`/api/agendamentos/${ids.agendamentos.agendamento1}/comparecimento`)
                .set('Authorization', `Bearer ${tokens.costureira1}`)
                .send({
                    ind_paciente_compareceu: true,
                    des_observacoes_costureira: 'Paciente compareceu no horário. Ajustes realizados conforme solicitado.'
                })
                .expect(200);

            expect(response.body.dados.ind_paciente_compareceu).toBe(true);
            expect(response.body.dados.ind_status).toBe('concluido');
        });

        it('5.4 - Verificar que Costureira 1 está disponível novamente', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            const costureira1 = response.body.dados.find(c => c.id === ids.pessoas.costureira1);
            expect(costureira1.disponivel).toBe(true);
        });

        it('5.5 - Costureira 1 atualiza status dos produtos', async () => {
            // Buscar IDs dos produtos do agendamento
            const agendamento = await request(app)
                .get(`/api/agendamentos/${ids.agendamentos.agendamento1}`)
                .set('Authorization', `Bearer ${tokens.costureira1}`);

            const produto1Id = agendamento.body.dados.produtos[0].id;

            const response = await request(app)
                .patch(`/api/produtos/${produto1Id}/status`)
                .set('Authorization', `Bearer ${tokens.costureira1}`)
                .send({
                    status: 'concluido'
                })
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });
    });

    describe('Cenário 6: Relatórios e Consultas', () => {
        it('6.1 - Admin acessa dashboard', async () => {
            const response = await request(app)
                .get('/api/relatorios/dashboard')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toHaveProperty('mes_atual');
            expect(response.body.dados).toHaveProperty('hoje');
            expect(response.body.dados).toHaveProperty('costureiras');
            expect(response.body.dados.mes_atual).toHaveProperty('total');
        });

        it('6.2 - Admin visualiza estatísticas de agendamentos', async () => {
            const response = await request(app)
                .get('/api/agendamentos/estatisticas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toHaveProperty('total');
            expect(response.body.dados).toHaveProperty('por_status');
            expect(response.body.dados).toHaveProperty('comparecimentos');
            expect(response.body.dados.comparecimentos).toHaveProperty('taxa_comparecimento');
        });

        it('6.3 - Médico acessa relatório de agendamentos', async () => {
            const response = await request(app)
                .get('/api/relatorios/agendamentos')
                .set('Authorization', `Bearer ${tokens.medico}`)
                .expect(200);

            expect(response.body.dados).toHaveProperty('resumo');
            expect(response.body.dados).toHaveProperty('agendamentos');
            expect(response.body.dados.resumo).toHaveProperty('total');
            expect(response.body.dados.resumo).toHaveProperty('por_status');
        });

        it('6.4 - Admin visualiza relatório de produtividade', async () => {
            const response = await request(app)
                .get('/api/relatorios/produtividade/costureiras')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toBeInstanceOf(Array);
            expect(response.body.dados.length).toBeGreaterThan(0);

            const costureira1Stats = response.body.dados.find(c => c.id === ids.pessoas.costureira1);
            expect(costureira1Stats).toBeDefined();
            expect(costureira1Stats).toHaveProperty('total_agendamentos');
            expect(costureira1Stats).toHaveProperty('concluidos');
        });

        it('6.5 - Admin acessa logs de auditoria', async () => {
            const response = await request(app)
                .get('/api/relatorios/auditoria')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados).toHaveProperty('logs_detalhados');
            expect(response.body.dados.logs_detalhados).toBeInstanceOf(Array);
            expect(response.body.dados).toHaveProperty('total_logs');
            expect(response.body.dados).toHaveProperty('por_acao');
        });
    });

    describe('Cenário 7: Gestão de Usuários', () => {
        it('7.1 - Admin lista todas as pessoas', async () => {
            const response = await request(app)
                .get('/api/pessoas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.total).toBeGreaterThanOrEqual(6); // Admin + Secretária + 2 Costureiras + Médico + 2 Pacientes
        });

        it('7.2 - Admin busca paciente por CPF', async () => {
            // Buscar CPF do paciente1
            const paciente = await database.query(
                'SELECT num_cpf FROM tab_pessoas WHERE id = ?',
                [ids.pessoas.paciente1]
            );

            const cpf = paciente[0][0].num_cpf;

            const response = await request(app)
                .get(`/api/pessoas/cpf/${cpf}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.id).toBe(ids.pessoas.paciente1);
        });

        it('7.3 - Admin atualiza dados do paciente', async () => {
            const response = await request(app)
                .put(`/api/pessoas/${ids.pessoas.paciente1}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    num_celular_2: '62988888888',
                    ind_whatsapp_2: true
                })
                .expect(200);

            expect(response.body.dados.num_celular_2).toBe('62988888888');
        });

        it('7.4 - Admin desativa paciente', async () => {
            const response = await request(app)
                .patch(`/api/pessoas/${ids.pessoas.paciente2}/desativar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('desativada');

            // Verificar que paciente está inativo
            const paciente = await request(app)
                .get(`/api/pessoas/${ids.pessoas.paciente2}`)
                .set('Authorization', `Bearer ${tokens.admin}`);

            expect(paciente.body.dados.ind_status).toBe('inativo');
        });

        it('7.5 - Admin reativa paciente', async () => {
            const response = await request(app)
                .patch(`/api/pessoas/${ids.pessoas.paciente2}/ativar`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.mensagem).toContain('ativada');
        });

        it('7.6 - Secretária altera própria senha', async () => {
            const response = await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send({
                    senha_atual: ids.pessoas.secretariaSenha,
                    nova_senha: 'novaSenha123',
                    confirmar_senha: 'novaSenha123'
                })
                .expect(200);

            expect(response.body.mensagem).toContain('Senha alterada');

            // Verificar login com nova senha
            const login = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: ids.pessoas.secretariaCpf,
                    des_senha: 'novaSenha123'
                })
                .expect(200);

            expect(login.body.sucesso).toBe(true);
        });

        it('7.7 - Admin reseta senha de usuário', async () => {
            const response = await request(app)
                .post('/api/auth/resetar-senha')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    num_cpf: ids.pessoas.secretariaCpf,
                    nova_senha: ids.pessoas.secretariaSenha // Volta para senha original
                })
                .expect(200);

            expect(response.body.mensagem).toContain('Senha resetada');
        });
    });

    describe('Cenário 8: Cancelamento de Agendamento', () => {
        let agendamentoCancelar;

        it('8.1 - Criar agendamento para cancelar', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 30);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .send({
                    id_paciente: ids.pessoas.paciente1,
                    id_costureira: ids.pessoas.costureira1,
                    id_secretaria: ids.pessoas.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: ids.produtos.blusa
                        }
                    ]
                })
                .expect(201);

            agendamentoCancelar = response.body.dados.id;
        });

        it('8.2 - Secretária cancela agendamento', async () => {
            const response = await request(app)
                .patch(`/api/agendamentos/${agendamentoCancelar}/cancelar`)
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            expect(response.body.mensagem).toContain('cancelado');

            // Verificar status
            const agendamento = await request(app)
                .get(`/api/agendamentos/${agendamentoCancelar}`)
                .set('Authorization', `Bearer ${tokens.admin}`);

            expect(agendamento.body.dados.ind_status).toBe('cancelado');
        });

        it('8.3 - Verificar que costureira ficou disponível após cancelamento', async () => {
            const response = await request(app)
                .get('/api/pessoas/costureiras/disponiveis')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            const costureira1 = response.body.dados.find(c => c.id === ids.pessoas.costureira1);
            expect(costureira1.disponivel).toBe(true);
        });
    });

    describe('Cenário 9: Falta do Paciente', () => {
        let agendamentoFalta;

        it('9.1 - Criar agendamento para registrar falta', async () => {
            const dataFutura = new Date();
            dataFutura.setDate(dataFutura.getDate() + 60);

            const response = await request(app)
                .post('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({
                    id_paciente: ids.pessoas.paciente2,
                    id_costureira: ids.pessoas.costureira2,
                    id_secretaria: ids.pessoas.secretaria,
                    dta_agendamento: dataFutura.toISOString(),
                    produtos: [
                        {
                            id_produto_grade: ids.produtos.calca
                        }
                    ]
                })
                .expect(201);

            agendamentoFalta = response.body.dados.id;
        });

        it('9.2 - Costureira registra falta do paciente', async () => {
            // Login da costureira 2
            const costureira2 = await database.query(
                'SELECT num_cpf FROM tab_pessoas WHERE id = ?',
                [ids.pessoas.costureira2]
            );

            const loginCost2 = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: costureira2[0][0].num_cpf,
                    des_senha: 'senha123'
                });

            const tokenCost2 = loginCost2.body.dados.token;

            const response = await request(app)
                .post(`/api/agendamentos/${agendamentoFalta}/comparecimento`)
                .set('Authorization', `Bearer ${tokenCost2}`)
                .send({
                    ind_paciente_compareceu: false,
                    des_observacoes_costureira: 'Paciente não compareceu. Sem justificativa.'
                })
                .expect(200);

            expect(response.body.dados.ind_paciente_compareceu).toBe(false);
            expect(response.body.dados.ind_status).toBe('falta');
        });
    });

    describe('Cenário 10: Validação Final do Sistema', () => {
        it('10.1 - Verificar integridade dos dados', async () => {
            const response = await request(app)
                .get('/api/agendamentos')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            const agendamentos = response.body.dados;

            // Verificar que todos têm estrutura correta
            agendamentos.forEach(agendamento => {
                expect(agendamento).toHaveProperty('id');
                expect(agendamento).toHaveProperty('dta_agendamento');
                expect(agendamento).toHaveProperty('ind_status');
                expect(agendamento).toHaveProperty('paciente_nome');
                expect(agendamento).toHaveProperty('costureira_nome');
                expect(agendamento).toHaveProperty('produtos');
            });
        });

        it('10.2 - Verificar logs do sistema', async () => {
            const response = await request(app)
                .get('/api/relatorios/auditoria')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.total_logs).toBeGreaterThan(0);
            expect(response.body.dados.por_acao).toHaveProperty('criar');
            expect(response.body.dados.por_acao).toHaveProperty('editar');
        });

        it('10.3 - Verificar estatísticas finais', async () => {
            const response = await request(app)
                .get('/api/agendamentos/estatisticas')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            expect(response.body.dados.total).toBeGreaterThan(0);
            expect(response.body.dados.por_status).toHaveProperty('concluido');
            expect(response.body.dados.por_status).toHaveProperty('cancelado');
            expect(response.body.dados.por_status).toHaveProperty('falta');
            expect(response.body.dados.comparecimentos).toHaveProperty('taxa_comparecimento');
        });

        it('10.4 - Todos os usuários fazem logout', async () => {
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${tokens.admin}`)
                .expect(200);

            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${tokens.secretaria}`)
                .expect(200);

            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${tokens.costureira1}`)
                .expect(200);

            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${tokens.medico}`)
                .expect(200);
        });

        it('10.5 - Sistema continua operacional', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.sucesso).toBe(true);
        });
    });
});
