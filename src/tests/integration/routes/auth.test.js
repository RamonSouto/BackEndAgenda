const request = require('supertest');
const app = require('../../../app');
const database = require('../../../config/database');
const TestHelpers = require('../../helpers/testHelpers');

describe('Auth Routes - Testes de Integração', () => {
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

    describe('POST /api/auth/login', () => {
        it('deve fazer login com sucesso - Administrador', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body).toHaveProperty('dados');
            expect(response.body.dados).toHaveProperty('token');
            expect(response.body.dados).toHaveProperty('usuario');
            expect(response.body.dados.usuario).toHaveProperty('id');
            expect(response.body.dados.usuario).toHaveProperty('tipo', 'administrador');
            expect(response.body.dados.usuario).not.toHaveProperty('des_senha');
        });

        it('deve fazer login com sucesso - Secretária', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '11111111111',
                    des_senha: 'senha123'
                })
                .expect(200);

            expect(response.body.dados.usuario.tipo).toBe('secretaria');
        });

        it('deve fazer login com sucesso - Costureira', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '22222222222',
                    des_senha: 'senha123'
                })
                .expect(200);

            expect(response.body.dados.usuario.tipo).toBe('costureira');
        });

        it('deve retornar 400 quando CPF não for fornecido', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    des_senha: 'senha123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('sucesso', false);
            expect(response.body).toHaveProperty('erro');
        });

        it('deve retornar 400 quando senha não for fornecida', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000'
                })
                .expect(400);

            expect(response.body).toHaveProperty('sucesso', false);
        });

        it('deve retornar 401 quando CPF não existe', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '99999999999',
                    des_senha: 'senha123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('sucesso', false);
            expect(response.body.mensagem).toContain('Credenciais inválidas');
        });

        it('deve retornar 401 quando senha está incorreta', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senhaErrada'
                })
                .expect(401);

            expect(response.body).toHaveProperty('sucesso', false);
        });

        it('deve retornar 401 quando paciente tenta fazer login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '44444444444',
                    des_senha: 'senha123'
                })
                .expect(401);

            expect(response.body.erro).toContain('Pacientes não têm acesso');
        });

        it('deve respeitar rate limiting após muitas tentativas', async () => {
            // Fazer 6 tentativas seguidas (limite é 5)
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({
                        num_cpf: '99999999999',
                        des_senha: 'senhaErrada'
                    });
            }

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                })
                .expect(429);

            expect(response.body.mensagem).toContain('Muitas tentativas');
        });
    });

    describe('POST /api/auth/logout', () => {
        let token;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            token = loginResponse.body.dados.token;
        });

        it('deve fazer logout com sucesso', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toContain('Logout realizado');
        });

        it('deve retornar 401 quando token não é fornecido', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(401);

            expect(response.body).toHaveProperty('sucesso', false);
            expect(response.body.erro).toContain('Token não fornecido');
        });

        it('deve retornar 401 quando token é inválido', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer token-invalido')
                .expect(401);

            expect(response.body.erro).toContain('Token inválido');
        });
    });

    describe('GET /api/auth/verificar', () => {
        let token;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            token = loginResponse.body.dados.token;
        });

        it('deve verificar token válido', async () => {
            const response = await request(app)
                .get('/api/auth/verificar')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toBe('Token válido');
            expect(response.body.dados).toHaveProperty('usuario');
        });

        it('deve retornar 401 para token ausente', async () => {
            await request(app)
                .get('/api/auth/verificar')
                .expect(401);
        });

        it('deve retornar 401 para token expirado', async () => {
            const tokenExpirado = TestHelpers.generateExpiredToken();

            const response = await request(app)
                .get('/api/auth/verificar')
                .set('Authorization', `Bearer ${tokenExpirado}`)
                .expect(401);

            expect(response.body.erro).toContain('Token expirado');
        });
    });

    describe('GET /api/auth/perfil', () => {
        let token;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            token = loginResponse.body.dados.token;
        });

        it('deve retornar perfil do usuário autenticado', async () => {
            const response = await request(app)
                .get('/api/auth/perfil')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.dados).toHaveProperty('nom_completo');
            expect(response.body.dados).toHaveProperty('des_email_1');
            expect(response.body.dados).not.toHaveProperty('des_senha');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .get('/api/auth/perfil')
                .expect(401);
        });
    });

    describe('PUT /api/auth/alterar-senha', () => {
        let token;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '11111111111',
                    des_senha: 'senha123'
                });

            token = loginResponse.body.dados.token;
        });

        it('deve alterar senha com sucesso', async () => {
            const response = await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    senha_atual: 'senha123',
                    nova_senha: 'novaSenha456',
                    confirmar_senha: 'novaSenha456'
                })
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toContain('Senha alterada');

            // Verificar se pode fazer login com a nova senha
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '11111111111',
                    des_senha: 'novaSenha456'
                })
                .expect(200);

            expect(loginResponse.body.sucesso).toBe(true);

            // Restaurar senha original
            await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${loginResponse.body.dados.token}`)
                .send({
                    senha_atual: 'novaSenha456',
                    nova_senha: 'senha123',
                    confirmar_senha: 'senha123'
                });
        });

        it('deve retornar 400 quando senhas não coincidem', async () => {
            const response = await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    senha_atual: 'senha123',
                    nova_senha: 'novaSenha456',
                    confirmar_senha: 'senhasDiferentes'
                })
                .expect(400);

            expect(response.body.erro).toContain('não coincidem');
        });

        it('deve retornar 400 quando senha atual está incorreta', async () => {
            const response = await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    senha_atual: 'senhaErrada',
                    nova_senha: 'novaSenha456',
                    confirmar_senha: 'novaSenha456'
                })
                .expect(400);

            expect(response.body.mensagem).toContain('Senha atual incorreta');
        });

        it('deve retornar 400 quando nova senha é muito curta', async () => {
            const response = await request(app)
                .put('/api/auth/alterar-senha')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    senha_atual: 'senha123',
                    nova_senha: '123',
                    confirmar_senha: '123'
                })
                .expect(400);

            expect(response.body.erro).toContain('mínimo 6 caracteres');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .put('/api/auth/alterar-senha')
                .send({
                    senha_atual: 'senha123',
                    nova_senha: 'novaSenha456',
                    confirmar_senha: 'novaSenha456'
                })
                .expect(401);
        });
    });

    describe('POST /api/auth/resetar-senha', () => {
        let adminToken;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '00000000000',
                    des_senha: 'senha123'
                });

            adminToken = loginResponse.body.dados.token;
        });

        it('deve resetar senha como admin', async () => {
            const response = await request(app)
                .post('/api/auth/resetar-senha')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    num_cpf: '22222222222',
                    nova_senha: 'senhaResetada123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('sucesso', true);
            expect(response.body.mensagem).toContain('Senha resetada');

            // Verificar login com nova senha
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '22222222222',
                    des_senha: 'senhaResetada123'
                })
                .expect(200);

            expect(loginResponse.body.sucesso).toBe(true);

            // Restaurar senha original
            await request(app)
                .post('/api/auth/resetar-senha')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    num_cpf: '22222222222',
                    nova_senha: 'senha123'
                });
        });

        it('deve retornar 403 quando não é admin', async () => {
            const secretariaLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    num_cpf: '11111111111',
                    des_senha: 'senha123'
                });

            const response = await request(app)
                .post('/api/auth/resetar-senha')
                .set('Authorization', `Bearer ${secretariaLogin.body.dados.token}`)
                .send({
                    num_cpf: '22222222222',
                    nova_senha: 'novaSenha456'
                })
                .expect(403);

            expect(response.body.mensagem).toContain('Acesso negado');
        });

        it('deve retornar 404 quando CPF não existe', async () => {
            const response = await request(app)
                .post('/api/auth/resetar-senha')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    num_cpf: '99999999999',
                    nova_senha: 'novaSenha456'
                })
                .expect(404);

            expect(response.body.mensagem).toContain('não encontrado');
        });

        it('deve retornar 401 sem autenticação', async () => {
            await request(app)
                .post('/api/auth/resetar-senha')
                .send({
                    num_cpf: '22222222222',
                    nova_senha: 'novaSenha456'
                })
                .expect(401);
        });
    });
});
