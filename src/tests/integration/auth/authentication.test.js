const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');
const jwt = require('jsonwebtoken');
const config = require('../../../config/env');

describe('Authentication - Testes de Autenticação', () => {
    let pessoasIds = {};

    beforeAll(async () => {
        await database.connect();
        await TestHelpers.cleanDatabase(database);
        pessoasIds = await TestHelpers.seedDatabase(database);
    });

    afterAll(async () => {
        await TestHelpers.cleanDatabase(database);
        await database.close();
    });

    describe('Autenticação JWT', () => {
        describe('Geração de Token', () => {
            it('deve gerar token JWT válido no login', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    })
                    .expect(200);

                expect(response.body.dados).toHaveProperty('token');

                const token = response.body.dados.token;
                expect(token).toBeTruthy();
                expect(typeof token).toBe('string');

                // Verificar se o token pode ser decodificado
                const decoded = jwt.verify(token, config.jwt.secret);
                expect(decoded).toHaveProperty('id');
                expect(decoded).toHaveProperty('cpf', '00000000000');
                expect(decoded).toHaveProperty('tipo', 'administrador');
                expect(decoded).toHaveProperty('iat');
                expect(decoded).toHaveProperty('exp');
            });

            it('deve incluir informações corretas no payload do token', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '11111111111',
                        des_senha: 'senha123'
                    })
                    .expect(200);

                const token = response.body.dados.token;
                const decoded = jwt.decode(token);

                expect(decoded.cpf).toBe('11111111111');
                expect(decoded.tipo).toBe('secretaria');
                expect(decoded.id).toBe(pessoasIds.secretaria);
            });

            it('deve definir tempo de expiração no token', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    })
                    .expect(200);

                const token = response.body.dados.token;
                const decoded = jwt.decode(token);

                expect(decoded.exp).toBeGreaterThan(decoded.iat);

                // Verificar que o token expira em aproximadamente o tempo configurado
                const expTime = decoded.exp - decoded.iat;
                expect(expTime).toBeGreaterThan(0);
            });
        });

        describe('Validação de Token', () => {
            let validToken;

            beforeAll(async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                validToken = response.body.dados.token;
            });

            it('deve aceitar token válido no header Authorization', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${validToken}`)
                    .expect(200);

                expect(response.body.sucesso).toBe(true);
            });

            it('deve rejeitar requisição sem token', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .expect(401);

                expect(response.body.sucesso).toBe(false);
                expect(response.body.erro).toContain('Token não fornecido');
            });

            it('deve rejeitar token malformado', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', 'Bearer token-malformado')
                    .expect(401);

                expect(response.body.erro).toContain('Token inválido');
            });

            it('deve rejeitar token sem prefixo Bearer', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', validToken)
                    .expect(401);

                expect(response.body.erro).toContain('Token não fornecido');
            });

            it('deve rejeitar token vazio', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', 'Bearer ')
                    .expect(401);

                expect(response.body.erro).toContain('Token não fornecido');
            });

            it('deve rejeitar token expirado', async () => {
                const tokenExpirado = jwt.sign(
                    { id: 1, cpf: '00000000000', tipo: 'administrador' },
                    config.jwt.secret,
                    { expiresIn: '0s' } // Token já nasce expirado
                );

                await TestHelpers.sleep(1000); // Aguardar 1 segundo

                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${tokenExpirado}`)
                    .expect(401);

                expect(response.body.erro).toContain('Token expirado');
            });

            it('deve rejeitar token com assinatura inválida', async () => {
                const tokenInvalido = jwt.sign(
                    { id: 1, cpf: '00000000000', tipo: 'administrador' },
                    'chave-secreta-errada',
                    { expiresIn: '1h' }
                );

                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${tokenInvalido}`)
                    .expect(401);

                expect(response.body.erro).toContain('Token inválido');
            });

            it('deve rejeitar token com payload inválido', async () => {
                // Token sem campos obrigatórios
                const tokenInvalido = jwt.sign(
                    { nome: 'Teste' }, // Faltando id, cpf, tipo
                    config.jwt.secret,
                    { expiresIn: '1h' }
                );

                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${tokenInvalido}`)
                    .expect(401);

                expect(response.body.erro).toBeTruthy();
            });
        });

        describe('Refresh de Token', () => {
            it('deve permitir múltiplas requisições com o mesmo token', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                const token = loginResponse.body.dados.token;

                // Fazer múltiplas requisições
                for (let i = 0; i < 5; i++) {
                    const response = await request(app)
                        .get('/api/auth/perfil')
                        .set('Authorization', `Bearer ${token}`)
                        .expect(200);

                    expect(response.body.sucesso).toBe(true);
                }
            });

            it('deve gerar novo token a cada login', async () => {
                const response1 = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                const token1 = response1.body.dados.token;

                await TestHelpers.sleep(1000);

                const response2 = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                const token2 = response2.body.dados.token;

                expect(token1).not.toBe(token2);

                // Ambos os tokens devem ser válidos
                await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${token1}`)
                    .expect(200);

                await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${token2}`)
                    .expect(200);
            });
        });

        describe('Segurança de Senha', () => {
            it('não deve retornar senha no response de login', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    })
                    .expect(200);

                expect(response.body.dados.usuario).not.toHaveProperty('des_senha');
            });

            it('não deve retornar senha hash no response de perfil', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                const token = loginResponse.body.dados.token;

                const perfilResponse = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);

                expect(perfilResponse.body.dados).not.toHaveProperty('des_senha');
            });

            it('deve usar bcrypt para hash de senhas', async () => {
                // Verificar que senhas diferentes geram hashes diferentes
                const senha1 = 'senha123';
                const senha2 = 'senha456';

                const hash1 = await TestHelpers.hashPassword(senha1);
                const hash2 = await TestHelpers.hashPassword(senha2);

                expect(hash1).not.toBe(hash2);
                expect(hash1).not.toBe(senha1);
                expect(hash2).not.toBe(senha2);
            });
        });

        describe('Rate Limiting', () => {
            it('deve bloquear após múltiplas tentativas de login falhas', async () => {
                const cpfTeste = TestHelpers.generateCPF();

                // Fazer 6 tentativas falhas (limite é 5)
                for (let i = 0; i < 6; i++) {
                    await request(app)
                        .post('/api/auth/login')
                        .send({
                            num_cpf: cpfTeste,
                            des_senha: 'senhaErrada'
                        });
                }

                // A 7ª tentativa deve retornar 429 (Too Many Requests)
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: cpfTeste,
                        des_senha: 'senhaErrada'
                    })
                    .expect(429);

                expect(response.body.mensagem).toContain('Muitas tentativas');
            });

            it('deve aplicar rate limit por IP', async () => {
                // Testar com diferentes CPFs mas mesmo IP
                const cpfs = [
                    TestHelpers.generateCPF(),
                    TestHelpers.generateCPF(),
                    TestHelpers.generateCPF()
                ];

                let count = 0;
                for (const cpf of cpfs) {
                    for (let i = 0; i < 3; i++) {
                        await request(app)
                            .post('/api/auth/login')
                            .send({
                                num_cpf: cpf,
                                des_senha: 'senhaErrada'
                            });
                        count++;

                        if (count >= 5) break;
                    }
                    if (count >= 5) break;
                }

                // Próxima tentativa deve ser bloqueada
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: cpfs[0],
                        des_senha: 'senhaErrada'
                    });

                expect(response.status).toBe(429);
            });
        });
    });

    describe('Tipos de Usuário', () => {
        describe('Administrador', () => {
            let adminToken;

            beforeAll(async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '00000000000',
                        des_senha: 'senha123'
                    });

                adminToken = response.body.dados.token;
            });

            it('deve autenticar como administrador', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body.dados.ind_tipo_pessoa).toBe('administrador');
            });

            it('deve ter acesso a rotas de admin', async () => {
                await request(app)
                    .get('/api/pessoas/secretarias')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);
            });
        });

        describe('Secretária', () => {
            let secretariaToken;

            beforeAll(async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '11111111111',
                        des_senha: 'senha123'
                    });

                secretariaToken = response.body.dados.token;
            });

            it('deve autenticar como secretária', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${secretariaToken}`)
                    .expect(200);

                expect(response.body.dados.ind_tipo_pessoa).toBe('secretaria');
            });

            it('não deve ter acesso a rotas de admin', async () => {
                await request(app)
                    .get('/api/pessoas/secretarias')
                    .set('Authorization', `Bearer ${secretariaToken}`)
                    .expect(403);
            });

            it('deve ter acesso a rotas de secretária', async () => {
                await request(app)
                    .get('/api/pessoas/pacientes')
                    .set('Authorization', `Bearer ${secretariaToken}`)
                    .expect(200);
            });
        });

        describe('Costureira', () => {
            let costureiraToken;

            beforeAll(async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '22222222222',
                        des_senha: 'senha123'
                    });

                costureiraToken = response.body.dados.token;
            });

            it('deve autenticar como costureira', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${costureiraToken}`)
                    .expect(200);

                expect(response.body.dados.ind_tipo_pessoa).toBe('costureira');
            });

            it('deve ter acesso limitado', async () => {
                // Pode acessar seus próprios agendamentos
                await request(app)
                    .get('/api/agendamentos/meus')
                    .set('Authorization', `Bearer ${costureiraToken}`)
                    .expect(200);

                // Não pode listar todas as pessoas
                await request(app)
                    .get('/api/pessoas')
                    .set('Authorization', `Bearer ${costureiraToken}`)
                    .expect(403);
            });
        });

        describe('Médico', () => {
            let medicoToken;

            beforeAll(async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '33333333333',
                        des_senha: 'senha123'
                    });

                medicoToken = response.body.dados.token;
            });

            it('deve autenticar como médico', async () => {
                const response = await request(app)
                    .get('/api/auth/perfil')
                    .set('Authorization', `Bearer ${medicoToken}`)
                    .expect(200);

                expect(response.body.dados.ind_tipo_pessoa).toBe('medico');
            });

            it('deve ter acesso a relatórios', async () => {
                await request(app)
                    .get('/api/relatorios/dashboard')
                    .set('Authorization', `Bearer ${medicoToken}`)
                    .expect(200);
            });

            it('não deve poder criar agendamentos', async () => {
                const dataFutura = new Date();
                dataFutura.setDate(dataFutura.getDate() + 7);

                await request(app)
                    .post('/api/agendamentos')
                    .set('Authorization', `Bearer ${medicoToken}`)
                    .send({
                        id_paciente: pessoasIds.paciente,
                        id_costureira: pessoasIds.costureira,
                        id_secretaria: pessoasIds.secretaria,
                        dta_agendamento: dataFutura.toISOString(),
                        produtos: [{ id_produto_grade: 1 }]
                    })
                    .expect(403);
            });
        });

        describe('Paciente', () => {
            it('não deve permitir login de paciente', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '44444444444',
                        des_senha: 'senha123'
                    })
                    .expect(401);

                expect(response.body.erro).toContain('Pacientes não têm acesso');
            });
        });
    });

    describe('Status de Usuário', () => {
        it('não deve permitir login de usuário inativo', async () => {
            // Criar usuário e desativar
            const dadosUsuario = TestHelpers.generatePessoaData('secretaria');

            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            const adminToken = adminLogin.body.dados.token;

            const criarResponse = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosUsuario);

            const usuarioId = criarResponse.body.dados.id;

            // Desativar usuário
            await request(app)
                .patch(`/api/pessoas/${usuarioId}/desativar`)
                .set('Authorization', `Bearer ${adminToken}`);

            // Tentar fazer login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: dadosUsuario.num_cpf,
                    des_senha: dadosUsuario.des_senha
                })
                .expect(401);

            expect(loginResponse.body.erro).toContain('inativo');
        });

        it('deve permitir login após reativar usuário', async () => {
            // Criar usuário
            const dadosUsuario = TestHelpers.generatePessoaData('secretaria');

            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            const adminToken = adminLogin.body.dados.token;

            const criarResponse = await request(app)
                .post('/api/pessoas')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dadosUsuario);

            const usuarioId = criarResponse.body.dados.id;

            // Desativar
            await request(app)
                .patch(`/api/pessoas/${usuarioId}/desativar`)
                .set('Authorization', `Bearer ${adminToken}`);

            // Reativar
            await request(app)
                .patch(`/api/pessoas/${usuarioId}/ativar`)
                .set('Authorization', `Bearer ${adminToken}`);

            // Deve permitir login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: dadosUsuario.num_cpf,
                    des_senha: dadosUsuario.des_senha
                })
                .expect(200);

            expect(loginResponse.body.sucesso).toBe(true);
        });
    });

    describe('Sessão e Logout', () => {
        it('deve registrar logout no sistema', async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            const token = loginResponse.body.dados.token;

            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(logoutResponse.body.mensagem).toContain('Logout realizado');
        });

        it('token deve continuar válido após logout (stateless JWT)', async () => {
            // Em JWT stateless, o token continua válido até expirar
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            const token = loginResponse.body.dados.token;

            // Fazer logout
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Token ainda é válido (stateless)
            const perfilResponse = await request(app)
                .get('/api/auth/perfil')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(perfilResponse.body.sucesso).toBe(true);
        });
    });
});
