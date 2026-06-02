require('dotenv').config();

const app = require('./src/app');
const database = require('./src/config/database');
const UploadService = require('./src/services/UploadService');
const config = require('./src/config/env');

class Server {
    constructor() {
        this.app = app;
        this.port = config.port;
        this.server = null;
    }

    async start() {
        try {
            console.log('\n🚀 Iniciando servidor...\n');

            // Conectar ao banco de dados
            await this.connectDatabase();

            // Inicializar serviço de upload
            await this.initializeUploadService();

            // Iniciar servidor HTTP
            await this.startHttpServer();

            // Configurar handlers de encerramento
            this.setupShutdownHandlers();

            console.log('\n✅ Servidor iniciado com sucesso!\n');
            this.printServerInfo();

        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            process.exit(1);
        }
    }

    async connectDatabase() {
        try {
            await database.connect();
        } catch (error) {
            console.error('❌ Falha ao conectar ao banco de dados');
            throw error;
        }
    }

    async initializeUploadService() {
        try {
            await UploadService.inicializar();
        } catch (error) {
            console.error('⚠️  Aviso: Falha ao inicializar serviço de upload');
            console.error(error.message);
        }
    }

    async startHttpServer() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    resolve();
                });

                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        console.error(`❌ Porta ${this.port} já está em uso`);
                    } else {
                        console.error('❌ Erro no servidor:', error);
                    }
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    setupShutdownHandlers() {
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n\n⚠️  Sinal ${signal} recebido. Encerrando servidor...`);

            if (this.server) {
                this.server.close(async () => {
                    console.log('🔌 Servidor HTTP encerrado');

                    try {
                        await database.close();
                        console.log('✅ Recursos liberados com sucesso');
                        process.exit(0);
                    } catch (error) {
                        console.error('❌ Erro ao liberar recursos:', error);
                        process.exit(1);
                    }
                });

                // Forçar encerramento após 10 segundos
                setTimeout(() => {
                    console.error('⚠️  Forçando encerramento...');
                    process.exit(1);
                }, 10000);
            }
        };

        // Capturar sinais de encerramento
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Capturar erros não tratados
        process.on('uncaughtException', (error) => {
            console.error('❌ Exceção não capturada:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promise rejeitada não tratada:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }

    printServerInfo() {
        const info = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏥  SISTEMA DE AGENDA DE AJUSTES PÓS-CIRÚRGICOS             ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   Ambiente:     ${config.env.padEnd(43)}   ║
║   Porta:        ${this.port.toString().padEnd(43)}   ║
║   URL:          ${config.apiUrl.padEnd(43)}   ║
║   Base de Dados: ${config.database.database.padEnd(43)}  ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   📚 Rotas Disponíveis:                                       ║
║                                                               ║
║   GET    /                      - Info da API                 ║
║   GET    /api                   - Rotas disponíveis           ║
║   GET    /api/health            - Health check                ║
║                                                               ║
║   POST   /api/auth/login        - Login                       ║
║   POST   /api/auth/logout       - Logout                      ║
║   GET    /api/auth/perfil       - Perfil do usuário           ║
║                                                               ║
║   GET    /api/pessoas           - Listar pessoas              ║
║   POST   /api/pessoas           - Criar pessoa                ║
║   GET    /api/pessoas/:id       - Buscar pessoa               ║
║   PUT    /api/pessoas/:id       - Atualizar pessoa            ║
║   DELETE /api/pessoas/:id       - Deletar pessoa              ║
║                                                               ║
║   GET    /api/agendamentos      - Listar agendamentos         ║
║   POST   /api/agendamentos      - Criar agendamento           ║
║   GET    /api/agendamentos/:id  - Buscar agendamento          ║
║   PUT    /api/agendamentos/:id  - Atualizar agendamento       ║
║   DELETE /api/agendamentos/:id  - Deletar agendamento         ║
║                                                               ║
║   POST   /api/produtos/:id/fotos - Upload de fotos            ║
║   GET    /api/produtos/:id/fotos - Listar fotos               ║
║                                                               ║
║   GET    /api/relatorios/dashboard      - Dashboard           ║
║   GET    /api/relatorios/auditoria      - Logs                ║
║   GET    /api/relatorios/agendamentos   - Relatórios          ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   👥 Tipos de Usuário:                                        ║
║                                                               ║
║   • Administrador  - Acesso total ao sistema                  ║
║   • Secretária     - Cadastro de pacientes e agendamentos     ║
║   • Costureira     - Registro de comparecimento e fotos       ║
║   • Médico         - Visualização de relatórios               ║
║   • Paciente       - Recebe notificações via WhatsApp         ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   🔒 Segurança:                                               ║
║                                                               ║
║   ✓ Autenticação JWT                                          ║
║   ✓ Controle de permissões por papel                          ║
║   ✓ Rate limiting                                             ║
║   ✓ Helmet security headers                                   ║
║   ✓ Sanitização de inputs                                     ║
║   ✓ Logs de auditoria                                         ║
║   ✓ Soft delete                                               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   📝 Desenvolvedor: Ramon                                     ║
║   📅 Versão: 1.0.0                                            ║
║   🏗️  Arquitetura: Node.js + Express + MySQL                   ║
║   🎨 Padrões: SOLID, MVC, RESTful                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `;

        console.log(info);
    }
}

// Iniciar servidor
const server = new Server();
server.start();

module.exports = server;
